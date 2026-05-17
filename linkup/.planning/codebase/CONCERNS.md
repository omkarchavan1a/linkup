# Security Hotspots, Bottlenecks & Architectural Risks

This document highlights critical security boundaries, performance hotspots, potential single points of failure, and design limitations of LinkUp.

---

## 1. Security Hotspots & Mitigation Status

### A. Host Claim Validation Token Authorization
* **Hotspot**: The application authenticates meeting hosts using a simple JWT claims string (`host_token_`) stored in browser local storage (`localStorage`).
* **Risk**: High-risk of cross-site scripting (XSS) extraction if third-party modules or malicious dependencies gain execution access.
* **Mitigation**: Critical REST endpoints must validate the JWT token signature on the server layer.

### B. Waiting Room Tokens Gating
* **Hotspot**: The waiting room gates rely on Socket.io signaling message routes to promote waitlisted guest sockets to active connections.
* **Risk**: Gated bypass could occur if a guest directly sends a signaling `join-room` message block without passing through the lobby approval sequence.
* **Mitigation**: Ensure that the signaling server validates the client approval token status prior to broadcasting their coordinates to other participants.

---

## 2. Performance Bottlenecks & Optimization Areas

### A. Full-Mesh Quadratically $O(N^2)$ Bandwidth Complexities
* **Hotspot**: Full-mesh peer connections grow quadratically as users scale, saturating the upstream bandwidth of the local clients.
* **Mitigation**: LinkUp implement dynamic client outbound bandwidth downscaling via `RTCRtpSender.setParameters` (throttling streams down to 250 kbps in high-load situations).
* **Future Work**: Transition to a **Selective Forwarding Unit (SFU)** or **Multipoint Control Unit (MCU)** topology for meetings with more than 10 active participants.

### B. Canvas Render Iteration Complexities
* **Hotspot**: Broadcasted vectors for shared whiteboard coordinates execute instant paint events on client canvases.
* **Risk**: Excessive brush strokes or continuous drag redraw loops can lead to severe browser thread blocking.
* **Mitigation**: Drawing streams are throttled and draw calls are batch-rendered using `requestAnimationFrame`.

---

## 3. Single Points of Failure (SPOF)

### A. In-Memory Socket.io Routing
* **SPOF**: The WebSocket broker runs as a single-instance custom Pages API Server hosted on the Next.js process thread.
* **Impact**: If the Next.js thread blocks, restart loops clear active room signaling mappings, immediately severing in-flight WebRTC calls.
* **Mitigation**: Deploy a separate, load-balanced Node.js server backed by a Redis pub/sub adapter to persist socket room mappings across restart iterations.

### B. STUN Server Dependencies
* **SPOF**: The peer connection relies on public STUN servers for NAT route resolution.
* **Impact**: Stale or unreachable STUN servers block direct client-to-client connection creations.
* **Mitigation**: Configure redundant STUN options inside RTC configuration packages.

---

## 4. Current Scale Limitations

* **Symmetric NAT Traversal**: LinkUp currently operates without a TURN server. As a result, users behind strict symmetric NAT firewalls (such as corporate office setups or enterprise networks) will fail to establish direct P2P connections.
* **Meeting Capacity Bounds**: Due to the local processing overhead of full-mesh topologies, meetings are functionally bounded to a maximum of **8-10 active participants** before client-side performance begins to degrade.
