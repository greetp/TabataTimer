// ---------------------------------------------------------------
// promo/opnemen.js — maakt de schermafbeeldingen van de app die in
// het promofilmpje gebruikt worden.
//
// Vooraf: start de app lokaal met   python3 -m http.server 4173
// Uitvoeren:                        node promo/opnemen.js
// Resultaat: afbeeldingen in promo/shots/
//
// De app krijgt hier voorbeeldgegevens (Emma, Noah, Lotte), zodat er
// geen echte namen of sessies in het filmpje komen.
// ---------------------------------------------------------------
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP = 'http://127.0.0.1:4173/';
const OUT = path.join(__dirname, 'shots');
const FPS = 30;

// Ruimte bovenaan en onderaan zoals op een echte iPhone (notch en home-balk).
const IPHONE_CSS = ':root{--safe-top:50px;--safe-bottom:22px} .run.is-ending .ring-time{animation:none!important}';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', locale: 'nl-BE', timezoneId: 'Europe/Brussels' });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-11-18T09:41:00') });
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 93 });
  const settle = (ms = 450) => page.clock.runFor(ms).then(() => page.waitForTimeout(450));

  // ---- Voorbeeldgegevens ----
  await page.goto(APP);
  for (const name of ['Emma', 'Noah', 'Lotte']) {
    if (name !== 'Emma') await page.click('[data-action="switch-user"]');
    await page.click('[data-action="new-user"]');
    await page.fill('.sheet input[name="name"]', name);
    await page.click('.sheet button[type="submit"]');
  }
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('tabata-timer.v1'));
    const [emma, noah, lotte] = d.users;
    const colors = ['#174d50', '#87c7c6', '#c58f62'];
    d.users.forEach((u, i) => (u.color = colors[i]));
    d.activeUserId = emma.id;
    const now = Date.now();
    const mk = (i, userId, name, group, hoursAgo, seconds) => ({ id: 's' + i, userId, workoutId: null, name, group, at: now - hoursAgo * 3600000, seconds, planned: seconds, completed: true });
    d.sessions = [mk(1, emma.id, 'Klassieke Tabata', 'Cardio', 1.5, 240), mk(2, emma.id, 'Krachtcircuit', 'Kracht', 25, 1155), mk(3, emma.id, 'Klassieke Tabata', 'Cardio', 49, 240), mk(4, noah.id, 'HIIT 30/30', 'Cardio', 3, 640), mk(5, noah.id, 'Klassieke Tabata', 'Cardio', 27, 240), mk(6, lotte.id, 'Klassieke Tabata', 'Cardio', 5, 240)];
    // De Klassieke Tabata van Emma krijgt acht oefeningen uit de bibliotheek.
    const notes = { squat: 'Voeten op schouderbreedte. Zak door je knieën alsof je gaat zitten en hou je rug recht.', jumpingjack: 'Spring met je benen open en breng je armen boven je hoofd.', pushup: 'Handen onder je schouders, lichaam in één lijn. Op je knieën mag ook.', plank: 'Steun op je onderarmen en tenen. Span je buik aan en hou je lichaam recht.', lunge: 'Stap ver naar voren en zak tot beide knieën gebogen zijn. Wissel van been.', highknees: 'Loop ter plaatse en trek je knieën om de beurt hoog op.', mountainclimber: 'Start in plankhouding en trek om de beurt je knieën naar je borst.', burpee: 'Zak door je knieën, spring naar plankhouding, kom terug en spring omhoog.' };
    const names = { squat: 'Squats', jumpingjack: 'Jumping jacks', pushup: 'Push-ups', plank: 'Plank', lunge: 'Lunges', highknees: 'Knieheffen', mountainclimber: 'Mountain climbers', burpee: 'Burpees' };
    const tabata = d.workouts.find((w) => w.userId === emma.id && w.name === 'Klassieke Tabata');
    tabata.exercises = Object.keys(names).map((id, i) => ({ id: 'e' + i, name: names[id], note: notes[id], libraryId: id, imageId: null, video: '' }));
    tabata.prepare = 5;
    localStorage.setItem('tabata-timer.v1', JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('.workout');
  await page.addStyleTag({ content: IPHONE_CSS });

  // ---- Stilstaande schermen ----
  await settle(); await shot('home');
  await page.click('[data-action="switch-user"]'); await page.addStyleTag({ content: IPHONE_CSS }); await settle(); await shot('profielen');
  await page.click('[data-action="pick-user"] >> nth=0'); await settle();

  await page.click('[data-action="edit-workout"] >> nth=0'); await settle();
  await page.evaluate(() => document.querySelector('.list--fields').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -120)); await settle(); await shot('bewerken-tijden');
  await page.evaluate(() => document.querySelector('#exerciseList').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -110)); await settle(); await shot('bewerken-oefeningen');
  await page.click('[data-action="open-library"]'); await settle(700); await shot('bibliotheek'); await page.click('[data-action="sheet-close"]');
  await page.evaluate(() => document.querySelector('.edit-actions').scrollIntoView({ block: 'center' }));
  await page.click('[data-action="share-workout"]'); await page.waitForSelector('.message-preview'); await settle(700); await shot('delen'); await page.click('[data-action="sheet-close"]');
  await page.click('[data-action="cancel-edit"]'); await settle();
  await page.click('[data-action="go"][data-view="history"]'); await settle(); await shot('geschiedenis');
  await page.click('[data-action="go"][data-view="home"]'); await settle();

  // ---- De lopende timer, beeld per beeld ----
  // De klok van de app staat stil; wij zetten ze telkens 1/30 seconde verder en nemen een beeld.
  let frame = 0;
  const record = async (name, seconds) => {
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < Math.round(seconds * FPS); i++) {
      await page.clock.runFor(1000 / FPS);
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
    }
    frame++;
    console.log(name, 'klaar');
  };
  const skip = async (seconds) => { await page.clock.runFor(seconds * 1000); await page.waitForTimeout(500); };

  await page.clock.pauseAt(new Date('2026-11-18T09:42:00'));
  await page.click('[data-action="start-workout"] >> nth=0');
  await page.waitForSelector('.run'); await page.waitForTimeout(400);
  await skip(1.6);                       // voorbereiding: nog 3,4 s
  await record('timer-a', 8.0);          // 0:03 -> start "Squats" -> 0:16
  await skip(11.5);                      // naar 0:04 van het werk
  await record('timer-b', 8.5);          // 3-2-1 -> rust, "Hierna: Jumping jacks" -> 0:06
  await shot('timer-rust');

  // De uitleg van een oefening (tik op de kaart tijdens de rust).
  await page.click('[data-action="run-exercise"]'); await page.clock.runFor(600); await page.waitForTimeout(600); await shot('uitleg');

  await browser.close();
  console.log('Alle opnames staan in promo/shots');
})().catch((e) => { console.error('MISLUKT', e.message); process.exit(1); });
