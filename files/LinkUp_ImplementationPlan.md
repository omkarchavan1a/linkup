IMPLEMENTATION PLAN
LinkUp — 12-Week Development Roadmap
Version 1.0  |  Omkar IT Determination  |  May 2025

Project
LinkUp — Video Calling & Chat Platform
Developer
Omkar Chavan — Omkar IT Determination
Timeline
12 Weeks (3 Phases × 4 Weeks)
Start Date
Week 1 of June 2025 (suggested)
Target Launch
End of August 2025
Methodology
Solo Agile — weekly sprints with self-review
Repository
GitHub (private) → Vercel auto-deploy


Phase 1 — Foundation (Weeks 1–4)

Goal: Working video call between two users in a shared room. Everything else is scaffolding.

Week 1 — Project Setup & Room Infrastructure
Task
Details
Initialize Next.js 14 project
npx create-next-app@latest linkup --typescript --tailwind --app. Configure ESLint, Prettier.
MongoDB Atlas setup
Create M0 free cluster (ap-south-1). Create linkup-prod database. Create rooms, messages, participants collections.
Mongoose schemas
Implement Room, Message, Participant schemas with TypeScript interfaces. Add TTL indexes.
Environment config
Setup .env.local. Configure Vercel project and link GitHub repo.
Deploy skeleton to Vercel
Push empty Next.js app. Confirm auto-deploy pipeline works end-to-end.
Landing page (static)
Hero section, feature list, 'Create Room' CTA button. Tailwind CSS. Mobile responsive.
Week 1 Completion Criteria
Next.js app live on Vercel with custom domain
MongoDB Atlas connected and accepting writes
Landing page renders correctly on mobile and desktop

Week 2 — Room Creation & Signaling Server
Task
Details
Room creation API
POST /api/rooms/create — generates UUID room ID, saves to MongoDB, returns shareable URL.
Room join API
GET /api/rooms/[id] — validates room exists, not expired, not full. Returns room metadata.
Socket.io setup
Install socket.io. Create /api/socket endpoint. Handle room:join, room:leave, disconnect events.
Room page route
Create /room/[id] page. Fetch room data. Show loading/error states.
Host token system
Generate signed JWT on room creation. Store in localStorage. Validate on host-only actions.
Room URL share UI
Copy-to-clipboard button with toast notification. QR code display (qrcode.react library).
Week 2 Completion Criteria
User can create a room and get a shareable URL
Second user can navigate to URL and see room data
Socket.io server accepts connections and handles room:join/leave

Week 3 — WebRTC Video Calling
Task
Details
Camera/mic access
getUserMedia() with permission UI. Handle browser permission denial gracefully.
WebRTC peer connections
RTCPeerConnection setup. SDP offer/answer flow via Socket.io signaling.
ICE candidate exchange
signal:ice Socket.io events. STUN config: stun.l.google.com:19302.
Video grid UI
CSS Grid layout for participant videos. Self-view in corner. Responsive for 2–10 participants.
simple-peer integration
Simplify WebRTC connection lifecycle. Handle peer join/leave dynamically.
Multi-peer mesh topology
Each participant connects directly to every other participant (mesh). Max 10 users.
Week 3 Completion Criteria
Two browser tabs on same machine can see and hear each other via WebRTC
Three participants can join same room and all see each other
Video grid adjusts layout based on participant count

Week 4 — Controls & Real-Time Chat
Task
Details
Participant controls
Mute/unmute toggle. Camera on/off. UI indicators for muted/video-off state.
Host controls
Mute all. Kick participant (emit control:kick, trigger disconnect on target client).
Real-time chat panel
Slide-in chat panel. Socket.io chat:message broadcast. Message list with sender name + timestamp.
Chat persistence
Save messages to MongoDB messages collection. Fetch history on room join.
Presence indicators
Online/Away/In-Meeting status. Update on window blur/focus events.
Phase 1 testing
Test on Chrome, Firefox, Safari. Test on mobile browser. Fix WebRTC issues found.
Phase 1 Done — Milestone Checkpoint
Full video call works between 2–5 participants
Real-time chat works with history
Host controls functional
App live on Vercel, shareable with real users
All tests passing on Chrome, Firefox, Safari


Phase 2 — Enhanced Features (Weeks 5–8)

Goal: Add the features that differentiate LinkUp from basic video call tools.

Week 5 — Screen Sharing & Encryption Layer
Task
Details
Screen sharing
getDisplayMedia() API. Replace video track in peer connections when sharing starts/stops.
Screen share UI
Shared screen occupies main area. Participants move to sidebar strip.
DTLS-SRTP verification
Confirm WebRTC connections are using SRTP. Log in chrome://webrtc-internals.
TURN server setup
Deploy Coturn on Render free tier. Configure with username/password auth. Test fallback path.
Room password protection
Add password field to room creation. bcrypt hash stored in MongoDB. Prompt on join.
Connection quality indicator
RTCPeerConnection.getStats() — show signal strength icon per participant.

