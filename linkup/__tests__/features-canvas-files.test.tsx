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
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock global fetch for room details and file uploads
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

// Mock HTMLElement prototype scrollIntoView for JSDOM
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}

// Mock HTML5 Canvas context APIs
const mockCanvasContext = {
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  createPattern: jest.fn(),
  createLinearGradient: jest.fn(),
  createRadialGradient: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCanvasContext);
HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock-png');

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

describe('LinkUp Feature Tests - Collaborative Whiteboard & Chat File Sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketCallbacks = {};
    localStorage.clear();
  });

  it('verifies whiteboard toggle layout shifts remote videos to a compressed ribbon strip', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'room-whiteboard',
            name: 'Whiteboard Meeting Zone',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      })
    );

    // Join as Host
    localStorage.setItem('host_token_room-whiteboard', 'host-secret-token');

    render(<RoomPage params={{ id: 'room-whiteboard' }} />);

    await waitFor(() => {
      expect(screen.getByText('Whiteboard Meeting Zone')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Host Bob' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Simulate socket connection event
    await act(async () => {
      if (socketCallbacks['connect']) {
        socketCallbacks['connect']();
      }
    });

    // Verify Whiteboard Toggle Button is in control bar
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle Whiteboard')).toBeInTheDocument();
    });

    const whiteboardBtn = screen.getByLabelText('Toggle Whiteboard');

    // Toggle whiteboard active state
    await act(async () => {
      fireEvent.click(whiteboardBtn);
    });

    // Whiteboard canvas element should render on screen
    await waitFor(() => {
      expect(screen.getByTitle('Undo Last Stroke')).toBeInTheDocument();
      expect(screen.getByTitle('Lock Drawing for Guests')).toBeInTheDocument();
    });

    // Check layout grid compresses local cameras to top horizontal ribbon
    expect(screen.getByText('Host Bob (You)')).toBeInTheDocument();
    expect(mockSocket.emit).toHaveBeenCalledWith('whiteboard:toggle', expect.objectContaining({
      roomId: 'room-whiteboard',
      isOpen: true
    }));
  });

  it('prohibits guest from toggling whiteboard directly unless already shared', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'room-guest-board',
            name: 'Guest Canvas Arena',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      })
    );

    // Alert Mock
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<RoomPage params={{ id: 'room-guest-board' }} />);

    await waitFor(() => {
      expect(screen.getByText('Guest Canvas Arena')).toBeInTheDocument();
    });

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

    await waitFor(() => {
      expect(screen.getByLabelText('Toggle Whiteboard')).toBeInTheDocument();
    });

    const whiteboardBtn = screen.getByLabelText('Toggle Whiteboard');

    // Try to start whiteboard session as a guest
    await act(async () => {
      fireEvent.click(whiteboardBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith("Only the host can initiate the whiteboard session.");
    alertSpy.mockRestore();
  });

  it('validates host lock state on guests and displays drawing disabled banner overlay', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'room-locked-board',
            name: 'Lobby Secure Canvas',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      })
    );

    render(<RoomPage params={{ id: 'room-locked-board' }} />);

    await waitFor(() => {
      expect(screen.getByText('Lobby Secure Canvas')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'Guest Charlie' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Simulate socket connection event
    await act(async () => {
      if (socketCallbacks['connect']) {
        socketCallbacks['connect']();
      }
    });

    // Simulate socket event turning on whiteboard session and locking it
    await act(async () => {
      if (socketCallbacks['whiteboard:toggle']) {
        socketCallbacks['whiteboard:toggle']({ isOpen: true });
      }
      if (socketCallbacks['whiteboard:lock']) {
        socketCallbacks['whiteboard:lock']({ isLocked: true });
      }
    });

    // Whiteboard should render but show Locked Overlay for the Guest
    await waitFor(() => {
      expect(screen.getByText('Drawing Locked by Host')).toBeInTheDocument();
      expect(screen.getByText(/The host has locked drawing controls/i)).toBeInTheDocument();
    });
  });

  it('verifies chat file sharing drag-and-drop triggers, uploads file, and sends file messages', async () => {
    mockFetch.mockImplementation((url, config) => {
      if (url === '/api/files/upload') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            file: {
              _id: 'db-file-id-789',
              name: 'project-proposal.pdf',
              size: 512000,
              type: 'application/pdf'
            }
          })
        });
      }
      // Standard room details
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          room: {
            id: 'room-file-share',
            name: 'Secure Document Exchanger',
            maxParticipants: 5,
            participantCount: 1,
            settings: { allowChat: true, allowScreenShare: true, waitingRoom: false },
            hasPassword: false
          }
        })
      });
    });

    render(<RoomPage params={{ id: 'room-file-share' }} />);

    await waitFor(() => {
      expect(screen.getByText('Secure Document Exchanger')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter display name...');
    const joinButton = screen.getByRole('button', { name: /Join Room/i });

    fireEvent.change(nameInput, { target: { value: 'User David' } });
    
    await act(async () => {
      fireEvent.click(joinButton);
    });

    // Simulate socket connection event
    await act(async () => {
      if (socketCallbacks['connect']) {
        socketCallbacks['connect']();
      }
    });

    // Open chat pane
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle Chat')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Toggle Chat'));

    // Verify Chat Sidebar is visible
    await waitFor(() => {
      expect(screen.getByText('Room Chat')).toBeInTheDocument();
    });

    const chatPane = screen.getByText('Room Chat').closest('div');
    expect(chatPane).toBeInTheDocument();

    // Trigger dragover on Chat Pane
    fireEvent.dragOver(chatPane!);
    expect(screen.getByText(/Drop to share securely/i)).toBeInTheDocument();

    // Trigger drop on Chat Pane with a mock file attachment (10KB)
    const file = new File(['mock content data'], 'project-proposal.pdf', { type: 'application/pdf' });
    
    // Define custom readAsDataURL reader mock for FileReader
    const mockReader = {
      readAsDataURL: jest.fn(),
      onloadend: null as any,
      result: 'data:application/pdf;base64,bW9jayBjb250ZW50IGRhdGE=',
    };
    jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader as any);

    await act(async () => {
      fireEvent.drop(chatPane!, {
        dataTransfer: {
          files: [file]
        }
      });
      // Fire onloadend manually
      if (mockReader.onloadend) {
        mockReader.onloadend();
      }
    });

    // Check file upload fetch was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/files/upload', expect.objectContaining({
        method: 'POST'
      }));
    });

    // Verify that the document amber file card appears in chat message stack
    await waitFor(() => {
      expect(screen.getByText('project-proposal.pdf')).toBeInTheDocument();
      expect(screen.getByText('Download Securely')).toBeInTheDocument();
    });

    // Verify Socket message broadcast has been dispatched
    expect(mockSocket.emit).toHaveBeenCalledWith('chat:message', expect.objectContaining({
      roomId: 'room-file-share',
      type: 'file',
      fileId: 'db-file-id-789',
      fileMetadata: expect.objectContaining({
        name: 'project-proposal.pdf',
        size: file.size
      })
    }));
  });
});
