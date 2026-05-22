import { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { validateRoomId, validateColor } from '../../lib/validation';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Module-level in-memory cache to persist waiting guests list across page reloads/reconnects
const waitingGuests: Record<string, { socketId: string; name: string; userId: string }[]> = {};

const ioHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io');
    
    const httpServer: NetServer = res.socket.server;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('room:join', ({ roomId, userId, name }) => {
        if (!roomId || !validateRoomId(roomId)) {
          console.warn(`[Socket.io] Rejected room:join due to invalid roomId: ${roomId}`);
          return;
        }
        socket.join(roomId);
        console.log(`User ${name} (${userId}) joined room ${roomId}`);
        
        // Notify others in the room
        socket.to(roomId).emit('room:joined', { userId, name, socketId: socket.id });

        // Instantly synchronize joining clients (like the host) with current waiting lobby
        const currentList = waitingGuests[roomId] || [];
        socket.emit('waiting-room:list', currentList);
      });

      socket.on('signal', ({ targetSocketId, signal }) => {
        if (!targetSocketId) return;
        // Relay signaling messages (WebRTC SDP/ICE candidates) directly to target
        io.to(targetSocketId).emit('signal', {
          senderSocketId: socket.id,
          signal
        });
      });

      socket.on('chat:message', ({ roomId, message, senderName, timestamp, type, fileId, fileMetadata }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        
        // Limit text message length to 2000 chars to avoid memory exhaustion
        const sanitizedMsg = typeof message === 'string' ? message.slice(0, 2000) : "";
        
        // Broadcast chat message to all other participants in the room
        socket.to(roomId).emit('chat:message', {
          id: `${socket.id}-${Date.now()}`,
          senderSocketId: socket.id,
          senderName,
          message: sanitizedMsg,
          timestamp,
          isSystem: false,
          type: type || "text",
          fileId,
          fileMetadata
        });
      });

      socket.on('room:leave', ({ roomId, userId }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.leave(roomId);
        console.log(`User ${userId} left room ${roomId}`);
        socket.to(roomId).emit('room:left', { userId, socketId: socket.id });
      });

      socket.on('screen-share:state', ({ roomId, isSharing }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('screen-share:state', {
          socketId: socket.id,
          isSharing
        });
      });

      // Interactive Emoji Reaction Event
      socket.on('reaction:send', ({ roomId, reactionType }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('reaction:received', {
          senderSocketId: socket.id,
          reactionType
        });
      });

      // Hand Raise Toggle Event
      socket.on('hand-raise:toggle', ({ roomId, isRaised }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('hand-raise:state', {
          socketId: socket.id,
          isRaised
        });
      });

      // Waiting Lobby Event Pipeline (Robust synchronization & persistence)
      socket.on('waiting-room:join', ({ roomId, name, userId }) => {
        if (!roomId || !validateRoomId(roomId)) {
          console.warn(`[Socket.io] Rejected waiting-room:join due to invalid roomId: ${roomId}`);
          return;
        }
        
        socket.join(`${roomId}-waiting`);
        console.log(`User ${name} (${userId}) waiting for approval in ${roomId}`);
        
        const payload = {
          socketId: socket.id,
          name: name || "Guest",
          userId: userId || `guest-${Date.now()}`
        };

        // Initialize array for this room if not already cached
        if (!waitingGuests[roomId]) {
          waitingGuests[roomId] = [];
        }

        // Avoid adding duplicate guests
        if (!waitingGuests[roomId].some(guest => guest.socketId === socket.id)) {
          waitingGuests[roomId].push(payload);
        }

        // Broadcast to main room using server-wide io.to(roomId) to fix socket.to room limitations
        io.to(roomId).emit('waiting-room:pending', payload);
        io.to(roomId).emit('waiting-room:request', payload);
        io.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
      });

      socket.on('waiting-room:approve', ({ roomId, targetSocketId, guestSocketId }) => {
        const targetId = targetSocketId || guestSocketId;
        if (!targetId) return;

        io.to(targetId).emit('waiting-room:approved');

        // Clean up from waitlist cache
        if (roomId && validateRoomId(roomId) && waitingGuests[roomId]) {
          waitingGuests[roomId] = waitingGuests[roomId].filter(guest => guest.socketId !== targetId);
          io.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
        }
      });

      socket.on('waiting-room:deny', ({ roomId, targetSocketId, guestSocketId }) => {
        const targetId = targetSocketId || guestSocketId;
        if (!targetId) return;

        io.to(targetId).emit('waiting-room:denied');

        // Clean up from waitlist cache
        if (roomId && validateRoomId(roomId) && waitingGuests[roomId]) {
          waitingGuests[roomId] = waitingGuests[roomId].filter(guest => guest.socketId !== targetId);
          io.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
        }
      });

      // Real-time Host Settings Synchronization Relays
      socket.on('room:settings:update', ({ roomId, settings }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('room:settings:updated', { settings });
      });

      // Whiteboard Synchronization & Permission Relays
      socket.on('whiteboard:toggle', ({ roomId, isOpen }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('whiteboard:toggle', { isOpen });
      });

      socket.on('whiteboard:draw', ({ roomId, prevPos, currentPos, color, size }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        if (color && !validateColor(color)) return;
        
        const parsedSize = parseInt(size, 10);
        if (isNaN(parsedSize) || parsedSize < 1 || parsedSize > 50) return;

        socket.to(roomId).emit('whiteboard:draw', { prevPos, currentPos, color, size: parsedSize });
      });

      socket.on('whiteboard:clear', ({ roomId }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('whiteboard:clear');
      });

      socket.on('whiteboard:undo', ({ roomId }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('whiteboard:undo');
      });

      socket.on('whiteboard:lock', ({ roomId, isLocked }) => {
        if (!roomId || !validateRoomId(roomId)) return;
        socket.to(roomId).emit('whiteboard:lock', { isLocked });
      });

      socket.on('disconnecting', () => {
        socket.rooms.forEach((roomName) => {
          if (roomName !== socket.id) {
            // Check if socket is disconnecting while in waiting room queue
            if (roomName.endsWith('-waiting')) {
              const actualRoomId = roomName.slice(0, -8);
              if (waitingGuests[actualRoomId]) {
                waitingGuests[actualRoomId] = waitingGuests[actualRoomId].filter(guest => guest.socketId !== socket.id);
                io.to(actualRoomId).emit('waiting-room:list', waitingGuests[actualRoomId]);
              }
            } else {
              socket.to(roomName).emit('room:left', { socketId: socket.id });
            }
          }
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  res.end();
};

export default ioHandler;
