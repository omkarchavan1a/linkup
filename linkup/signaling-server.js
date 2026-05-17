const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

// Create a standard HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'LinkUp Signaling Server' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Attach Socket.io to the server
const io = new Server(server, {
  path: '/api/socket',
  addTrailingSlash: false,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

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

  socket.on('chat:message', ({ roomId, message, senderName, timestamp, type, fileId, fileMetadata }) => {
    // Broadcast chat message to all other participants in the room
    socket.to(roomId).emit('chat:message', {
      id: `${socket.id}-${Date.now()}`,
      senderSocketId: socket.id,
      senderName,
      message,
      timestamp,
      isSystem: false,
      type: type || "text",
      fileId,
      fileMetadata
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

  // Whiteboard Synchronization & Permission Relays
  socket.on('whiteboard:toggle', ({ roomId, isOpen }) => {
    socket.to(roomId).emit('whiteboard:toggle', { isOpen });
  });

  socket.on('whiteboard:draw', ({ roomId, prevPos, currentPos, color, size }) => {
    socket.to(roomId).emit('whiteboard:draw', { prevPos, currentPos, color, size });
  });

  socket.on('whiteboard:clear', ({ roomId }) => {
    socket.to(roomId).emit('whiteboard:clear');
  });

  socket.on('whiteboard:undo', ({ roomId }) => {
    socket.to(roomId).emit('whiteboard:undo');
  });

  socket.on('whiteboard:lock', ({ roomId, isLocked }) => {
    socket.to(roomId).emit('whiteboard:lock', { isLocked });
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

server.listen(PORT, () => {
  console.log(`LinkUp Signaling Server is running on port ${PORT}`);
});
