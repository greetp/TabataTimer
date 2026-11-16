// ---------------------------------------------------------------
// promo/maak-film.js — maakt van een filmpje (een webpagina) een video (mp4).
//
// Vooraf:
//   1. start de app lokaal:   python3 -m http.server 4173
//   2. maak de opnames:       node promo/opnemen.js        (voor het promofilmpje)
//                             node promo/opnemen-hulp.js   (voor de uitlegfilmpjes)
// Uitvoeren:
//   node promo/maak-film.js staand        -> promo/uit/tabata-timer-staand.mp4
//   node promo/maak-film.js liggend       -> promo/uit/tabata-timer-liggend.mp4
//   node promo/maak-film.js installeren   -> hulp/installeren.mp4 (+ .jpg als voorbeeld)
//   node promo/maak-film.js ontvangen     -> hulp/ontvangen.mp4
//   node promo/maak-film.js vernieuwen    -> hulp/vernieuwen.mp4
//
// Hoe het werkt: de pagina wordt beeld per beeld gevraagd hoe ze eruitziet
// op dat moment, daarvan wordt telkens een foto genomen, en ffmpeg plakt
// alle foto's aan elkaar tot een video. De lijst van filmpjes staat in films.js.
// ---------------------------------------------------------------
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { FILMS } = require('./films.js');

const WORKERS = 4; // zoveel beelden worden tegelijk gemaakt

(async () => {
  const name = process.argv[2] || 'staand';
  const film = FILMS[name];
  if (!film) throw new Error(`Onbekend filmpje "${name}". Kies uit: ${Object.keys(FILMS).join(', ')}`);
  const frames = path.join(__dirname, 'frames', name);
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  fs.mkdirSync(path.dirname(film.out), { recursive: true });

  const browser = await chromium.launch();
  const open = async () => {
    const page = await browser.newPage({ viewport: film.size, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('FOUT in de pagina:', e.message));
    await page.goto(`http://127.0.0.1:4173/promo/${film.page}`);
    await page.waitForFunction(() => window.READY === true);
    return page;
  };
  const pages = await Promise.all(Array.from({ length: WORKERS }, open));
  const { total, fps } = await pages[0].evaluate(() => window.FILM);
  const count = Math.round(total * fps);
  console.log(`${name}: ${count} beelden (${total.toFixed(1)} s)`);

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

  // "scale" maakt de video kleiner (minder megabytes), bv. 720 pixels breed voor op de hulppagina.
  const filters = film.scale ? ['-vf', `scale=${film.scale}:-2:flags=lanczos`] : [];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, '%05d.jpg'), ...filters, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(film.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', film.out]);

  // Het stilstaande voorbeeld dat je ziet vóór je op afspelen tikt.
  if (film.poster !== undefined) {
    const still = path.join(frames, `${String(Math.round(film.poster * fps)).padStart(5, '0')}.jpg`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', still, ...filters, '-q:v', '4', film.out.replace(/\.mp4$/, '.jpg')]);
  }
  fs.rmSync(frames, { recursive: true, force: true });
  console.log(`klaar: ${film.out} (${(fs.statSync(film.out).size / 1e6).toFixed(2)} MB)`);
})().catch((e) => { console.error('MISLUKT', e.message); process.exit(1); });
