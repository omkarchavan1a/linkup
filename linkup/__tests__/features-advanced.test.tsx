/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import RoomPage from '@/app/room/[id]/page';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock socket.io-client
let socketCallbacks: { [event: string]: Function } = {};
const mockSocket = {
  id: 'mock-socket-id',
  on: jest.fn().mockImplementation((event, callback) => {
    socketCallbacks[event] = callback;
  }),
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

// Mock user media streams
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
    getUserMedia: jest.fn().mockResolvedValue(mockStream),
  },
  writable: true
});

// Mock WebRTC API objects
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
  getSenders = jest.fn().mockReturnValue([]);
  getStats = jest.fn().mockResolvedValue(new Map());
  
  createOffer = jest.fn().mockResolvedValue({ sdp: 'mock-offer-sdp', type: 'offer' });
  createAnswer = jest.fn().mockResolvedValue({ sdp: 'mock-answer-sdp', type: 'answer' });
  setLocalDescription = jest.fn();
  setRemoteDescription = jest.fn();
  addIceCandidate = jest.fn().mockResolvedValue({});
}

(global as any).RTCPeerConnection = MockRTCPeerConnection;
(global as any).RTCSessionDescription = jest.fn().mockImplementation((init) => init);
(global as any).RTCIceCandidate = jest.fn().mockImplementation((init) => init);

