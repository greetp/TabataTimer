// ---------------------------------------------------------------
// promo/maak-film.js — maakt van promo/film.html een video (mp4).
//
// Vooraf:
//   1. start de app lokaal:   python3 -m http.server 4173
//   2. maak de opnames:       node promo/opnemen.js
// Uitvoeren:
//   node promo/maak-film.js staand      -> promo/uit/tabata-timer-staand.mp4   (1080 x 1920)
//   node promo/maak-film.js liggend     -> promo/uit/tabata-timer-liggend.mp4  (1920 x 1080)
//
// Hoe het werkt: de pagina wordt beeld per beeld gevraagd hoe ze eruitziet
// op dat moment, daarvan wordt telkens een foto genomen, en ffmpeg plakt
// alle foto's aan elkaar tot een video.
// ---------------------------------------------------------------
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORKERS = 4; // zoveel beelden worden tegelijk gemaakt

(async () => {
  const layout = process.argv[2] === 'liggend' ? 'liggend' : 'staand';
  const size = layout === 'liggend' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
  const frames = path.join(__dirname, 'frames', layout);
  const out = path.join(__dirname, 'uit');
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  const open = async () => {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('FOUT in de pagina:', e.message));
    await page.goto(`http://127.0.0.1:4173/promo/film.html?layout=${layout}`);
    await page.waitForFunction(() => window.READY === true);
    return page;
  };
  const pages = await Promise.all(Array.from({ length: WORKERS }, open));
  const { total, fps } = await pages[0].evaluate(() => window.FILM);
  const count = Math.round(total * fps);
  console.log(`${layout}: ${count} beelden (${total.toFixed(1)} s)`);

  let next = 0;
  const started = Date.now();
  await Promise.all(
    pages.map(async (page) => {
      for (;;) {
        const i = next++;
        if (i >= count) return;
        await page.evaluate((t) => window.renderFrame(t), i / fps);
        await page.screenshot({ path: path.join(frames, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
        if (i % 300 === 0) console.log(`  beeld ${i} van ${count}`);
      }
    })
  );
  await browser.close();
  console.log(`beelden klaar in ${Math.round((Date.now() - started) / 1000)} s; nu de video maken`);

  const file = path.join(out, `tabata-timer-${layout}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file]);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log(`klaar: ${file} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
})().catch((e) => { console.error('MISLUKT', e.message); process.exit(1); });
