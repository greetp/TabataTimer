// promo/voorbeeld.js — maakt stilstaande beelden van een filmpje op gekozen momenten.
// Handig om snel te controleren zonder de hele video te maken.
// Gebruik:  node promo/voorbeeld.js staand 1.2 4 9.5        (promofilm: staand of liggend)
//           node promo/voorbeeld.js installeren 2 6 11      (uitlegfilmpje: installeren, ontvangen of vernieuwen)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { FILMS } = require('./films.js');
(async () => {
  const [name = 'staand', ...times] = process.argv.slice(2);
  const film = FILMS[name];
  if (!film) throw new Error(`Onbekend filmpje "${name}". Kies uit: ${Object.keys(FILMS).join(', ')}`);
  const out = path.join(__dirname, 'voorbeeld'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: film.size, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:4173/promo/${film.page}`);
  await page.waitForFunction(() => window.READY === true);
  const info = await page.evaluate(() => window.FILM);
  console.log(name, 'duur:', info.total.toFixed(1), 's |', (info.scenes || info.shots).map((s) => `${s.id || s.shot}@${s.start.toFixed(1)}`).join(' '));
  for (const t of times) {
    await page.evaluate((t) => window.renderFrame(t), Number(t));
    await page.screenshot({ path: path.join(out, `${name}-${String(t).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
  if (errors.length) console.log('FOUTEN:', errors);
  await browser.close();
})().catch((e) => { console.error('MISLUKT', e.message); process.exit(1); });
