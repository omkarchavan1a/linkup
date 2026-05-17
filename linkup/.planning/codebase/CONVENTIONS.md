# Code Style & Architecture Conventions

This document guides development practices, directory alignments, interface typing, rich CSS design, and optimization rules for LinkUp.

---

## 1. Type Safety & TypeScript Patterns

* **Strong Interfaces**: Declare explicit interfaces for complex data models instead of utilizing dynamic typing (`any`).
* **Self-Containment**: Keep utilities isolated inside custom files (such as database drivers or synthesized audio adapters) to promote separation of concerns.
* **Component Client Demarcation**: Add `"use client"` at the top of interactive, event-driven components (e.g. whiteboard canvases, device settings).

---

## 2. Low-Latency Performance Ref Management

React state rerenders can easily interrupt high-speed real-time data loops. LinkUp implements strict conventions for managing critical variables:
* **WebRTC Objects (`RTCPeerConnection`)**: Never store active peers or connection streams inside standard React state arrays. Keep them bounded within mutable references (`pcsRef.current`) to prevent excessive DOM rerender iterations.
* **Signaling Clients (`Socket.io`)**: Maintain singleton WebSocket connections inside references (`socketRef.current`) to prevent socket disconnect cycles on local component state updates.
* **Local Media Streams**: Capture stream buffers inside references (`localStreamRef.current`) to enable hot-swapping tracks cleanly without losing signaling bindings.

---

## 3. High-Premium Glassmorphism Aesthetics

LinkUp uses a highly premium visual style. All custom layouts must follow these design standards:
* **Curated Harmonious Gradients**: Never use plain, generic color rules (plain red, plain blue). Integrate custom tailored palettes, dark backdrops, and vibrant accent hues.
* **Frosted Glass Glassmorphism**: Use transparent backdrops blended with blur layers, thin border highlights, and micro-shadows:
  `bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl`
* **Micro-Animations**: Add subtle transitions and hover scaling triggers on all interactive elements to make the interface feel alive:
  `hover:scale-105 active:scale-95 transition-all duration-300`
* **Tailwind Consistency**: Group UI tokens cleanly and avoid redundant inline modifications.

---

## 4. Persistent DB Schema Conventions

* **Mongoose Schema Hygiene**: Always configure schemas to use auto-assigned timestamps and default security settings (`waitingRoom: { type: Boolean, default: true }`).
* **Session Lifecycle Hook Triggers**: Implement clean cascading database deletes when room objects are purged, deleting associated files and messages.

---

## 5. SEO & Semantic Best Practices

* **Title Meta Structures**: Implement clean custom headings and meta-tag descriptions in route configurations:
  * Single primary `<h1 />` per layout path.
  * Informative, descriptive semantic HTML markup (`<section>`, `<article>`, `<header>`).
* **Accessibility Bounds**: Always declare explicit labels, hover cues, and accessible identifiers for screen readers on all media buttons.
