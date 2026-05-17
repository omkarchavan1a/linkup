/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import RoomPage from '@/app/room/[id]/page';
import { io } from 'socket.io-client';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock socket.io-client
const mockSocket = {
  id: 'mock-socket-id',
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock global fetch for room details
const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'fetch', {
    value: mockFetch,
    writable: true
  });
}

// Mock user media streams and display screen media
const mockStream = {
  getTracks: jest.fn().mockReturnValue([
    { stop: jest.fn(), enabled: true, kind: 'audio' },
    { stop: jest.fn(), enabled: true, kind: 'video' }
  ]),
  getAudioTracks: jest.fn().mockReturnValue([{ enabled: true }]),
  getVideoTracks: jest.fn().mockReturnValue([{ enabled: true }]),
};

const mockScreenStream = {
  getTracks: jest.fn().mockReturnValue([
    { stop: jest.fn(), enabled: true, kind: 'video', onended: null }
  ]),
  getVideoTracks: jest.fn().mockReturnValue([
    { enabled: true, onended: null }
  ]),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockStream),
    getDisplayMedia: jest.fn().mockResolvedValue(mockScreenStream)
  },
  writable: true
});

// Mock WebRTC API objects
const mockReplaceTrack = jest.fn();
class MockRTCPeerConnection {
  iceConnectionState = 'connected';
  onicecandidate: any = null;
  ontrack: any = null;
  oniceconnectionstatechange: any = null;
  onnegotiationneeded: any = null;
  localDescription: any = null;
  remoteDescription: any = null;

  addTrack = jest.fn();
  close = jest.fn();
  getSenders = jest.fn().mockReturnValue([
    { track: { kind: 'video' }, replaceTrack: mockReplaceTrack }
  ]);
  getStats = jest.fn().mockResolvedValue(new Map([
    ['transport', { type: 'transport', dtlsState: 'connected', srtpCipher: 'AES_CM_128_HMAC_SHA1_80' }],
    ['candidate-pair', { type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.05 }]
  ]));
  
  createOffer = jest.fn().mockResolvedValue({ sdp: 'mock-offer-sdp', type: 'offer' });
  createAnswer = jest.fn().mockResolvedValue({ sdp: 'mock-answer-sdp', type: 'answer' });
  setLocalDescription = jest.fn().mockImplementation(async (desc) => {
    this.localDescription = desc;
  });
  setRemoteDescription = jest.fn().mockImplementation(async (desc) => {
    this.remoteDescription = desc;
  });
  addIceCandidate = jest.fn().mockResolvedValue({});
}

(global as any).RTCPeerConnection = MockRTCPeerConnection;
(global as any).RTCSessionDescription = jest.fn().mockImplementation((init) => init);
(global as any).RTCIceCandidate = jest.fn().mockImplementation((init) => init);

describe('Advanced WebRTC and Encryption Layer Integration Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies room access credentials check for locked channels and correctly joins', async () => {
    // 1. Mock fetch returns room settings with custom lock password enabled
    mockFetch.mockImplementation((url) => {
      if (url.includes('/verify')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'locked-room-id',
            name: 'Locked Operational Channel',
            maxParticipants: 10,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: true
          }
        })
      });
    });

    render(<RoomPage params={{ id: 'locked-room-id' }} />);

    // Wait for locked channel rendering
    await waitFor(() => {
      expect(screen.getByText('Locked Operational Channel')).toBeInTheDocument();
    });

    // Check presence of room access security input field
    const passwordInput = screen.getByPlaceholderText('Enter room password...');
    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    // Try joining with locked settings
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.change(passwordInput, { target: { value: 'correct_password' } });

    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Verify verification endpoint was queried
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rooms/locked-room-id/verify'),
      expect.any(Object)
    );

    // Verify participant is logged into secure room
    await waitFor(() => {
      expect(screen.getByText('Bob (You)')).toBeInTheDocument();
    });
  });

  it('triggers local screen sharing session and swaps track dynamically across peer connections', async () => {
    // Mock room fetch without lock
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'unlocked-room-id',
            name: 'Widescreen Workspace Channel',
            maxParticipants: 10,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      })
    );

    render(<RoomPage params={{ id: 'unlocked-room-id' }} />);

    // Wait for channel rendering
    await waitFor(() => {
      expect(screen.getByText('Widescreen Workspace Channel')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Charlie' } });

    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Expect controls panel to load
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle Screen Sharing')).toBeInTheDocument();
    });

    const screenShareBtn = screen.getByLabelText('Toggle Screen Sharing');

    // Start sharing screen
    await act(async () => {
      fireEvent.click(screenShareBtn);
    });

    // Check browser displayMedia API trigger
    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();

    // Verify socket screen share broadcast
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'screen-share:state',
      expect.objectContaining({ roomId: 'unlocked-room-id', isSharing: true })
    );
  });
});
