BUSINESS REQUIREMENTS DOCUMENT
LinkUp — Video Calling & Real-Time Communication Platform
Version 1.0  |  Omkar IT Determination  |  May 2025

Product Name
LinkUp
Document Type
Business Requirements Document (BRD)
Business Owner
Omkar Chavan — Founder, Omkar IT Determination
Version
1.0
Date
May 2025
Business Email
omkaritdetermination@gmail.com
Status
Draft


1. Business Overview

Omkar IT Determination is a Pune-based digital services company specializing in web development, AI integrations, CRM systems, and custom software. LinkUp is the company's first internally developed SaaS product, built to demonstrate AI-integrated full-stack capabilities and generate recurring revenue independent of client project cycles.
LinkUp addresses the communication tool market by offering a privacy-first, browser-native video calling platform with zero-friction onboarding. The business model begins with a free tier to capture users, with a premium tier planned for Phase 2.

2. Business Objectives

Objective
Target Outcome
Launch a differentiated SaaS product
Establish Omkar IT Determination as a product company, not just a services firm
Generate product-led revenue
500 free users by Month 3; 50 paid conversions by Month 6
Demonstrate full-stack + WebRTC capability
Use as portfolio anchor for enterprise and startup client acquisition
Build with zero hosting cost initially
Vercel + MongoDB Atlas free tiers cover MVP operational costs
Establish brand presence in communication tools
100 organic visits/day by Month 4 via SEO and link-share virality

3. Business Opportunity

3.1 Market Context
The global video conferencing market was valued at $6.28 billion in 2023 and is growing at 12.5% CAGR. However, the market is dominated by enterprise tools. The informal / friend-group segment (WhatsApp calls, Facetime, Discord) has no clear browser-native leader with privacy-first positioning.

3.2 Competitive Positioning
Platform
Weakness
LinkUp Advantage
Zoom
Requires account + download. Scheduled meetings.
No account needed. Instant link. Always-on rooms.
Google Meet
Tied to Google account. No persistent rooms.
Works without Google. Persistent + expiring rooms.
Discord
Complex UI. Gaming-focused perception.
Simple, clean UI. Professional and casual both.
WhatsApp Video
Mobile-only. Limited to contacts. No browser.
Browser-first. Share with anyone via link.
Whereby
Paid tiers restrict features heavily.
Generous free tier. All core features free at MVP.

4. Stakeholders

Stakeholder
Role
Responsibility
Omkar Chavan
Founder / Full-Stack Developer
Product vision, architecture, development, launch
Beta Users (Friends/Peers)
Early Adopters
Usability testing, feature feedback, bug reports
Future Clients
B2B Prospects
Evaluate LinkUp as evidence of technical capability
Vercel / MongoDB Atlas
Infrastructure Partners
Hosting, database, scaling

5. Business Requirements

5.1 Functional Business Requirements
Requirement ID
Business Requirement
BR-001
The system must allow room creation without requiring user registration to minimize drop-off.
BR-002
The system must generate a unique shareable URL for each room to enable viral link-sharing growth.
BR-003
All video and chat must be encrypted end-to-end to enable privacy positioning in marketing.
BR-004
Room hosts must have moderation controls (kick, mute) to ensure product is viable for business use.
BR-005
The platform must support screen sharing to compete with Zoom/Meet for work use cases.
BR-006
Room expiry controls must exist to support use cases for one-time calls and persistent team rooms.
BR-007
The platform must load and function on all major browsers without installation.
BR-008
Usage analytics must be collected (anonymized) to inform product decisions.

5.2 Non-Functional Business Requirements
Requirement ID
Requirement
NBR-001
Infrastructure cost must remain under ₹0/month for MVP (free tier only).
NBR-002
The platform must handle 100 concurrent room sessions before requiring paid infrastructure.
NBR-003
Time-to-value for a new user must be under 60 seconds from landing page to active video call.
NBR-004
The product must be deployable to production from a single git push (CI/CD via Vercel).

6. Revenue Model

Phase 1 — Free Tier (MVP, Months 1–4)
Unlimited rooms, 10 participants max per room
60-minute call limit per session
Chat history: 24 hours
Goal: User acquisition, word-of-mouth via link sharing

Phase 2 — LinkUp Pro (Month 5+) — ₹299/month
Unlimited call duration
Up to 50 participants per room
Persistent chat history (30 days)
Custom room names (linkup.app/your-name)
Password-protected rooms
Priority TURN server access

7. Constraints

Budget: Zero infrastructure spend at MVP. All services must operate on free tiers.
Timeline: MVP must be live within 12 weeks of development start.
Team: Single developer (Omkar Chavan). No dedicated QA or DevOps.
Technology: Next.js + MongoDB + Vercel only. No proprietary paid APIs.
Legal: Must comply with GDPR basics. No sale of user data. Encrypted comms.

8. Assumptions

WebRTC native browser encryption (DTLS-SRTP) is sufficient for MVP E2E encryption claims.
Vercel free tier bandwidth (100GB/month) is sufficient for MVP user volumes.
MongoDB Atlas M0 (512MB) is sufficient for room + chat data at MVP scale.
Target users have modern browsers (Chrome 90+, Firefox 88+, Safari 14+).
No regulatory approval is required for a communication tool in the Indian market at this scale.

9. Dependencies

Dependency
Risk if Unavailable
Vercel Free Tier
Need to migrate to Render or Railway — adds cost
MongoDB Atlas M0
Need local SQLite fallback — loses cloud sync
WebRTC Browser APIs
Core functionality fails — no mitigation without native app
Socket.io / WebSocket
Real-time features degrade to polling — higher latency

10. Approval & Sign-Off

Prepared By
Omkar Chavan — Omkar IT Determination
Date Prepared
May 2025
Business Approval
Omkar Chavan (Self-approved for internal product)
Technical Review
Pending
Version
1.0 — Initial
