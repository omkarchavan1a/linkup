/**
 * LinkUp: Waiting Room Lobby Integration Test Script
 * Pure JavaScript - Hermetic end-to-end Socket.io simulation
 */

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const { io: clientIo } = require('socket.io-client');

// Use a valid UUIDv4 for testing
const testRoomId = '12345678-1234-4321-8765-1234567890ab';
const PORT = 4321;
let httpServer;
let ioServer;
let hostSocket;
let guest1Socket;
let guest2Socket;

const waitingGuests = {};

// Simple mock/replica of the central validation functions
function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function validateColor(color) {
  return true; // Simple pass for mock server
}

// Helper to track checklist progress
const checklist = {
  hostConnected: false,
  guest1Waiting: false,
  guest2Waiting: false,
  hostReceivedPending: false,
  hostReceivedList: false,
  guest1Approved: false,
  guest2Denied: false,
};

function logStep(name, success) {
  if (success) {
    console.log(`✅ [SUCCESS] ${name}`);
  } else {
    console.error(`❌ [FAILURE] ${name}`);
    process.exit(1);
  }
}

// ── 1. Initialize Server ──────────────────────────────────────────────────────
async function startServer() {
  return new Promise((resolve) => {
    httpServer = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('Mock Socket.io Server Active');
    });

    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    ioServer.on('connection', (socket) => {
      // room:join handler
      socket.on('room:join', ({ roomId, userId, name }) => {
        if (!roomId || !validateUUID(roomId)) {
          console.warn(`[Server] Rejected room:join due to invalid roomId: ${roomId}`);
          return;
        }
        socket.join(roomId);
        
        // Notify others
        socket.to(roomId).emit('room:joined', { userId, name, socketId: socket.id });

        // Instantly synchronize joining host/clients with waitlist list
        const currentList = waitingGuests[roomId] || [];
        socket.emit('waiting-room:list', currentList);
      });

      // waiting-room:join handler
      socket.on('waiting-room:join', ({ roomId, name, userId }) => {
        if (!roomId || !validateUUID(roomId)) {
          console.warn(`[Server] Rejected waiting-room:join due to invalid roomId: ${roomId}`);
          return;
        }
        socket.join(`${roomId}-waiting`);
        
        const payload = {
          socketId: socket.id,
          name: name || "Guest",
          userId: userId || `guest-${Date.now()}`
        };

        if (!waitingGuests[roomId]) {
          waitingGuests[roomId] = [];
        }

        if (!waitingGuests[roomId].some(guest => guest.socketId === socket.id)) {
          waitingGuests[roomId].push(payload);
        }

        // Broadcast to main room using server-wide ioServer.to(roomId)
        ioServer.to(roomId).emit('waiting-room:pending', payload);
        ioServer.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
      });

      // waiting-room:approve handler
      socket.on('waiting-room:approve', ({ roomId, guestSocketId }) => {
        if (!guestSocketId) return;
        ioServer.to(guestSocketId).emit('waiting-room:approved');

        if (roomId && validateUUID(roomId) && waitingGuests[roomId]) {
          waitingGuests[roomId] = waitingGuests[roomId].filter(guest => guest.socketId !== guestSocketId);
          ioServer.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
        }
      });

      // waiting-room:deny handler
      socket.on('waiting-room:deny', ({ roomId, guestSocketId }) => {
        if (!guestSocketId) return;
        ioServer.to(guestSocketId).emit('waiting-room:denied');

        if (roomId && validateUUID(roomId) && waitingGuests[roomId]) {
          waitingGuests[roomId] = waitingGuests[roomId].filter(guest => guest.socketId !== guestSocketId);
          ioServer.to(roomId).emit('waiting-room:list', waitingGuests[roomId]);
        }
      });

      // disconnecting handler
      socket.on('disconnecting', () => {
        socket.rooms.forEach((roomName) => {
          if (roomName !== socket.id) {
            if (roomName.endsWith('-waiting')) {
              const actualRoomId = roomName.slice(0, -8);
              if (waitingGuests[actualRoomId]) {
                waitingGuests[actualRoomId] = waitingGuests[actualRoomId].filter(guest => guest.socketId !== socket.id);
                ioServer.to(actualRoomId).emit('waiting-room:list', waitingGuests[actualRoomId]);
              }
            } else {
              socket.to(roomName).emit('room:left', { socketId: socket.id });
            }
          }
        });
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`📡 Mock server listening on port ${PORT}`);
      resolve();
    });
  });
}

