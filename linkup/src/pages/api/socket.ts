import { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import { Server as SocketIOServer } from 'socket.io';

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
        socket.join(roomId);
        console.log(`User ${name} (${userId}) joined room ${roomId}`);
        
        // Notify others in the room
        socket.to(roomId).emit('room:joined', { userId, name, socketId: socket.id });
      });

      socket.on('signal', ({ targetSocketId, signal }) => {
        // Relay signaling messages (WebRTC SDP/ICE candidates) directly to target
        io.to(targetSocketId).emit('signal', {
          senderSocketId: socket.id,
          signal
        });
      });

      socket.on('chat:message', ({ roomId, message, senderName, timestamp }) => {
        // Broadcast chat message to all other participants in the room
        socket.to(roomId).emit('chat:message', {
          id: `${socket.id}-${Date.now()}`,
          senderSocketId: socket.id,
          senderName,
          message,
          timestamp,
          isSystem: false
        });
      });

      socket.on('room:leave', ({ roomId, userId }) => {
        socket.leave(roomId);
        console.log(`User ${userId} left room ${roomId}`);
        socket.to(roomId).emit('room:left', { userId, socketId: socket.id });
      });

      socket.on('screen-share:state', ({ roomId, isSharing }) => {
        socket.to(roomId).emit('screen-share:state', {
          socketId: socket.id,
          isSharing
        });
      });

      // Interactive Emoji Reaction Event
      socket.on('reaction:send', ({ roomId, reactionType }) => {
        socket.to(roomId).emit('reaction:received', {
          senderSocketId: socket.id,
          reactionType
        });
      });

      // Hand Raise Toggle Event
      socket.on('hand-raise:toggle', ({ roomId, isRaised }) => {
        socket.to(roomId).emit('hand-raise:state', {
          socketId: socket.id,
          isRaised
        });
      });

      // Waiting Lobby Event Pipeline
      socket.on('waiting-room:join', ({ roomId, name, userId }) => {
        socket.join(`${roomId}-waiting`);
        console.log(`User ${name} (${userId}) waiting for approval in ${roomId}`);
        socket.to(roomId).emit('waiting-room:request', {
          socketId: socket.id,
          name,
          userId
        });
      });

      socket.on('waiting-room:approve', ({ targetSocketId }) => {
        io.to(targetSocketId).emit('waiting-room:approved');
      });

      socket.on('waiting-room:deny', ({ targetSocketId }) => {
        io.to(targetSocketId).emit('waiting-room:denied');
      });

      socket.on('disconnecting', () => {
        socket.rooms.forEach((roomId) => {
          if (roomId !== socket.id) {
            socket.to(roomId).emit('room:left', { socketId: socket.id });
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
