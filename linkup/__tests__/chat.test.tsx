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

// Mock socket.io-client with event capture
const socketHandlers: { [event: string]: Function } = {};
const mockSocket = {
  id: 'mock-socket-id',
  on: jest.fn((event: string, handler: Function) => {
    socketHandlers[event] = handler;
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
};
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock global fetch
const mockFetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      room: {
        id: 'test-room-id',
        name: 'Chat Test Room',
        maxParticipants: 10,
        participantCount: 1,
        settings: { allowChat: true, allowScreenShare: true, waitingRoom: false }
      }
    })
  })
);
Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'fetch', { value: mockFetch, writable: true });
}

// Mock user media
const mockStream = {
  getTracks: jest.fn().mockReturnValue([
    { stop: jest.fn(), enabled: true, kind: 'audio' },
    { stop: jest.fn(), enabled: true, kind: 'video' }
  ]),
  getAudioTracks: jest.fn().mockReturnValue([{ enabled: true }]),
  getVideoTracks: jest.fn().mockReturnValue([{ enabled: true }]),
};
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: jest.fn().mockResolvedValue(mockStream) },
  writable: true
});

// Mock WebRTC
class MockRTCPeerConnection {
  onicecandidate: any = null;
  ontrack: any = null;
  onnegotiationneeded: any = null;
  addTrack = jest.fn();
  close = jest.fn();
  createOffer = jest.fn().mockResolvedValue({ sdp: 'offer-sdp', type: 'offer' });
  createAnswer = jest.fn().mockResolvedValue({ sdp: 'answer-sdp', type: 'answer' });
  setLocalDescription = jest.fn().mockResolvedValue(undefined);
  setRemoteDescription = jest.fn().mockResolvedValue(undefined);
  addIceCandidate = jest.fn().mockResolvedValue(undefined);
}
(global as any).RTCPeerConnection = MockRTCPeerConnection;
(global as any).RTCSessionDescription = jest.fn().mockImplementation((init) => init);
(global as any).RTCIceCandidate = jest.fn().mockImplementation((init) => init);

// Mock clipboard
Object.assign(navigator, { clipboard: { writeText: jest.fn() } });

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('Chat Integration Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(socketHandlers).forEach(key => delete socketHandlers[key]);
  });

  async function joinRoom() {
    render(<RoomPage params={{ id: 'test-room-id' }} />);

    await waitFor(() => {
      expect(screen.getByText('Chat Test Room')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    fireEvent.change(nameInput, { target: { value: 'TestUser' } });

    const joinButton = screen.getByRole('button', { name: /Join Room/i });
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Trigger socket connect handler
    if (socketHandlers['connect']) {
      await act(async () => {
        socketHandlers['connect']();
      });
    }
  }

  it('opens chat panel when chat toggle button is clicked', async () => {
    await joinRoom();

    const chatToggle = screen.getByRole('button', { name: /Toggle Chat/i });
    fireEvent.click(chatToggle);

    await waitFor(() => {
      expect(screen.getByText('Room Chat')).toBeInTheDocument();
    });
  });

  it('sends a chat message via socket when submitting the form', async () => {
    await joinRoom();

    // Open chat panel
    const chatToggle = screen.getByRole('button', { name: /Toggle Chat/i });
    fireEvent.click(chatToggle);

    await waitFor(() => {
      expect(screen.getByText('Room Chat')).toBeInTheDocument();
    });

    // Type a message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello everyone!' } });

    // Submit
    const sendButton = screen.getByRole('button', { name: /Send Message/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Verify socket.emit was called with chat:message
    expect(mockSocket.emit).toHaveBeenCalledWith('chat:message', expect.objectContaining({
      roomId: 'test-room-id',
      message: 'Hello everyone!',
      senderName: 'TestUser'
    }));

    // Verify the message appears in the DOM
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
  });

  it('displays incoming chat messages from other peers', async () => {
    await joinRoom();

    // Open chat
    const chatToggle = screen.getByRole('button', { name: /Toggle Chat/i });
    fireEvent.click(chatToggle);

    await waitFor(() => {
      expect(screen.getByText('Room Chat')).toBeInTheDocument();
    });

    // Simulate an incoming chat:message event
    if (socketHandlers['chat:message']) {
      await act(async () => {
        socketHandlers['chat:message']({
          id: 'remote-msg-1',
          senderSocketId: 'remote-socket-id',
          senderName: 'Bob',
          message: 'Hey from Bob!',
          timestamp: Date.now(),
          isSystem: false
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Hey from Bob!')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('displays system notification when a peer joins', async () => {
    await joinRoom();

    // Open chat
    const chatToggle = screen.getByRole('button', { name: /Toggle Chat/i });
    fireEvent.click(chatToggle);

    // Simulate a peer joining
    if (socketHandlers['room:joined']) {
      await act(async () => {
        socketHandlers['room:joined']({
          userId: 'peer-1',
          name: 'Alice',
          socketId: 'peer-socket-1'
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Alice joined the room')).toBeInTheDocument();
    });
  });
});
