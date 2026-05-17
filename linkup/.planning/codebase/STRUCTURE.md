# Repository Structure Map

This document outlines the detailed repository architecture, file directories, and individual component scopes of LinkUp.

---

## 1. Directory Tree Overview

```
linkup/
├── .planning/                  # Project planning, task checklists, and codebase maps
├── __tests__/                  # Automated unit, integration, and WebRTC test files
│   ├── api/                    # REST route tests
│   │   └── rooms.test.ts
│   ├── chat.test.tsx           # Instant messaging test cases
│   ├── features-advanced.test.tsx
│   ├── features-canvas-files.test.tsx
│   ├── features-help-seo.test.tsx
│   └── webrtc.test.tsx         # Connection handshake test cases
├── src/                        # Main source code directory
│   ├── app/                    # Next.js App Router (Standard views, layouts, REST handlers)
│   │   ├── api/                # REST endpoints
│   │   │   ├── files/          # File upload and secure download handlers
│   │   │   └── rooms/          # Room creations and updates handlers
│   │   ├── help/               # SEO documentation portals
│   │   ├── room/               # WebRTC client room component view
│   │   │   └── [id]/page.tsx   # Critical full-mesh call page
│   │   ├── globals.css         # Glassmorphic Tailwind styling foundation
│   │   ├── layout.tsx          # Root HTML structure and font settings
│   │   └── page.tsx            # App landing page with advanced configuration
│   ├── components/             # Reusable UI React modules
│   │   ├── Header.tsx          # Neumorphic landing header
│   │   ├── PreJoinScreen.tsx   # Camera preview / waiting room gate layout
│   │   ├── ThemeToggle.tsx     # Theme toggler helper
│   │   └── Whiteboard.tsx      # Vector canvas whiteboarding engine
│   ├── lib/                    # Core library services
│   │   ├── audio.ts            # Alert ringtones and custom Web Audio chime synthesizer
│   │   ├── auth.ts             # Host token verification JWT services
│   │   └── db.ts               # MongoDB Mongoose database driver pool
│   ├── models/                 # Database schema models
│   │   ├── File.ts             # File upload indices
│   │   ├── Message.ts          # Encrypted text logs
│   │   ├── Participant.ts      # Call participants tracking
│   │   └── Room.ts             # Gated room rules and settings properties
│   └── pages/                  # Next.js Pages Router
│       └── api/
│           └── socket.ts       # Central signaling server
├── tailwind.config.ts          # Color palettes and font settings
├── tsconfig.json               # Compiler configurations
├── package.json                # Project dependencies and script bindings
└── signaling-server.js         # Dedicated standalone signaling helper
```

---

## 2. Core Subsystems

### A. The Signaling Subsystem
* **Primary Script**: [socket.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/pages/api/socket.ts)
* **Goal**: Coordinate WebRTC client handshakes, manage waitlist queues, broadcast vector coordinates for whiteboard edits, and sync chat entries.

### B. The Media Call Subsystem
* **Primary Page**: [page.tsx](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/app/room/[id]/page.tsx)
* **Goal**: Capture local camera/microphone media, orchestrate P2P `RTCPeerConnection` signaling, decode remote audio, monitor speaking activity, selectively mount prioritize video tags, and automatically scale sender bitrates.

### C. Gated Pre-flight Subsystem
* **Primary File**: [PreJoinScreen.tsx](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/components/PreJoinScreen.tsx)
* **Goal**: Preview user camera streams, test microphone feeds, verify room password credentials, and hold non-hosts in waitlists until host approval tokens are authorized.

### D. Automated Quality Validation Subsystem
* **Primary File**: `__tests__/`
* **Goal**: Ensure continuous deployment stability via unit coverage testing room setups, signaling operations, chat distributions, and canvas drawings.
