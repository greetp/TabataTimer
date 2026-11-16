// promo/voorbeeld.js — maakt stilstaande beelden van het filmpje op gekozen momenten.
// Handig om snel te controleren zonder de hele video te maken.
// Gebruik:  node promo/voorbeeld.js staand 1.2 4 9.5      (layout, daarna de seconden)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const [layout = 'staand', ...times] = process.argv.slice(2);
  const size = layout === 'liggend' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
  const out = path.join(__dirname, 'voorbeeld'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:4173/promo/film.html?layout=${layout}`);
  await page.waitForFunction(() => window.READY === true);
  const film = await page.evaluate(() => window.FILM);
  console.log(layout, 'duur:', film.total.toFixed(1), 's |', film.scenes.map((s) => `${s.id}@${s.start.toFixed(1)}`).join(' '));
  for (const t of times) {
    await page.evaluate((t) => window.renderFrame(t), Number(t));
    await page.screenshot({ path: path.join(out, `${layout}-${String(t).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
  if (errors.length) console.log('FOUTEN:', errors);
  await browser.close();
})().catch((e) => { console.error('MISLUKT', e.message); process.exit(1); });
