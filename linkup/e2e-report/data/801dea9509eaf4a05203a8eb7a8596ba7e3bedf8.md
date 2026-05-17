# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lobby-admission.spec.js >> Lobby — Host DENIES guest >> Guest enters lobby → Host sees notification → Host denies → Guest redirected home
- Location: e2e\lobby-admission.spec.js:248:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#display-name') to be visible

```

# Test source

```ts
  1   | // @ts-check
  2   | /**
  3   |  * LinkUp E2E — Lobby Admission & Denial Flows
  4   |  *
  5   |  * Scenario A — ADMIT:
  6   |  *   1. Create a room with Waiting Room enabled (via REST API)
  7   |  *   2. HOST  opens the room URL, enters name, joins the meeting
  8   |  *   3. GUEST opens the same room URL, enters name, clicks "Join Room"
  9   |  *   4. Guest lands on the "Approval Pending" screen
  10  |  *   5. Host sees the animated "Join Request" notification toast
  11  |  *   6. Host clicks "Admit" → guest is admitted into the room
  12  |  *   7. Guest's pending screen disappears; they enter the meeting
  13  |  *
  14  |  * Scenario B — DENY:
  15  |  *   Same setup, but host clicks "Decline" and guest is redirected
  16  |  *   back to the home page with ?error=denied.
  17  |  *
  18  |  * ─── Prerequisites ───────────────────────────────────────────────
  19  |  *   • npm run dev  (Next.js running on http://localhost:3000)
  20  |  *   • MongoDB accessible (same env as dev server)
  21  |  *
  22  |  * ─── Run ─────────────────────────────────────────────────────────
  23  |  *   npx playwright test e2e/lobby-admission.spec.js --headed
  24  |  *   npx playwright test e2e/lobby-admission.spec.js --headed --debug
  25  |  */
  26  | 
  27  | const { test, expect } = require('@playwright/test');
  28  | const fs = require('fs');
  29  | const path = require('path');
  30  | 
  31  | const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  32  | 
  33  | // Ensure screenshot output directory exists
  34  | const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e-screenshots');
  35  | if (!fs.existsSync(SCREENSHOTS_DIR)) {
  36  |   fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  37  | }
  38  | 
  39  | // ─── Helper: create a room via REST API ──────────────────────────────────────
  40  | async function createLobbyRoom(request, overrides = {}) {
  41  |   const body = {
  42  |     name: 'E2E Lobby Test Room',
  43  |     maxParticipants: 10,
  44  |     settings: {
  45  |       allowChat: true,
  46  |       allowScreenShare: true,
  47  |       waitingRoom: true,   // ← Must be true to enable the lobby gate
  48  |     },
  49  |     ...overrides,
  50  |   };
  51  | 
  52  |   console.log(`\n📡 POST ${BASE_URL}/api/rooms/create`);
  53  |   const res = await request.post(`${BASE_URL}/api/rooms/create`, {
  54  |     data: body,
  55  |     headers: { 'Content-Type': 'application/json' },
  56  |   });
  57  | 
  58  |   const json = await res.json();
  59  |   if (!res.ok() || !json.success) {
  60  |     throw new Error(`❌ Room creation failed: ${JSON.stringify(json)}`);
  61  |   }
  62  | 
  63  |   console.log(`✅ Room created — ID: ${json.roomId}`);
  64  |   return json; // { success, roomId, hostToken, roomUrl }
  65  | }
  66  | 
  67  | // ─── Helper: inject host token into localStorage before page loads ────────────
  68  | async function injectHostToken(page, roomId, hostToken) {
  69  |   // addInitScript runs before any page script — safe way to pre-seed localStorage
  70  |   await page.addInitScript(
  71  |     ({ id, token }) => {
  72  |       window.localStorage.setItem(`host_token_${id}`, token);
  73  |     },
  74  |     { id: roomId, token: hostToken }
  75  |   );
  76  | }
  77  | 
  78  | // ─── Helper: attach debug listeners to a page ────────────────────────────────
  79  | function attachDebugListeners(page, name) {
  80  |   page.on('console', msg => {
  81  |     if (msg.type() === 'error') {
  82  |       console.log(`❌ [${name} CONSOLE ERROR]: ${msg.text()}`);
  83  |     } else {
  84  |       console.log(`💬 [${name} CONSOLE]: ${msg.text()}`);
  85  |     }
  86  |   });
  87  | 
  88  |   page.on('pageerror', exception => {
  89  |     console.log(`🚨 [${name} PAGE CRASH]: ${exception.message}\nStack: ${exception.stack}`);
  90  |   });
  91  | }
  92  | 
  93  | // ─── Helper: fill display name and click "Join Room" ─────────────────────────
  94  | async function fillNameAndJoin(page, displayName) {
  95  |   // The input has id="display-name" and label text "Your Display Name"
  96  |   const nameInput = page.locator('#display-name');
> 97  |   await nameInput.waitFor({ state: 'visible', timeout: 30_000 });
      |                   ^ TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
  98  |   await nameInput.fill(displayName);
  99  | 
  100 |   // Click the submit button — text is "Join Room"
  101 |   await page.getByRole('button', { name: 'Join Room' }).click();
  102 |   console.log(`   ↳ Filled name "${displayName}" and clicked Join Room`);
  103 | }
  104 | 
  105 | // ─── Shared browser context options ──────────────────────────────────────────
  106 | const BROWSER_OPTS = {
  107 |   permissions: ['camera', 'microphone'],
  108 |   // Fake camera/mic so tests work headless without real hardware
  109 |   args: [
  110 |     '--use-fake-ui-for-media-stream',
  111 |     '--use-fake-device-for-media-stream',
  112 |     '--no-sandbox',
  113 |   ],
  114 | };
  115 | 
  116 | // ─────────────────────────────────────────────────────────────────────────────
  117 | // TEST SUITE A: HOST ADMITS GUEST
  118 | // ─────────────────────────────────────────────────────────────────────────────
  119 | test.describe('Lobby — Host ADMITS guest', () => {
  120 | 
  121 |   test('Guest enters lobby → Host sees notification → Host admits → Guest joins room', async ({ request, browser }) => {
  122 | 
  123 |     // ── STEP 1: Create room ─────────────────────────────────────────────────
  124 |     const { roomId, hostToken } = await createLobbyRoom(request);
  125 |     const roomUrl = `${BASE_URL}/room/${roomId}`;
  126 |     console.log(`\n🔗 Room URL (share this link): ${roomUrl}`);
  127 |     console.log(`🔑 Host token: ${hostToken}`);
  128 | 
  129 |     // ── STEP 2: HOST opens the room ─────────────────────────────────────────
  130 |     console.log('\n👑 [HOST] Opening browser...');
  131 |     const hostCtx = await browser.newContext(BROWSER_OPTS);
  132 |     const hostPage = await hostCtx.newPage();
  133 |     attachDebugListeners(hostPage, 'HOST');
  134 | 
  135 |     // Inject host token before navigation so localStorage is ready on load
  136 |     await injectHostToken(hostPage, roomId, hostToken);
  137 |     await hostPage.goto(roomUrl);
  138 |     console.log('👑 [HOST] Navigated to room URL');
  139 | 
  140 |     // ── STEP 3: HOST fills name and joins ───────────────────────────────────
  141 |     console.log('👑 [HOST] Filling name and joining...');
  142 |     await fillNameAndJoin(hostPage, 'Alice (Host)');
  143 | 
  144 |     // Host bypasses the waiting room (has hostToken) and enters directly
  145 |     // Wait for the main meeting UI toolbar to appear
  146 |     await expect(hostPage.locator('[aria-label="Toggle Camera"]'))
  147 |       .toBeVisible({ timeout: 20_000 });
  148 |     console.log('✅ [HOST] Inside the meeting room');
  149 | 
  150 |     // Screenshot: host in the empty room
  151 |     await hostPage.screenshot({
  152 |       path: path.join(SCREENSHOTS_DIR, '01-host-inside-room.png'),
  153 |     });
  154 | 
  155 |     // ── STEP 4: GUEST opens the same room URL ───────────────────────────────
  156 |     console.log('\n🙋 [GUEST] Opening browser...');
  157 |     const guestCtx = await browser.newContext(BROWSER_OPTS);
  158 |     const guestPage = await guestCtx.newPage();
  159 |     attachDebugListeners(guestPage, 'GUEST');
  160 |     await guestPage.goto(roomUrl);
  161 |     console.log('🙋 [GUEST] Navigated to room URL (no host token)');
  162 | 
  163 |     // ── STEP 5: GUEST fills name and clicks Join ────────────────────────────
  164 |     console.log('🙋 [GUEST] Filling name and clicking Join Room...');
  165 |     await fillNameAndJoin(guestPage, 'Bob (Guest)');
  166 | 
  167 |     // Guest has no host token → waitingRoom is enabled → sent to lobby
  168 |     // They should see the "Approval Pending" screen
  169 |     await expect(guestPage.getByText('Approval Pending'))
  170 |       .toBeVisible({ timeout: 15_000 });
  171 |     console.log('✅ [GUEST] Sees "Approval Pending" lobby screen');
  172 | 
  173 |     // Screenshot: guest waiting
  174 |     await guestPage.screenshot({
  175 |       path: path.join(SCREENSHOTS_DIR, '02-guest-waiting-lobby.png'),
  176 |     });
  177 | 
  178 |     // ── STEP 6: HOST sees the notification toast ────────────────────────────
  179 |     console.log('\n⏳ [HOST] Waiting for join request notification...');
  180 | 
  181 |     // The LobbyRequestToast appears in the top-right corner of the host page.
  182 |     // It contains the guest name and an "Admit" button.
  183 |     const admitBtn = hostPage.getByRole('button', { name: 'Admit' }).first();
  184 |     await expect(admitBtn).toBeVisible({ timeout: 20_000 });
  185 |     console.log('✅ [HOST] "Admit" button visible in notification toast');
  186 | 
  187 |     // Verify the guest's name appears in the toast
  188 |     await expect(hostPage.getByText('Bob (Guest)').first())
  189 |       .toBeVisible({ timeout: 5_000 });
  190 |     console.log('✅ [HOST] Toast shows correct guest name "Bob (Guest)"');
  191 | 
  192 |     // Screenshot: host seeing the notification
  193 |     await hostPage.screenshot({
  194 |       path: path.join(SCREENSHOTS_DIR, '03-host-sees-notification.png'),
  195 |     });
  196 | 
  197 |     // ── STEP 7: HOST clicks Admit ───────────────────────────────────────────
```