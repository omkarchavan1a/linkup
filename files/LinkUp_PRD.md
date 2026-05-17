PRODUCT REQUIREMENTS DOCUMENT
LinkUp — Video Calling & Real-Time Chat Platform
Version 1.0  |  Omkar IT Determination  |  May 2025

Product Name
LinkUp
Document Type
Product Requirements Document (PRD)
Owner
Omkar Chavan — Omkar IT Determination
Version
1.0
Date
May 2025
Status
Draft — Pending Technical Review
Contact
omkarchavan1500@gmail.com


1. Executive Summary

LinkUp is a browser-based real-time communication platform that combines HD video calling, end-to-end encrypted messaging, and instant shareable room links — all without requiring users to install any software. Unlike Zoom or Google Meet, LinkUp is built for informal friend groups and small teams who want a frictionless, privacy-first communication experience.
The platform targets the gap between heavyweight enterprise video tools (Zoom, Teams) and disappearing-message apps (Snapchat, WhatsApp). LinkUp is fast, open-link based, and encryption-first.

2. Problem Statement

Current video/chat tools force users into one of two bad choices:
Enterprise tools (Zoom, Meet) — require accounts, downloads, and meeting IDs. Overkill for casual friend calls.
Consumer apps (WhatsApp, Telegram) — mobile-first, no browser support, no shareable room links, weak privacy controls.

There is no lightweight, browser-native platform that offers:
Instant room creation with a shareable link
End-to-end encrypted video + chat in the same interface
No login required to join a call
Real-time features: reactions, screen share, chat, presence indicators

3. Goals & Success Metrics

3.1 Product Goals
Ship a fully functional MVP within 12 weeks
Support up to 10 concurrent users per room on free tier
Achieve sub-2-second room join time
Maintain 99.5% uptime on Vercel free tier infrastructure

3.2 Success Metrics
Metric
Target (Month 3)
Measurement
Daily Active Users
500+
MongoDB analytics collection
Avg. Session Duration
> 12 minutes
Session tracking middleware
Room Join Success Rate
> 97%
WebRTC signaling logs
User Retention (Week 1)
> 35%
Return session tracking
Bounce Rate on Landing
< 40%
Vercel Analytics


4. User Personas

Persona 1 — The College Friend Group
Name: Priya, 21, Engineering student in Pune
Pain Point: Zoom requires scheduling; WhatsApp video breaks with more than 4 people.
Need: Tap a link, land in a room, start talking. No setup. No account required.
Uses LinkUp for: Weekend catch-up calls, study groups, online game nights.

Persona 2 — The Remote Freelancer
Name: Rahul, 28, UI/UX Designer working remotely
Pain Point: Clients don't want to install apps. Email-based Zoom links expire.
Need: Persistent room link he can share in email and reuse anytime.
Uses LinkUp for: Client calls, design reviews, quick sync with collaborators.

Persona 3 — The Small Startup Team
Name: Ananya, 32, Co-founder of a 6-person product company
Pain Point: Team is distributed across 3 cities. Needs always-on video rooms, not scheduled meetings.
Need: Persistent team room, screen sharing, chat history.
Uses LinkUp for: Daily standups, sprint reviews, ad-hoc technical debugging.

5. Feature Requirements

5.1 Core Features — MVP (Phase 1)
Feature
Description
Room Creation
One-click room generation with a unique shareable URL. No login required to join.
Video Calling
HD video (720p minimum) using WebRTC peer-to-peer connections. Supports up to 10 participants.
End-to-End Encryption
All video, audio, and chat traffic encrypted via DTLS-SRTP (WebRTC native) + AES-256 for signaling.
Real-Time Chat
In-room text chat with emoji support. Messages persist for the room session.
Screen Sharing
Share full screen or individual browser tab. Host can grant/revoke permission.
Live Share Link
Shareable room URL with optional expiry (1 hour / 24 hours / permanent). One-click copy.
Participant Controls
Mute/unmute, camera on/off, kick participant (host only), hand raise indicator.
Presence Indicators
Live status: Online, Away, In Meeting. Updates in real time.