describe('LinkUp Advanced Features - Waiting Room, Hand Raise, Reactions & Expiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketCallbacks = {};
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('verifies lobby waiting room flow for guests and host admission', async () => {
    // 1. Mock room response with waiting room active
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'wait-room-id',
            name: 'Waiting Room Lobby Channel',
            maxParticipants: 10,
            participantCount: 0,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: true },
            hasPassword: false
          }
        })
      })
    );

    render(<RoomPage params={{ id: 'wait-room-id' }} />);

    // Wait for screen to render
    await waitFor(() => {
      expect(screen.getByText('Waiting Room Lobby Channel')).toBeInTheDocument();
    });

    // Enter details and click Join Room
    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Guest Alice' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Simulate socket connection event
    await act(async () => {
      if (socketCallbacks['connect']) {
        socketCallbacks['connect']();
      }
    });

    // Check we get parked in the frosted waiting screen overlay
    await waitFor(() => {
      expect(screen.getByText(/Approval Pending/i)).toBeInTheDocument();
      expect(screen.getByText(/Please wait. The meeting host has been notified and will admit you shortly/i)).toBeInTheDocument();
    });

    // Socket.io should emit wait request to wait room
    expect(mockSocket.emit).toHaveBeenCalledWith('waiting-room:join', expect.objectContaining({
      roomId: 'wait-room-id',
      name: 'Guest Alice'
    }));

    // Trigger wait approved event on client's socket
    await act(async () => {
      if (socketCallbacks['waiting-room:approved']) {
        socketCallbacks['waiting-room:approved']();
      }
    });

    // Participant should enter the active room after host admits
    await waitFor(() => {
      expect(screen.getByText('Guest Alice (You)')).toBeInTheDocument();
    });
  });

  it('verifies host can view pending guests and approve them in the lobby', async () => {
    // Mock room response with waiting room active
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'wait-room-id',
            name: 'Host Panel Channel',
            maxParticipants: 10,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: true },
            hasPassword: false
          }
        })
      })
    );

    // Set local host credentials in localStorage
    localStorage.setItem('host_token_wait-room-id', 'valid_host_token_123');

    render(<RoomPage params={{ id: 'wait-room-id' }} />);

    // Wait for screen to render
    await waitFor(() => {
      expect(screen.getByText('Host Panel Channel')).toBeInTheDocument();
    });

    // Enter host name and join
    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Host Bob' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Check the host enters directly without being held in wait lobby
    await waitFor(() => {
      expect(screen.getByText('Host Bob (You)')).toBeInTheDocument();
    });

    // Simulates guest Alice requesting to join waitlist
    await act(async () => {
      if (socketCallbacks['waiting-room:pending']) {
        socketCallbacks['waiting-room:pending']({
          socketId: 'guest-socket-abc',
          name: 'Pending Alice'
        });
      }
    });

    // Host should see lobby card list populated
    await waitFor(() => {
      expect(screen.getByText('Lobby Guest Request')).toBeInTheDocument();
      expect(screen.getByText('Pending Alice')).toBeInTheDocument();
    });

    // Click Admit to accept guest
    const admitBtn = screen.getByRole('button', { name: 'Admit' });
    
    await act(async () => {
      fireEvent.click(admitBtn);
    });

    // Socket.io should emit host approval
    expect(mockSocket.emit).toHaveBeenCalledWith('waiting-room:approve', expect.objectContaining({
      roomId: 'wait-room-id',
      guestSocketId: 'guest-socket-abc'
    }));

    // Guest name should clear from list after choice
    await waitFor(() => {
      expect(screen.queryByText('Pending Alice')).not.toBeInTheDocument();
    });
  });

  it('triggers local hand raise toggle status and displays it on video grids', async () => {
    // Mock standard room details response
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'hand-room-id',
            name: 'Hand Raise Channel',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      })
    );

    render(<RoomPage params={{ id: 'hand-room-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Hand Raise Channel')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Dave' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Look for raise hand button
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle Raise Hand')).toBeInTheDocument();
    });

    const handBtn = screen.getByLabelText('Toggle Raise Hand');

    // Raise hand
    await act(async () => {
      fireEvent.click(handBtn);
    });

    // Client should emit socket event & update local HUD UI badge
    expect(mockSocket.emit).toHaveBeenCalledWith('hand-raise:toggle', expect.objectContaining({
      roomId: 'hand-room-id',
      isRaised: true
    }));

    await waitFor(() => {
      expect(screen.getByText('Hand Raised')).toBeInTheDocument();
    });
  });

  it('verifies reaction selection emits to socket and renders on float layer HUD', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'react-room-id',
            name: 'Reaction Emitter Channel',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      })
    );

    render(<RoomPage params={{ id: 'react-room-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Reaction Emitter Channel')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Eve' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Check reaction selector button trigger is rendered
    await waitFor(() => {
      expect(screen.getByLabelText('Send Reaction')).toBeInTheDocument();
    });

    const reactionBtn = screen.getByLabelText('Send Reaction');

    // Open Picker drawer
    fireEvent.click(reactionBtn);

    // Pick "❤️" reaction
    const heartBtn = screen.getByLabelText('Send ❤️ reaction');
    
    await act(async () => {
      fireEvent.click(heartBtn);
    });

    // Socket.io should emit reaction send event
    expect(mockSocket.emit).toHaveBeenCalledWith('reaction:send', expect.objectContaining({
      roomId: 'react-room-id',
      emoji: '❤️'
    }));

    // Verify reaction floating item exists on viewport overlay
    expect(screen.getByText('❤️')).toBeInTheDocument();

    // Fast-forward timers to check item decays cleanly
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Emojis should float off and remove from state cleanly
    await waitFor(() => {
      expect(screen.queryByText('❤️')).not.toBeInTheDocument();
    });
  });

  it('evicts participants instantly when the countdown timer hits 0', async () => {
    // Parse room details containing short expiration date limit
    const mockExpires = new Date(Date.now() + 5000).toISOString(); // 5 seconds remaining limit
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'expiry-room-id',
            name: 'Expiry Limited Channel',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            expiresAt: mockExpires,
            hasPassword: false
          }
        })
      })
    );

    render(<RoomPage params={{ id: 'expiry-room-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Expiry Limited Channel')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Frank' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Wait for the room to render the clock HUD
    await waitFor(() => {
      expect(screen.getByText(/Time Left:/i)).toBeInTheDocument();
    });

    // Fast forward countdown timer ticker 6 seconds
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // User should get kicked, tracks closed, and redirected to landing page with error parameter
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/?error=expired');
    });
  });
});
