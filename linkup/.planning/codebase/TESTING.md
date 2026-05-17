# Quality Assurance & Testing Framework

This document outlines the testing infrastructure, configurations, custom test suites, and execution instructions for LinkUp.

---

## 1. Test Architecture Configuration

LinkUp runs an automated test suite driven by Jest and dynamic client mocking utilities:

* **Jest Profile (`jest.config.ts`)**: Integrates `ts-jest` to perform fast, type-safe transpilation, binding the environment to `jsdom` to simulate full browser rendering capabilities.
* **Environment Setup (`jest.setup.ts`)**: Mocks browser-specific Web API standards that are missing in Node/JSDOM environments:
  * Web Audio API mock interfaces (`AudioContext`, `AnalyserNode`, `MediaStreamAudioSourceNode`).
  * WebRTC media objects (`RTCPeerConnection`, `RTCRtpSender`, `MediaStream`).
  * Layout API interfaces (`HTMLCanvasElement.getContext`, `Notification`).

---

## 2. Test Execution Operations

To execute the automated test suites, run:

```bash
npm run test
```

Or execute Jest directly to run target coverage checks:

```bash
npx jest
```

---

## 3. Test Suites Directory Map

LinkUp maintains full test coverage across all core systems:

### A. REST Service Integration Tests
* **File**: `__tests__/api/rooms.test.ts`
* **Scenarios**: Mocks request routing to verify room creations, database persistence, invalid parameter validation, password hashing security, and metadata retrievals.

### B. Peer Connection Signaling & Media Tests
* **File**: `__tests__/webrtc.test.tsx` & `__tests__/webrtc-advanced.test.tsx`
* **Scenarios**:
  * Asserts correct mapping of local stream tracks on connection starts.
  * Validates active speaker volume calculations and adaptive speaking state updates.
  * Verifies priority-based selective video grid renderer: checks that non-active remote peers correctly unmount their `<video>` elements to save browser CPU cycles.
  * Validates dynamic outbound local RTCRtpSender maximum bitrates and resolution parameters updates based on in-call participant count changes.

### C. Gated Waiting Room Handshake Tests
* **File**: `__tests__/webrtc-advanced.test.tsx`
* **Scenarios**: Simulates host notification triggers, synthesized chime executions, and host admission/denial workflows.

### D. Collaborative Whiteboarding & Files Exchange Tests
* **File**: `__tests__/features-canvas-files.test.tsx`
* **Scenarios**:
  * Simulates dynamic user drawing coordinates broadcasts and clear operations.
  * Validates drag-and-drop secure file transfers, file uploads size boundary blocks, and download trigger links.

### E. SEO, Metadata & Accessibility Tests
* **File**: `__tests__/features-help-seo.test.tsx`
* **Scenarios**:
  * Asserts presence of descriptive title metadata tags.
  * Checks robot rule compliance and proper sitemap array indices.
  * Verifies heading hierarchy structure constraints (single `<h1 />` per document).
