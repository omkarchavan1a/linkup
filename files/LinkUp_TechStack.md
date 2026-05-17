TECH STACK SPECIFICATION
LinkUp — Architecture & Technology Decisions
Version 1.0  |  Omkar IT Determination  |  May 2025

Product
LinkUp — Video Calling & Chat Platform
Author
Omkar Chavan — Full-Stack Developer
Hosting
100% Vercel (Frontend + API + Edge Functions)
Database
MongoDB Atlas — M0 Free Tier
External APIs
None — Zero third-party paid APIs
Real-time
WebRTC (browser-native) + Socket.io
Encryption
DTLS-SRTP (WebRTC native) + TLS 1.3


1. Architecture Overview

LinkUp is a serverless, edge-first application. The architecture is designed to run entirely on free-tier infrastructure while delivering sub-200ms real-time performance. The core real-time communication is peer-to-peer via WebRTC, which means video/audio data never touches the server — dramatically reducing bandwidth costs and improving latency.

Core Architecture Principle
Video/Audio: Peer-to-Peer via WebRTC (no server relay for media streams)
Signaling: Next.js API Routes + Socket.io on Vercel
Data: MongoDB Atlas for rooms, users, chat history
Fallback: TURN server (Coturn on Render free tier) for restricted networks
Deployment: Git push → Vercel auto-deploy (CI/CD built-in)

2. Frontend Layer

2.1 Framework — Next.js 14 (App Router)
Decision
Rationale
Next.js 14 with App Router
Server Components for SEO-optimized landing pages. Client Components for real-time UI. Best of both worlds.
React 18
Concurrent rendering for smooth video UI updates without blocking.
TypeScript
Type safety across WebRTC peer connections, socket events, and API contracts. Catches bugs at compile time.
Tailwind CSS
Utility-first, no CSS files, fast iteration. Mobile-responsive by default.

2.2 Real-Time Communication — WebRTC
Component
Implementation
Peer Connection
RTCPeerConnection API — native browser, no library needed
Video Stream
getUserMedia() for camera/mic access. MediaStream API.
Screen Share
getDisplayMedia() — share full screen or tab
Encryption
DTLS-SRTP — enabled by default in all WebRTC connections. Peer-to-peer, server never sees media.
ICE/STUN
Google public STUN servers (free): stun:stun.l.google.com:19302
TURN Fallback
Self-hosted Coturn on Render free tier for users behind NAT/firewall
Signaling
Socket.io over WebSocket — SDP offer/answer + ICE candidates exchange

2.3 UI Libraries
Library
Purpose
simple-peer
WebRTC abstraction — simplifies peer connection lifecycle management
socket.io-client
WebSocket client for real-time signaling and chat
uuid
Unique room ID generation (v4 UUID)
date-fns
Timestamp formatting for chat messages
react-icons
Icon set for UI controls (mute, camera, share, etc.)
framer-motion
Smooth animations for participant join/leave, reaction overlays

3. Backend Layer