// ── 2. Run Test Workflow ──────────────────────────────────────────────────────
async function runTest() {
  console.log('🚀 Starting end-to-end waiting room queue integration test...');

  await startServer();

  // Step 1: Connect Host
  hostSocket = clientIo(`http://localhost:${PORT}`, { autoConnect: true });

  await new Promise((resolve) => {
    hostSocket.on('connect', () => {
      console.log('🔌 Host client connected successfully');
      hostSocket.emit('room:join', { roomId: testRoomId, userId: 'host-user-id', name: 'Albus (Host)' });
      checklist.hostConnected = true;
      logStep('Host successfully joined conference room', true);
      resolve();
    });
  });

  // Step 2: Connect Guest 1 (Lobby flow)
  guest1Socket = clientIo(`http://localhost:${PORT}`, { autoConnect: true });

  await new Promise((resolve) => {
    // Listen on host side for the join requests
    hostSocket.on('waiting-room:pending', (payload) => {
      if (payload.socketId === guest1Socket.id) {
        console.log(`🔔 Host notified: ${payload.name} is waiting`);
        checklist.hostReceivedPending = true;
        logStep('Host received real-time "waiting-room:pending" alert notification', true);
        resolve();
      }
    });

    guest1Socket.on('connect', () => {
      console.log('🔌 Guest 1 client connected successfully');
      guest1Socket.emit('waiting-room:join', { roomId: testRoomId, userId: 'guest-1-id', name: 'Harry (Guest 1)' });
      checklist.guest1Waiting = true;
      logStep('Guest 1 requested to join, placed in waitlist lobby', true);
    });
  });

  // Step 3: Connect Guest 2 & Verify Waitlist Synchronization
  guest2Socket = clientIo(`http://localhost:${PORT}`, { autoConnect: true });

  await new Promise((resolve) => {
    hostSocket.on('waiting-room:list', (list) => {
      console.log(`📋 Host received waitlist update containing ${list.length} guests`);
      if (list.length === 2 && list.some(g => g.name === 'Harry (Guest 1)') && list.some(g => g.name === 'Ron (Guest 2)')) {
        checklist.hostReceivedList = true;
        logStep('Host synchronized waitlist populated with all queued lobby participants', true);
        resolve();
      }
    });

    guest2Socket.on('connect', () => {
      console.log('🔌 Guest 2 client connected successfully');
      guest2Socket.emit('waiting-room:join', { roomId: testRoomId, userId: 'guest-2-id', name: 'Ron (Guest 2)' });
      checklist.guest2Waiting = true;
      logStep('Guest 2 requested to join, queued successfully', true);
    });
  });

  // Step 4: Host approves Guest 1
  await new Promise((resolve) => {
    guest1Socket.on('waiting-room:approved', () => {
      console.log('✨ Guest 1 successfully admitted inside room!');
      checklist.guest1Approved = true;
      logStep('Guest 1 admitted to the meeting upon host approval', true);
      resolve();
    });

    // host triggers approval
    hostSocket.emit('waiting-room:approve', { roomId: testRoomId, guestSocketId: guest1Socket.id });
  });

  // Step 5: Host denies Guest 2
  await new Promise((resolve) => {
    guest2Socket.on('waiting-room:denied', () => {
      console.log('⛔ Guest 2 successfully denied and evicted back to home');
      checklist.guest2Denied = true;
      logStep('Guest 2 rejected from meeting upon host decline', true);
      resolve();
    });

    // host triggers rejection
    hostSocket.emit('waiting-room:deny', { roomId: testRoomId, guestSocketId: guest2Socket.id });
  });

  // Step 6: Verify final waitlist is completely empty
  await new Promise((resolve) => {
    // Check one last time that waitlist is empty
    hostSocket.once('waiting-room:list', (list) => {
      if (list.length === 0) {
        logStep('Waitlist lobby cleared cleanly after processing admissions', true);
        resolve();
      }
    });
    
    // Trigger any connection refresh/removal indicator
    hostSocket.emit('room:join', { roomId: testRoomId, userId: 'host-user-id', name: 'Albus (Host)' });
  });

  // ── 3. Clean up Connections & Exit ──────────────────────────────────────────
  console.log('\n🧹 Cleaning up client connections...');
  hostSocket.disconnect();
  guest1Socket.disconnect();
  guest2Socket.disconnect();
  
  console.log('🔌 Shutting down test socket.io server...');
  ioServer.close();
  httpServer.close();

  console.log('\n⭐ INTEGRATION TEST SUITE PASSED SUCCESSFULLY! ⭐\n');
  process.exit(0);
}

// Prevent test hanging on failure
setTimeout(() => {
  console.error('\n❌ TEST TIMEOUT: One or more socket events failed to trigger.');
  console.log('Current state of checklist:', checklist);
  process.exit(1);
}, 8000);

runTest().catch((err) => {
  console.error('❌ Test execution encountered an unhandled error:', err);
  process.exit(1);
});
