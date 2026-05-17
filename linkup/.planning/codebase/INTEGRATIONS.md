# Integrations & Communication Protocols

This document profiles all internal and external communication protocols, API layouts, WebSocket events, and peer-to-peer topologies utilized by LinkUp.

---

## 1. REST API Endpoints

LinkUp utilizes Next.js App Router API Handlers:

### Room Control Endpoints
* **`POST /api/rooms/create`**: Initializes new secure meeting rooms. Accepting titles, custom passwords, and features settings (allowing screen share, waiting room lobby, and global chat locks). Returns room model and host claims JWT token.
* **`GET /api/rooms/[id]`**: Retrieves active configuration properties of a room. Gated to verify session authorizations.

### Secure File Sharing Endpoints
* **`POST /api/files/upload`**: Validates file size boundaries (up to 10MB) and stores encrypted binary streams directly to storage, registering metadata fields to Mongoose.
* **`GET /api/files/[id]`**: Pulls file streams to client channels, logging metrics and managing automatic TTL purges (24-hour expiration).

---

## 2. WebSocket Signaling & Coordination

LinkUp runs an in-memory custom Pages API Socket.io Server hosted at [socket.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/pages/api/socket.ts) acting as the centralized signaling mediator.

### Real-Time Event Catalogue

#### A. Waiting Room Gate Handshakes
* **`waiting-room:join`**: Emitted by guest clients entering the gated pre-join screen. Binds their socket to `${roomId}-waiting`.
* **`waiting-room:pending`**: Dispatched by the signaling server to hosts. Emits guest credentials (`socketId`, `name`, `userId`).
* **`waiting-room:approved`**: Sent to the guest's socket when a host clicks "Admit". Directs the guest's prejoin client to initialize local media devices and join the primary room room connection.
* **`waiting-room:denied`**: Dispatched to the guest's socket when rejected. Gracefully disconnects the prejoin state.

#### B. WebRTC Mesh Signaling Handshakes
* **`join-room`**: Dispatched by active participants. Triggers peer discovery.
* **`ready`**: Emitted to established peers indicating capability to open signaling channels.
* **`offer`**: Relays WebRTC dynamic local Session Description Protocol (SDP) configurations to specified remote peers.
* **`answer`**: Relays the responding WebRTC remote Session Description Protocol (SDP) configurations.
* **`candidate`**: Relays network-discovered ICE candidate packages dynamically.

#### C. In-Call Collaboration & Telemetry
* **`message`**: Transmits text chats or secure file reference payloads.
* **`reaction`**: Relays floating emoji payloads to all participants.
* **`hand-raise`**: Synchronizes hand elevation indicators.
* **`whiteboard:draw`**: Broadcasts vector drawing strokes.
* **`whiteboard:clear`**: Wipes all client whiteboard canvases simultaneously.
* **`whiteboard:toggle`**: Synchronizes host control status for whiteboard states.
* **`settings:update`**: Synchronizes real-time restriction updates (chat lock, screenshare rules) across active participants.

---

## 3. WebRTC Peer-to-Peer Mesh Topology

LinkUp uses a full-mesh WebRTC configuration. Every peer establishes direct P2P connections (`RTCPeerConnection`) with every other participant.

```
            [Peer A] <===========> [Peer B]
               \\                 //
                \\               //
                 v               v
                    [Peer C]
```

### Key Technical Aspects
* **STUN Services**: Resolves internal and public firewall routes.
* **CPU Load Optimization**: Rather than decoding $O(N^2)$ media streams, we dynamically unmount non-prioritized video tags to disable browser decoders, keeping CPU usage flat even as user counts rise.
* **Outbound Congestion Mitigation**: Dynamically monitors local peer array lengths and scales local RTCRtpSender maximum bitrates and resolutions dynamically to match network capabilities.
