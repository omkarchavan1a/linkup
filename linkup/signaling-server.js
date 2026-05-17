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

// In-memory waiting lobby storage cache to persist guests list per room ID
const waitingGuests = {};

// Safe validation utilities for room ID and hex colors
const validateUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const validateColor = (color) => typeof color === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(color);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('room:join', ({ roomId, userId, name }) => {
    if (!roomId || !validateUUID(roomId)) {
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
    // Relay signaling messages (WebRTC SDP/ICE candidates) directly to target
    io.to(targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      signal
    });
  });

  socket.on('chat:message', ({ roomId, message, senderName, timestamp, type, fileId, fileMetadata }) => {
    if (!roomId || !validateUUID(roomId)) return;

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
    if (!roomId || !validateUUID(roomId)) {
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
    if (roomId && validateUUID(roomId) && waitingGuests[roomId]) {
      waitingGuests[roomId] = waitingGuests[roomId].filter(guest => guest.socketId !== targetId);
      io.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
    }
  });

  socket.on('waiting-room:deny', ({ roomId, targetSocketId, guestSocketId }) => {
    const targetId = targetSocketId || guestSocketId;
    if (!targetId) return;

    io.to(targetId).emit('waiting-room:denied');

    // Clean up from waitlist cache
    if (roomId && validateUUID(roomId) && waitingGuests[roomId]) {
      waitingGuests[roomId] = waitingGuests[roomId].filter(guest => guest.socketId !== targetId);
      io.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
    }
  });

  // Real-time Host Settings Synchronization Relays
  socket.on('room:settings:update', ({ roomId, settings }) => {
    if (!roomId || !validateUUID(roomId)) return;
    socket.to(roomId).emit('room:settings:updated', { settings });
  });

  // Whiteboard Synchronization & Permission Relays
  socket.on('whiteboard:toggle', ({ roomId, isOpen }) => {
    socket.to(roomId).emit('whiteboard:toggle', { isOpen });
  });

  socket.on('whiteboard:draw', ({ roomId, prevPos, currentPos, color, size }) => {
    if (!roomId || !validateUUID(roomId)) return;
    if (color && !validateColor(color)) return;
    
    const parsedSize = parseInt(size, 10);
    if (isNaN(parsedSize) || parsedSize < 1 || parsedSize > 50) return;

    socket.to(roomId).emit('whiteboard:draw', { prevPos, currentPos, color, size: parsedSize });
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

server.listen(PORT, () => {
  console.log(`LinkUp Signaling Server is running on port ${PORT}`);
});
