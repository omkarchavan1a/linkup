# Technology Stack Map

This document details the complete technical stack, frameworks, libraries, tools, and platforms utilized in LinkUp.

---

## Core Framework & Runtime

| Component | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>= 20` | Core server execution runtime |
| **Framework** | Next.js | `14.2.35` | Full-stack App Router and Pages Router hybrid framework |
| **Library** | React | `^18.0.0` | Core UI state library |
| **Language** | TypeScript | `^5.0.0` | Strongly-typed JavaScript superset |

---

## Backend & Database Layer

### 1. Database ODM (Mongoose & MongoDB)
* **Technology**: `mongoose` (`^9.6.2`)
* **Usage**: Configured via connection pooling in [db.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/lib/db.ts) using Mongo URI.
* **Mongoose Models**:
  * [Room.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/models/Room.ts): Handles security keys, waiting room gates, and features configuration (whiteboard, screen sharing, chat locks).
  * [File.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/models/File.ts): Captures secure metadata of encrypted file uploads.
  * [Message.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/models/Message.ts): Relates text chat logs and file share attachment indices.
  * [Participant.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/models/Participant.ts): Captures active session lists and authorization bounds.

### 2. Encryption & Authentication
* **JSON Web Tokens**: `jsonwebtoken` (`^9.0.3`) for room host claims authentication and session validation.
* **Hashing**: `bcryptjs` (`^3.0.3`) used to secure room access passwords.

---

## Real-Time & WebRTC Communication

* **WebSockets**: `socket.io` (`^4.8.3`) on the server and `socket.io-client` on the front-end for signaling handshakes, whiteboard draws, raise-hand alerts, and chat messages.
* **Peer-to-Peer**: WebRTC native mesh connections (`RTCPeerConnection`) created dynamically inside the client components.

---

## Styling & Styling Tools

* **Utility Styles**: Tailwind CSS (`^3.4.1`) configured via [tailwind.config.ts](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/tailwind.config.ts) and custom Glassmorphism/Neumorphism custom utility components in [globals.css](file:///c:/Users/oomka/OneDrive/Desktop/New%20folder%20(2)/linkup/src/app/globals.css).
* **CSS Postprocessing**: PostCSS (`^8`) configuration in `postcss.config.mjs`.

---

## Developer Operations & Testing

* **Unit/Integration Tests**: Jest (`^30.4.2`), testing-library/react (`^16.3.2`), and ts-jest (`^29.4.9`) for robust pipeline safety.
* **Linting & Formatting**: ESLint (`^8`), eslint-config-next, and Prettier (`^3.8.3`).
