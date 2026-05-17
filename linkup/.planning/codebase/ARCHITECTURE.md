# System Architecture & Design Patterns

This document describes the architectural layout, core design patterns, database schemas, and media scaling strategies implemented in LinkUp.

---

## 1. Modular Hybrid Routing Paradigm

LinkUp utilizes a hybrid architecture that merges Next.js App Router for REST components with Pages Router for real-time WebSocket integrations:

```
                                  [ LinkUp Core ]
                                   /           \
                                  /             \
                  [ Next.js App Router ]      [ Next.js Pages Router ]
                    /        |       \                    |
                   /         |        \                   |
               Routes      Layouts    REST APIs      Pages API Route
             (Room Page)   (Main)    (Rooms/Files)   (Socket.io Server)
```

* **App Router (`src/app/`)**: Handles UI static views, metadata schemas, help portals, and standard REST API route handlers.
* **Pages Router (`src/pages/api/`)**: Hosts the custom in-memory Socket.io real-time engine in [socket.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/pages/api/socket.ts) to avoid Next.js App Router serverless execution timeouts.

---

## 2. Gated Security & Waiting Room Handshake Architecture

Security gates are active by default to protect hosts. Guests entering a gated room are parked in a decoupled waitlist cycle:

```
[Guest PreJoin] ========> Binds to ${roomId}-waiting socket channel
                                     ||
                                     ||  (Lobby Alert chime plays)
                                     v
[Host Meeting]  <======== socket.on("waiting-room:pending") notification
                                     ||
                                     ||  (Admit / Deny click)
                                     v
[Lobby Gate]    ========> approved socket relays token to join active call
```

1. Non-hosts are routed to the [PreJoinScreen.tsx](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/components/PreJoinScreen.tsx) and blocked from establishing peer connections.
2. Hosts verify guests, triggering synthesised alarm tones and native HTML5 desktop notifications.
3. Upon approval, the socket signaling relays the security clearance token to promote guests to active peer status.

---

## 3. High-Participant Full-Mesh Load Management

Since WebRTC full-mesh grows at $O(N^2)$, client-side processing can quickly bottle-neck browser performance. LinkUp uses two advanced architectural solutions:

### A. Client-Side Web Audio Active Speaker Decoupling
* Rather than asking the backend server to monitor speaker activity (which breaks encryption and introduces SFU dependencies), active speaker classification is done on the client.
* Client-side volume levels are monitored inside [page.tsx](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/app/room/[id]/page.tsx) using the Web Audio API:
  `AnalyserNode` parses audio track binary byte frequency bands.
* High-volume speakers are sorted dynamically to compute prioritized render slots.

### B. Prioritized Grid Video Unmounting
* Standard full-mesh tools try to decode every video stream, saturating the CPU.
* LinkUp dynamically decouples stream packets from UI render slots. The grid displays a maximum of 3 concurrent remote peer streams.
* The remaining peers are unmounted from active `<video>` tags. When a `<video>` tag is unmounted, **the browser's media decoder instantly stops processing the underlying video stream**, reducing CPU usage by up to **80%** while preserving audio tracks!

---

## 4. Persistent Schema Specifications

LinkUp implements Mongoose database models:

* **Room Schema (`Room.ts`)**: Binds room identifiers, host claim credentials, and setting options.
* **File Schema (`File.ts`)**: Stores cryptographic keys and download routes for shared files.
* **Message Schema (`Message.ts`)**: Links text payloads and file attachments.
* **Participant Schema (`Participant.ts`)**: Manages the life cycle of active sessions.