3.1 API — Next.js API Routes + Edge Functions
Endpoint Type
Implementation
REST API Routes
Next.js /app/api/* — room CRUD, user presence, chat history fetch
WebSocket Server
Socket.io server running on Vercel Serverless Functions
Edge Middleware
Vercel Edge Middleware for rate limiting room creation (5 rooms/minute/IP)
Room Signaling
Socket.io rooms map 1:1 with MongoDB room documents

3.2 Key API Endpoints
Method + Route
Purpose
Auth Required
POST /api/rooms/create
Create new room, return shareable URL
No
GET /api/rooms/[id]
Fetch room metadata (name, expiry, participant count)
No
DELETE /api/rooms/[id]
Host closes room permanently
Host token
GET /api/rooms/[id]/chat
Fetch chat history for room
No
POST /api/rooms/[id]/join
Register participant presence
No
PATCH /api/rooms/[id]/settings
Update room password, expiry, name
Host token

3.3 Socket.io Events
Event Name
Direction
Purpose
room:join
Client → Server
User joins a room, server broadcasts to all peers
room:leave
Client → Server
User leaves, server cleans up and notifies peers
signal:offer
Client → Server → Client
WebRTC SDP offer forwarded to target peer
signal:answer
Client → Server → Client
WebRTC SDP answer forwarded back
signal:ice
Client → Server → Client
ICE candidate forwarded for NAT traversal
chat:message
Client → Server → Room
Chat message broadcast to all room participants
control:mute
Client → Server → Room
Host mutes a participant
control:kick
Client → Server → Target
Host removes a participant from room
presence:update
Client → Server → Room
User status update (online, away, in-meeting)
reaction:send
Client → Server → Room
Emoji reaction broadcast to all participants

4. Database Layer — MongoDB Atlas

4.1 Why MongoDB
Free M0 tier (512MB) — sufficient for MVP
Flexible schema suits evolving room/chat data models
Native JSON — matches Next.js API response format
TTL indexes — auto-delete expired rooms and old chat messages
Mongoose ODM — type-safe schemas with Next.js

4.2 Data Models
Room Schema (rooms collection)
_id: UUID string (room ID, also used in URL)
name: string (optional custom name)
hostToken: string (hashed token for host identity)
password: string | null (bcrypt-hashed, optional)
createdAt: Date
expiresAt: Date | null (null = permanent)
maxParticipants: number (default: 10)
settings: { allowChat, allowScreenShare, waitingRoom }
participantCount: number (live count via Socket.io)

Chat Message Schema (messages collection)
_id: ObjectId
roomId: string (ref: rooms._id)
senderName: string (display name, no account needed)
content: string
type: 'text' | 'file' | 'reaction'
createdAt: Date (TTL index: delete after 7 days)

Participant Schema (participants collection — ephemeral)
_id: ObjectId
roomId: string
socketId: string (Socket.io connection ID)
displayName: string
joinedAt: Date
isHost: boolean
status: 'online' | 'away' | 'in-meeting'
Note: Documents auto-deleted when socket disconnects (TTL: 1 hour)

4.3 MongoDB Indexes
Collection
Indexes
rooms
_id (primary), expiresAt (TTL index, auto-delete expired rooms)
messages
roomId (query index), createdAt (TTL: 7 days)
participants
roomId (query index), socketId (unique), joinedAt (TTL: 1 hour)

5. Infrastructure & Hosting

5.1 Vercel Free Tier (Frontend + API)
Feature
Free Tier Limit
Bandwidth
100 GB/month
Serverless Function Invocations
100,000/month
Edge Function Executions
500,000/month
Build Minutes
6,000 minutes/month
Custom Domains
Unlimited
SSL/HTTPS
Auto-provisioned
CI/CD
Git push triggers auto-deploy

5.2 MongoDB Atlas M0 Free Tier
Feature
Free Tier Limit
Storage
512 MB
RAM
Shared
Connections
500 max
Region
AWS ap-south-1 (Mumbai) — low latency for India
Backups
No automated backups on M0
Uptime SLA
Best-effort (no SLA on free tier)

5.3 TURN Server — Coturn on Render Free Tier
Required for users behind corporate firewalls or strict NAT
Coturn is open-source and self-hostable
Deployed on Render free tier (750 hours/month — enough for 1 instance)
Credentials passed securely to WebRTC peer connection config
Only activated as fallback when STUN fails (saves bandwidth)

6. Security Architecture

Layer
Mechanism
Details
Transport
TLS 1.3
All HTTP traffic over HTTPS. Enforced by Vercel.
Video/Audio
DTLS-SRTP
WebRTC native encryption. Peer-to-peer, server-blind.
Room Access
Bcrypt-hashed PIN
Optional password protection for sensitive rooms.
Host Identity
Signed JWT token
Host token issued at room creation. Stored in localStorage.
Rate Limiting
Vercel Edge Middleware
5 room creations per IP per minute. Prevents spam.
Input Sanitization
DOMPurify + Mongoose validation
XSS protection on chat. Schema validation on all inputs.
CORS
Next.js middleware
Strict origin allowlist. No wildcard in production.

7. Development Environment

Tool
Purpose
VS Code / Cursor
Primary IDE
Termux (Android)
Mobile development — Next.js dev server, git, npm
Git + GitHub
Version control. Connected to Vercel for auto-deploy.
Vercel CLI
Local preview builds, environment variable management
MongoDB Compass
Database GUI for local development inspection
Postman
API endpoint testing
Chrome DevTools
WebRTC internals (chrome://webrtc-internals) for debugging

8. Environment Variables

All secrets managed via Vercel Environment Variables (never committed to git):
Variable
Purpose
MONGODB_URI
MongoDB Atlas connection string
NEXTAUTH_SECRET
JWT signing secret for host tokens
TURN_SERVER_URL
Coturn TURN server URL
TURN_USERNAME
TURN server credential
TURN_PASSWORD
TURN server credential
NEXT_PUBLIC_SOCKET_URL
Socket.io server URL (public, safe to expose)

9. Cost Analysis

Monthly Infrastructure Cost — MVP Phase
Vercel (Frontend + API + CI/CD): $0/month — Free Hobby plan
MongoDB Atlas (Database): $0/month — M0 Free Cluster
Coturn TURN Server (Render): $0/month — Free Instance
Domain Name: ~$10/year (~₹830/year) — one-time annual cost
Total Monthly: $0 | Total Annual: ~$10 (domain only)
Upgrade trigger: > 100 concurrent rooms or > 80GB/month bandwidth