Week 6 — Reactions, Waiting Room & Expiry
Task
Details
Emoji reactions
Reaction picker UI. reaction:send Socket.io event. Floating emoji animation overlay using CSS keyframes.
Waiting room
Participants enter waiting state. Host sees list and approves/denies each. Socket.io approval flow.
Room expiry system
MongoDB TTL on rooms. Server-side check on join. Client redirect when room expires. Countdown timer in UI.
Hand raise indicator
Toggle hand-raise status. Visible icon on participant video. Sorted to top of participant list.
Notification sounds
Subtle Web Audio API tones for: join, leave, new chat message, hand raise.

Week 7 — File Sharing & Whiteboard
Task
Details
File sharing
Drag-and-drop to chat panel. Store in MongoDB (files under 16MB as GridFS, or base64 for small files). Shared as download link.
File expiry
24-hour TTL on shared files. Auto-delete from MongoDB.
Whiteboard
HTML5 Canvas. Socket.io sync for draw events (path coordinates broadcast in real time). Clear/undo controls.
Whiteboard permissions
Host can open/close whiteboard. All participants can draw by default (configurable).

Week 8 — Custom Rooms & Recording
Task
Details
Custom room names
Vanity URL: /room/my-team-name. Slugify input, check uniqueness in MongoDB. Fallback to UUID if taken.
Local recording
MediaRecorder API. Record local video+audio stream. Download as .webm on stop. No server storage.
Recording UI
Record button with red indicator. Timer display. Stop + download prompt.
Phase 2 testing
End-to-end test all new features. Load test with 8+ participants. Fix issues.
Phase 2 Done — Milestone Checkpoint
Screen sharing, reactions, waiting room, file sharing all functional
TURN server fallback tested and working
Custom room names working
Local recording functional


Phase 3 — Polish, SEO & Launch (Weeks 9–12)

Goal: Production-ready. Real users. Feedback loop running.

Week 9 — UI Polish & Accessibility
Task
Details
Dark mode
Tailwind dark: classes. Persist preference in localStorage.
Responsive refinement
Test and fix UI on mobile (iOS Safari, Android Chrome). Video controls accessible with thumb.
Accessibility
Keyboard navigation for all controls. ARIA labels. Focus management. Screen reader test.
Loading states
Skeleton loaders for room join. Spinner during WebRTC negotiation. Error states with retry.
Onboarding tooltips
First-time user tips: 'Click to share your link', 'You are the host'. Dismissible.

Week 10 — SEO, Analytics & Performance
Task
Details
SEO setup
Next.js Metadata API. OG tags for room share links (room name + participant count in preview). Sitemap.xml.
Vercel Analytics
Enable Vercel Web Analytics (free). Track: page views, room creation rate, session duration.
Performance audit
Lighthouse audit. Target: 90+ Performance, 100 Accessibility. Optimize images, bundle size.
MongoDB query optimization
Add missing indexes. Review slow queries with Atlas query profiler.
Error monitoring
Vercel error logs + custom error boundary in React. Log WebRTC failures to console + MongoDB.

Week 11 — Beta Testing & Bug Fixes
Task
Details
Beta user recruitment
Invite 20–30 friends, college peers, clients. Share testing guide.
Cross-browser testing
Structured test matrix: Chrome/Firefox/Safari/Edge × Windows/Mac/Android/iOS.
Network condition testing
Test on slow 3G (Chrome DevTools throttling). Test behind VPN. Test TURN fallback.
Bug triage
Categorize bugs: P1 (blocks usage), P2 (degrades UX), P3 (cosmetic). Fix all P1s before launch.
Feedback collection
Google Form for beta feedback. 10-question usability survey. NPS score collection.

Week 12 — Launch
Task
Details
Production checklist
All env vars set in Vercel. MongoDB indexes confirmed. TURN server healthy. Custom domain with SSL.
Launch announcement
LinkedIn post. Instagram reel demo (@omkar_it_determination). Product Hunt submission.
Documentation
Basic /help page with FAQ. WebRTC troubleshooting guide (common issues + fixes).
Monitoring setup
Vercel uptime alerts. MongoDB Atlas alerts for storage > 400MB. Manual daily check week 1.
Post-launch feedback loop
Check analytics daily. Respond to user feedback within 24 hours. Weekly bug fix release cadence.

Kill Switch Criteria

Pivot or stop if any of the following are true by end of Month 3:
When to pivot or kill the project
WebRTC connection success rate < 80% — signaling or TURN server architecture needs rebuild
< 50 unique users after 6 weeks of being live — validate problem-solution fit before adding features
MongoDB M0 storage exhausted in < 60 days — monetize or purge strategy failing
Solo dev cannot maintain quality above Phase 2 — reduce scope, don't ship broken features
Vercel bandwidth limit hit consistently — need to evaluate paid plan ROI or architecture change

Summary Timeline

Phase
Weeks
Key Deliverables
Phase 1 — Foundation
1–4
Room creation, WebRTC video, real-time chat, host controls. App live on Vercel.
Phase 2 — Features
5–8
Screen share, encryption, reactions, waiting room, file sharing, whiteboard, recording.
Phase 3 — Launch
9–12
UI polish, SEO, analytics, beta testing, production launch, feedback loop.

Total Duration
12 Weeks
Total Developer Days
~60 working days (solo)
Infrastructure Cost at Launch
$0/month
Launch Target
End of August 2025