5.2 Extended Features — Phase 2
Feature
Description
Reactions & Emoji Overlay
Send floating emoji reactions visible to all participants during a call.
Persistent Chat History
Chat messages stored in MongoDB, accessible after call ends (host controls retention).
Room Password Protection
Optional 6-digit PIN to restrict room access.
Waiting Room
Host approves participants before they join. Reduces unwanted entry.
File Sharing
Drag-and-drop files into chat. Stored temporarily (24h) in MongoDB GridFS.
Whiteboard
Collaborative drawing canvas using Canvas API. Synced via WebSocket.
Recording (Local)
Browser-based local recording using MediaRecorder API. No server storage required.
Custom Room Names
Vanity URLs: linkup.app/my-team instead of random IDs.

5.3 Non-Functional Requirements
Requirement
Specification
Latency
< 150ms end-to-end video latency under normal network conditions
Scalability
Horizontal scaling via Vercel Edge Functions for signaling
Security
HTTPS-only. WebRTC DTLS-SRTP. No plaintext transmission ever.
Accessibility
WCAG 2.1 AA compliance. Keyboard navigation. Screen reader support.
Browser Support
Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
Mobile Support
Responsive UI. Video calling functional on mobile Chrome/Safari.
Data Privacy
No user data sold. GDPR-ready. Data deletion on request.

6. User Stories

User Story ID
Story
US-001
As a user, I want to create a video room with one click so I don't waste time on setup.
US-002
As a user, I want to share a link with friends so they can join without creating an account.
US-003
As a host, I want to mute or remove participants so I maintain control of my room.
US-004
As a user, I want my video and chat to be end-to-end encrypted so my conversations stay private.
US-005
As a user, I want to see who is online in a room before joining so I know it's active.
US-006
As a host, I want to set a room expiry time so temporary rooms auto-close.
US-007
As a user, I want to share my screen so I can show documents during a call.
US-008
As a user, I want to send emoji reactions during a call so I can respond without interrupting.
US-009
As a host, I want to password-protect my room so only invited people can enter.
US-010
As a user, I want to record my side of the call locally so I can review it later.

7. Out of Scope

The following are explicitly excluded from v1.0 to maintain focus:
Native mobile applications (iOS/Android) — web only for Phase 1
Server-side call recording — privacy and storage cost reasons
Payment/billing system — free tier only for MVP
AI transcription or meeting summaries — Phase 3+
Custom domain for rooms — Phase 3+

8. Risks & Mitigations

Risk
Likelihood
Mitigation
WebRTC fails on restrictive corporate networks
Medium
Implement TURN server fallback via Coturn on Render free tier
Vercel cold start delays signaling
Medium
Use Vercel Edge Runtime for signaling endpoints (no cold start)
MongoDB free tier (512MB) exhausted
Low-Medium
TTL indexes on chat messages. Auto-purge rooms after 7 days of inactivity.
Browser compatibility issues on Safari
Medium
Test suite targeting Safari 14+. Polyfills for WebRTC where needed.
Room link abuse / spam joins
Low
Rate limiting on room creation. Optional password protection.

9. Acceptance Criteria

The product is considered MVP-complete when ALL of the following pass:
A user can create a room and receive a shareable URL in < 3 seconds
A second user can join via URL without creating an account in < 5 seconds
Both users can see and hear each other with < 2 seconds of initial sync delay
Chat messages appear in real time (< 200ms latency) for all room participants
Screen sharing activates within 3 seconds of user permission grant
Room link with 1-hour expiry correctly denies access after expiry
All traffic is HTTPS. No WebRTC connection established without DTLS handshake.
App loads and is functional on Chrome, Firefox, Safari, and Edge

10. Document Control

Author
Omkar Chavan — Omkar IT Determination
Reviewed By
TBD
Approved By
TBD
Next Review Date
June 2025
Version History
v1.0 — Initial draft, May 2025
