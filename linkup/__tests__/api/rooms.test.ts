import { POST } from '@/app/api/rooms/create/route';
import { GET } from '@/app/api/rooms/[id]/route';
import Room from '@/models/Room';

jest.mock('@/lib/db', () => jest.fn());

jest.mock('@/models/Room', () => {
  const mockSave = jest.fn().mockResolvedValue({});
  const mockRoom = jest.fn().mockImplementation(() => {
    return {
      save: mockSave,
    };
  });
  
  // Attach findById mock directly to the model mock
  (mockRoom as any).findById = jest.fn();
  return mockRoom;
});

describe('Rooms API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/rooms/create', () => {
    it('creates a new room and returns its details', async () => {
      const mockReq = new Request('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          maxParticipants: 15,
          settings: { allowChat: true }
        }),
      });

      const response = await POST(mockReq);
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.roomId).toBeDefined();
      expect(body.hostToken).toBeDefined();
    });
  });

  describe('GET /api/rooms/[id]', () => {
    it('returns a 404 if the room does not exist', async () => {
      // Mock Room.findById to return null
      (Room as any).findById = jest.fn().mockResolvedValue(null);

      const mockReq = new Request('http://localhost/api/rooms/test-id');
      const response = await GET(mockReq, { params: { id: 'test-id' } });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Room not found');
    });

    it('returns room details if the room is found and not expired', async () => {
      const mockRoomData = {
        _id: 'test-id',
        name: 'Test Room',
        maxParticipants: 10,
        participantCount: 1,
        settings: {
          allowChat: true,
          allowScreenShare: true,
          waitingRoom: false,
        },
        createdAt: new Date(),
        expiresAt: null,
      };

      (Room as any).findById = jest.fn().mockResolvedValue(mockRoomData);

      const mockReq = new Request('http://localhost/api/rooms/test-id');
      const response = await GET(mockReq, { params: { id: 'test-id' } });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.room.id).toBe('test-id');
      expect(body.room.name).toBe('Test Room');
    });
  });
});
