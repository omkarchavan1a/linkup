const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Create a room
    console.log('Creating room...');
    const createRes = await page.request.post('http://localhost:3000/api/rooms/create', {
      data: { name: 'Debug Room' }
    });
    const { roomId } = await createRes.json();
    console.log('Room ID:', roomId);

    // 2. Go to the room page
    const url = `http://localhost:3000/room/${roomId}`;
    console.log('Navigating to', url);
    await page.goto(url); // Don't use networkidle, it hangs on WebSockets
    await page.waitForTimeout(2000); // Wait 2s for React to hydrate

    // 3. Save the HTML
    const html = await page.content();
    fs.writeFileSync('debug-page.html', html);
    console.log('Saved to debug-page.html');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
