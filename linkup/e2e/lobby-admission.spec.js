// @ts-check
/**
 * LinkUp E2E — Lobby Admission & Denial Flows
 *
 * Scenario A — ADMIT:
 *   1. Create a room with Waiting Room enabled (via REST API)
 *   2. HOST  opens the room URL, enters name, joins the meeting
 *   3. GUEST opens the same room URL, enters name, clicks "Join Room"
 *   4. Guest lands on the "Approval Pending" screen
 *   5. Host sees the animated "Join Request" notification toast
 *   6. Host clicks "Admit" → guest is admitted into the room
 *   7. Guest's pending screen disappears; they enter the meeting
 *
 * Scenario B — DENY:
 *   Same setup, but host clicks "Decline" and guest is redirected
 *   back to the home page with ?error=denied.
 *
 * ─── Prerequisites ───────────────────────────────────────────────
 *   • npm run dev  (Next.js running on http://localhost:3000)
 *   • MongoDB accessible (same env as dev server)
 *
 * ─── Run ─────────────────────────────────────────────────────────
 *   npx playwright test e2e/lobby-admission.spec.js --headed
 *   npx playwright test e2e/lobby-admission.spec.js --headed --debug
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Ensure screenshot output directory exists
const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// ─── Helper: create a room via REST API ──────────────────────────────────────
async function createLobbyRoom(request, overrides = {}) {
  const body = {
    name: 'E2E Lobby Test Room',
    maxParticipants: 10,
    settings: {
      allowChat: true,
      allowScreenShare: true,
      waitingRoom: true,   // ← Must be true to enable the lobby gate
    },
    ...overrides,
  };

  console.log(`\n📡 POST ${BASE_URL}/api/rooms/create`);
  const res = await request.post(`${BASE_URL}/api/rooms/create`, {
    data: body,
    headers: { 'Content-Type': 'application/json' },
  });

  const json = await res.json();
  if (!res.ok() || !json.success) {
    throw new Error(`❌ Room creation failed: ${JSON.stringify(json)}`);
  }

  console.log(`✅ Room created — ID: ${json.roomId}`);
  return json; // { success, roomId, hostToken, roomUrl }
}

// ─── Helper: inject host token into localStorage before page loads ────────────
async function injectHostToken(page, roomId, hostToken) {
  // addInitScript runs before any page script — safe way to pre-seed localStorage
  await page.addInitScript(
    ({ id, token }) => {
      window.localStorage.setItem(`host_token_${id}`, token);
    },
    { id: roomId, token: hostToken }
  );
}

// ─── Helper: attach debug listeners to a page ────────────────────────────────
function attachDebugListeners(page, name) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ [${name} CONSOLE ERROR]: ${msg.text()}`);
    } else {
      console.log(`💬 [${name} CONSOLE]: ${msg.text()}`);
    }
  });

  page.on('pageerror', exception => {
    console.log(`🚨 [${name} PAGE CRASH]: ${exception.message}\nStack: ${exception.stack}`);
  });
}

// ─── Helper: fill display name and click "Join Room" ─────────────────────────
async function fillNameAndJoin(page, displayName) {
  // The input has id="display-name" and label text "Your Display Name"
  const nameInput = page.locator('#display-name');
  await nameInput.waitFor({ state: 'visible', timeout: 30_000 });
  await nameInput.fill(displayName);

  // Click the submit button — text is "Join Room"
  await page.getByRole('button', { name: 'Join Room' }).click();
  console.log(`   ↳ Filled name "${displayName}" and clicked Join Room`);
}

// ─── Shared browser context options ──────────────────────────────────────────
const BROWSER_OPTS = {
  permissions: ['camera', 'microphone'],
  // Fake camera/mic so tests work headless without real hardware
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--no-sandbox',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE A: HOST ADMITS GUEST
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Lobby — Host ADMITS guest', () => {

  test('Guest enters lobby → Host sees notification → Host admits → Guest joins room', async ({ request, browser }) => {

    // ── STEP 1: Create room ─────────────────────────────────────────────────
    const { roomId, hostToken } = await createLobbyRoom(request);
    const roomUrl = `${BASE_URL}/room/${roomId}`;
    console.log(`\n🔗 Room URL (share this link): ${roomUrl}`);
    console.log(`🔑 Host token: ${hostToken}`);

    // ── STEP 2: HOST opens the room ─────────────────────────────────────────
    console.log('\n👑 [HOST] Opening browser...');
    const hostCtx = await browser.newContext(BROWSER_OPTS);
    const hostPage = await hostCtx.newPage();
    attachDebugListeners(hostPage, 'HOST');

    // Inject host token before navigation so localStorage is ready on load
    await injectHostToken(hostPage, roomId, hostToken);
    await hostPage.goto(roomUrl);
    console.log('👑 [HOST] Navigated to room URL');

    // ── STEP 3: HOST fills name and joins ───────────────────────────────────
    console.log('👑 [HOST] Filling name and joining...');
    await fillNameAndJoin(hostPage, 'Alice (Host)');

    // Host bypasses the waiting room (has hostToken) and enters directly
    // Wait for the main meeting UI toolbar to appear
    await expect(hostPage.locator('[aria-label="Toggle Camera"]'))
      .toBeVisible({ timeout: 20_000 });
    console.log('✅ [HOST] Inside the meeting room');

    // Screenshot: host in the empty room
    await hostPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-host-inside-room.png'),
    });

    // ── STEP 4: GUEST opens the same room URL ───────────────────────────────
    console.log('\n🙋 [GUEST] Opening browser...');
    const guestCtx = await browser.newContext(BROWSER_OPTS);
    const guestPage = await guestCtx.newPage();
    attachDebugListeners(guestPage, 'GUEST');
    await guestPage.goto(roomUrl);
    console.log('🙋 [GUEST] Navigated to room URL (no host token)');

    // ── STEP 5: GUEST fills name and clicks Join ────────────────────────────
    console.log('🙋 [GUEST] Filling name and clicking Join Room...');
    await fillNameAndJoin(guestPage, 'Bob (Guest)');

    // Guest has no host token → waitingRoom is enabled → sent to lobby
    // They should see the "Approval Pending" screen
    await expect(guestPage.getByText('Approval Pending'))
      .toBeVisible({ timeout: 15_000 });
    console.log('✅ [GUEST] Sees "Approval Pending" lobby screen');

    // Screenshot: guest waiting
    await guestPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-guest-waiting-lobby.png'),
    });

    // ── STEP 6: HOST sees the notification toast ────────────────────────────
    console.log('\n⏳ [HOST] Waiting for join request notification...');

    // The LobbyRequestToast appears in the top-right corner of the host page.
    // It contains the guest name and an "Admit" button.
    const admitBtn = hostPage.getByRole('button', { name: 'Admit' }).first();
    await expect(admitBtn).toBeVisible({ timeout: 20_000 });
    console.log('✅ [HOST] "Admit" button visible in notification toast');

    // Verify the guest's name appears in the toast
    await expect(hostPage.getByText('Bob (Guest)').first())
      .toBeVisible({ timeout: 5_000 });
    console.log('✅ [HOST] Toast shows correct guest name "Bob (Guest)"');

    // Screenshot: host seeing the notification
    await hostPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-host-sees-notification.png'),
    });

    // ── STEP 7: HOST clicks Admit ───────────────────────────────────────────
    console.log('\n🖱️  [HOST] Clicking "Admit"...');
    await admitBtn.click();
    console.log('✅ [HOST] Clicked Admit');

    // ── STEP 8: GUEST is admitted into the room ─────────────────────────────
    console.log('\n⏳ [GUEST] Waiting to be admitted...');

    // "Approval Pending" screen should disappear
    await expect(guestPage.getByText('Approval Pending'))
      .not.toBeVisible({ timeout: 15_000 });
    console.log('✅ [GUEST] "Approval Pending" screen is gone');

    // Guest should now see the meeting toolbar (they're inside the room)
    await expect(guestPage.locator('[aria-label="Toggle Camera"]'))
      .toBeVisible({ timeout: 15_000 });
    console.log('✅ [GUEST] Now inside the meeting room!');

    // Screenshot: guest admitted
    await guestPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-guest-admitted.png'),
    });

    // ── STEP 9: HOST's participant count increases to 2 ─────────────────────
    // The top bar shows a participant badge like "2"
    await expect(hostPage.locator('span').filter({ hasText: /^2$/ }).first())
      .toBeVisible({ timeout: 10_000 });
    console.log('✅ [HOST] Participant count shows 2');

    // Screenshot: host + guest both in room
    await hostPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-both-in-room.png'),
    });

    console.log('\n🎉 ─────────────────────────────────────────────────────');
    console.log('🎉   LOBBY ADMISSION TEST PASSED!');
    console.log(`🎉   Screenshots → ${SCREENSHOTS_DIR}`);
    console.log('🎉 ─────────────────────────────────────────────────────\n');

    // Cleanup
    await hostCtx.close();
    await guestCtx.close();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE B: HOST DENIES GUEST
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Lobby — Host DENIES guest', () => {

  test('Guest enters lobby → Host sees notification → Host denies → Guest redirected home', async ({ request, browser }) => {

    // Create room
    const { roomId, hostToken } = await createLobbyRoom(request, { name: 'E2E Denial Test Room' });
    const roomUrl = `${BASE_URL}/room/${roomId}`;
    console.log(`\n🔗 Room URL: ${roomUrl}`);

    // HOST joins
    const hostCtx = await browser.newContext(BROWSER_OPTS);
    const hostPage = await hostCtx.newPage();
    attachDebugListeners(hostPage, 'HOST');
    await injectHostToken(hostPage, roomId, hostToken);
    await hostPage.goto(roomUrl);
    await fillNameAndJoin(hostPage, 'Alice (Host)');
    await expect(hostPage.locator('[aria-label="Toggle Camera"]')).toBeVisible({ timeout: 20_000 });
    console.log('✅ [HOST] Inside the meeting room');

    // GUEST requests to join
    const guestCtx = await browser.newContext(BROWSER_OPTS);
    const guestPage = await guestCtx.newPage();
    attachDebugListeners(guestPage, 'GUEST');
    await guestPage.goto(roomUrl);
    await fillNameAndJoin(guestPage, 'Charlie (Guest)');
    await expect(guestPage.getByText('Approval Pending')).toBeVisible({ timeout: 15_000 });
    console.log('✅ [GUEST] On "Approval Pending" screen');

    // Wait for deny button to appear
    const denyBtn = hostPage.getByRole('button', { name: /deny|decline/i }).first();
    await expect(denyBtn).toBeVisible({ timeout: 20_000 });
    console.log('✅ [HOST] "Deny/Decline" button visible');

    // Screenshot before denial
    await hostPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-host-deny-view.png'),
    });

    // HOST clicks Deny
    await denyBtn.click();
    console.log('✅ [HOST] Clicked Deny');

    // GUEST should be redirected to home page with ?error=denied
    await expect(guestPage).toHaveURL(/\?error=denied/, { timeout: 15_000 });
    console.log('✅ [GUEST] Redirected to home with ?error=denied');

    await guestPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-guest-denied-home.png'),
    });

    console.log('\n🎉 LOBBY DENIAL TEST PASSED!\n');

    await hostCtx.close();
    await guestCtx.close();
  });

});
