// ---------------------------------------------------------------
// promo/opnemen-hulp.js — maakt de schermafbeeldingen voor de drie
// uitlegfilmpjes op de hulppagina (installeren, training ontvangen,
// app vernieuwen).
//
// Vooraf: start de app lokaal met   python3 -m http.server 4173
// Uitvoeren:                        node promo/opnemen-hulp.js
// Resultaat: afbeeldingen in promo/shots/hulp/
// ---------------------------------------------------------------
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP = 'http://127.0.0.1:4173/';
const OUT = path.join(__dirname, 'shots', 'hulp');
// Ruimte bovenaan en onderaan zoals op een echte iPhone (notch en home-balk).
const IPHONE_CSS = ':root{--safe-top:50px;--safe-bottom:22px}';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
    locale: 'nl-BE',
    timezoneId: 'Europe/Brussels',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 93 });
  const iphone = () => page.addStyleTag({ content: IPHONE_CSS });
  const wait = (ms = 500) => page.waitForTimeout(ms);
  const addUser = async (name) => {
    await page.click('[data-action="new-user"]');
    await page.fill('.sheet input[name="name"]', name);
    await page.click('.sheet button[type="submit"]');
  };
  // Het midden van een knop, zodat de vinger in het filmpje juist tikt.
  const spot = (selector) =>
    page.evaluate((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), Math.round(r.width), Math.round(r.height)];
    }, selector);
  const places = {};
  // Een lange afbeelding van het hele scherm. De tabbalk laten we weg: die staat in het
  // filmpje als aparte afbeelding vast onderaan, terwijl de rest scrolt.
  const long = async (name) => {
    const hide = await page.addStyleTag({ content: '.tabbar{visibility:hidden}' });
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 93, fullPage: true });
    await hide.evaluate((node) => node.remove());
  };

  // ---- Het welkomscherm, zoals je het de eerste keer in Safari ziet ----
  await page.goto(APP);
  await iphone();
  await wait();
  await shot('welkom');

  // ---- Twee profielen: Emma deelt, Noah ontvangt ----
  await addUser('Emma');
  await page.click('[data-action="switch-user"]');
  await addUser('Noah');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('tabata-timer.v1'));
    d.users[1].color = '#87c7c6';
    const now = Date.now();
    const session = (id, name, hoursAgo, seconds) => ({ id, userId: d.users[1].id, workoutId: null, name, group: 'Cardio', at: now - hoursAgo * 3600000, seconds, planned: seconds, completed: true });
    d.sessions = [session('s1', 'HIIT 30/30', 3, 640), session('s2', 'Klassieke Tabata', 27, 240)];
    localStorage.setItem('tabata-timer.v1', JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('.workout');
  await iphone();
  await wait();
  await shot('home');
  // Het hele scherm in één lange afbeelding, om in het filmpje te kunnen scrollen.
  await long('home-lang');
  await page.screenshot({ path: path.join(OUT, 'tabs-home.jpg'), type: 'jpeg', quality: 93, clip: { x: 0, y: 754, width: 390, height: 90 } });

  // Het bericht dat Emma stuurt (een eigen training met vier oefeningen).
  const message = await page.evaluate(async () => {
    const share = await import('./js/share.js');
    const store = await import('./js/store.js');
    const workout = {
      name: 'Ochtendtabata', group: 'Cardio', prepare: 10, work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, cooldown: 0,
      exercises: ['squat', 'jumpingjack', 'plank', 'highknees'].map((id) => store.exerciseFromLibrary(id)),
    };
    const url = share.shareUrl(await share.encodeWorkout(workout, 'Emma')).replace(location.origin + location.pathname, 'https://timer.pvmtdankaerts.be/');
    return share.shareMessage({ name: workout.name, summary: '8 rondes · 20 s werk · 10 s rust, 4:00 min', from: 'Emma', url });
  });
  fs.writeFileSync(path.join(OUT, 'bericht.txt'), message);

  // ---- Training ontvangen ----
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait();
  await shot('home-onder');
  places.scrollHome = await page.evaluate(() => Math.round(window.scrollY));
  places.ontvangen = await spot('[data-action="receive-training"]');
  await page.evaluate((text) => navigator.clipboard.writeText(text), message);
  await page.click('[data-action="receive-training"]');
  await page.waitForSelector('[data-action="shared-add"]');
  await wait(700);
  await shot('ontvangen');
  places.toevoegen = await spot('[data-action="shared-add"]');
  await page.click('[data-action="shared-add"]');
  await page.waitForSelector('.toast');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait(350);
  await shot('home-nieuw');
  places.nieuweKaart = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.workout')].find((el) => el.textContent.includes('Ochtendtabata'));
    const r = card.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  });
  await wait(2600); // wachten tot de melding weg is

  // ---- App vernieuwen ----
  places.tabProfiel = await spot('[data-action="go"][data-view="profile"]');
  await page.click('[data-action="go"][data-view="profile"]');
  await wait(900);
  await shot('profiel');
  await long('profiel-lang');
  await page.screenshot({ path: path.join(OUT, 'tabs-profiel.jpg'), type: 'jpeg', quality: 93, clip: { x: 0, y: 754, width: 390, height: 90 } });
  await page.evaluate(() => document.querySelector('[data-action="refresh-app"]').scrollIntoView({ block: 'center' }));
  await wait();
  await shot('profiel-app');
  places.scrollProfiel = await page.evaluate(() => Math.round(window.scrollY));
  places.vernieuwen = await spot('[data-action="refresh-app"]');
  places.versie = await spot('[data-action="refresh-app"] small');

  fs.writeFileSync(path.join(OUT, 'plaatsen.json'), JSON.stringify(places, null, 2));
  console.log(JSON.stringify(places));
  await browser.close();
  console.log('Alle opnames staan in promo/shots/hulp');
})().catch((e) => {
  console.error('MISLUKT', e.message);
  process.exit(1);
});
