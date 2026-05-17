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

// Mock global fetch for room details (both global and window level for JSDOM safety)
const mockFetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      room: {
        id: 'test-room-id',
        name: 'Secure Confidential Channel',
        maxParticipants: 10,
        participantCount: 1,
        settings: { allowChat: true, allowScreenShare: true, waitingRoom: false }
      }
    })
  })
);

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

// Mock user media devices
const mockStream = {
  getTracks: jest.fn().mockReturnValue([
    { stop: jest.fn(), enabled: true, kind: 'audio' },
    { stop: jest.fn(), enabled: true, kind: 'video' }
  ]),
  getAudioTracks: jest.fn().mockReturnValue([{ enabled: true }]),
  getVideoTracks: jest.fn().mockReturnValue([{ enabled: true }]),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockStream)
  },
  writable: true
});

// Mock WebRTC API objects
class MockRTCPeerConnection {
  iceConnectionState = 'new';
  onicecandidate: any = null;
  ontrack: any = null;
  oniceconnectionstatechange: any = null;
  onnegotiationneeded: any = null;
  localDescription: any = null;
  remoteDescription: any = null;

  addTrack = jest.fn();
  close = jest.fn();
  
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

describe('WebRTC Mesh Signaling and Dynamic Connection State Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly sets up local media stream and socket connection when joining', async () => {
    render(<RoomPage params={{ id: 'test-room-id' }} />);

    // Wait for room metadata loading to complete
    await waitFor(() => {
      expect(screen.getByText('Secure Confidential Channel')).toBeInTheDocument();
    });

    // We should see the PreJoin configuration screen
    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    // Fill in participant name
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    
    // Join the call
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Assert media devices were accessed
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: true,
      audio: true
    });

    // Assert socket io was initialized
    expect(io).toHaveBeenCalled();
  });
});
