// ---------------------------------------------------------------
// app.js — alle schermen van de app en wat er gebeurt als je tikt.
//
// Opbouw van dit bestand:
//   1. Hulpfuncties en iconen
//   2. De schermen (gebruikers, trainingen, geschiedenis, profiel)
//   3. Training bewerken
//   4. De lopende timer
//   5. Pop-ups ("sheets") en meldingen
//   6. Acties: wat gebeurt er bij een tik op een knop
// ---------------------------------------------------------------

import { store, AVATAR_COLORS, readBackup, newId, cleanUrl, exerciseFromLibrary } from './store.js';
import { images, shrinkImage } from './images.js';
import { LIBRARY, LIBRARY_GROUPS, libraryImage } from './library.js';
import { buildPhases, totalSeconds, formatTime, Runner, PHASE_LABELS } from './timer.js';
import { sound } from './sound.js';
import { encodeWorkout, decodeWorkout, shareUrl, shareMessage } from './share.js';

const app = document.getElementById('app');

// ---- Versie en bijwerken ----
// Het versienummer staat in version.json. Bij het openen onthouden we welke
// versie geladen is. Komt de app later weer naar voren en staat er online een
// ander nummer, dan herladen we de app zodat je de nieuwste versie krijgt.
let loadedVersion = null; // de versie die nu draait
let updatePending = false; // er is een nieuwe versie, maar nu herladen zou storen

async function fetchVersion() {
  try {
    const response = await fetch('version.json', { cache: 'no-store' });
    return response.ok ? String((await response.json()).version) : null;
  } catch (err) {
    return null; // geen internet
  }
}

// Herlaadt de app, maar niet midden in een training, tijdens het bewerken of met een pop-up open.
function reloadWhenSafe() {
  if (run || ui.view === 'edit' || document.querySelector('.sheet-backdrop')) {
    updatePending = true;
    return;
  }
  location.reload();
}

async function checkForUpdate() {
  const latest = await fetchVersion();
  if (latest && loadedVersion && latest !== loadedVersion) reloadWhenSafe();
}

// Wat er nu op het scherm staat.
const ui = {
  view: 'users', // users | home | history | profile | edit
  historyScope: 'me', // me | all
  draft: null, // de training die je aan het bewerken bent
  expandedUsers: new Set(), // gebruikers waarvan alle sessies getoond worden
};

// ============ 1. Hulpfuncties en iconen ============

// Maakt tekst van de gebruiker veilig om in HTML te zetten.
const esc = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const line = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const solid = (paths) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${paths}</svg>`;

const icon = {
  play: solid('<path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.4-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z"/>'),
  pause: solid('<rect x="6" y="5" width="4.2" height="14" rx="1.3"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3"/>'),
  next: solid('<path d="M5 6.2v11.6a.8.8 0 0 0 1.25.66L14.5 12.7a.8.8 0 0 0 0-1.32L6.25 5.54A.8.8 0 0 0 5 6.2z"/><rect x="16.4" y="5" width="2.8" height="14" rx="1.2"/>'),
  prev: solid('<path d="M19 6.2v11.6a.8.8 0 0 1-1.25.66L9.5 12.7a.8.8 0 0 1 0-1.32l8.25-5.84A.8.8 0 0 1 19 6.2z"/><rect x="4.8" y="5" width="2.8" height="14" rx="1.2"/>'),
  close: line('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: line('<path d="M12 5v14M5 12h14"/>'),
  minus: line('<path d="M5 12h14"/>'),
  back: line('<path d="M15 5l-7 7 7 7"/>'),
  pencil: line('<path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z"/>'),
  trash: line('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>'),
  copy: line('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  timer: line('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 3h5"/>'),
  history: line('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  user: line('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  soundOn: line('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/>'),
  soundOff: line('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM16 9.5l5 5M21 9.5l-5 5"/>'),
  image: line('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>'),
  info: line('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>'),
  chevron: line('<path d="M9 5l7 7-7 7"/>'),
  up: line('<path d="M6 14.5l6-6 6 6"/>'),
  down: line('<path d="M6 9.5l6 6 6-6"/>'),
  refresh: line('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>'),
  exportFile: line('<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
  importFile: line('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
};

// 20 -> "20 s", 95 -> "1:35"
const shortTime = (s) => (s < 60 ? `${s} s` : formatTime(s));

// 750 -> "12 min", 4000 -> "1 u 07 min"
function longTime(seconds) {
  if (seconds <= 0) return '0 min';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} u ${String(minutes % 60).padStart(2, '0')} min`;
}

// Lichte kleuren krijgen een donkere letter, zodat die leesbaar blijft.
const LIGHT_COLORS = ['#87c7c6'];
const avatar = (user, size = '') =>
  `<span class="avatar ${size} ${LIGHT_COLORS.includes(user.color) ? 'avatar--light' : ''}" style="background:${esc(user.color)}">${esc(user.name.trim().charAt(0).toUpperCase() || '?')}</span>`;

// De afbeelding van een oefening: eerst de eigen foto, anders de tekening uit de bibliotheek.
const exerciseImage = (exercise) => images.get(exercise.imageId) || libraryImage(exercise.libraryId);

const startOfDay = (time) => new Date(time).setHours(0, 0, 0, 0);

function dayLabel(time) {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(time)) / 86400000);
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Gisteren';
  return new Date(time).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Maandag 00:00 van de huidige week.
function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function stats(sessions) {
  const week = sessions.filter((s) => s.at >= startOfWeek());
  return {
    count: sessions.length,
    seconds: sessions.reduce((sum, s) => sum + s.seconds, 0),
    weekCount: week.length,
    weekSeconds: week.reduce((sum, s) => sum + s.seconds, 0),
  };
}

function workoutSummary(w) {
  const parts = [`${w.rounds} ${w.rounds === 1 ? 'ronde' : 'rondes'}`, `${shortTime(w.work)} werk`, `${shortTime(w.rest)} rust`];
  if (w.sets > 1) parts.push(`${w.sets} sets`);
  return parts.join(' · ');
}

// ============ 2. De schermen ============

function render() {
  const user = store.activeUser();
  if (!user) ui.view = 'users';
  const views = { users: viewUsers, home: viewHome, history: viewHistory, profile: viewProfile, edit: viewEdit };
  app.innerHTML = views[ui.view](user);
  if (ui.view === 'edit') refreshEditor();
  window.scrollTo(0, 0);
}

function go(view) {
  ui.view = view;
  if (!ui.draft) images.keepOnly(store.imageIds()); // foto's die nergens meer gebruikt worden opruimen
  render();
  if (updatePending) reloadWhenSafe(); // een uitgestelde update nu toepassen
}

function tabBar(active) {
  const tab = (view, label, svg) =>
    `<button class="tab ${active === view ? 'is-active' : ''}" data-action="go" data-view="${view}" ${active === view ? 'aria-current="page"' : ''}>${svg}<span>${label}</span></button>`;
  return `<nav class="tabbar" aria-label="Hoofdmenu">
    ${tab('home', 'Trainingen', icon.timer)}
    ${tab('history', 'Geschiedenis', icon.history)}
    ${tab('profile', 'Profiel', icon.user)}
  </nav>`;
}

// ---- Scherm: wie traint er? ----
function viewUsers() {
  const users = store.users();
  const cards = users
    .map((u) => {
      const count = store.sessionsFor(u.id).length;
      return `<button class="user-card" data-action="pick-user" data-id="${u.id}">
        ${avatar(u, 'avatar--lg')}
        <strong>${esc(u.name)}</strong>
        <small>${count} ${count === 1 ? 'sessie' : 'sessies'}</small>
      </button>`;
    })
    .join('');

  return `<main class="screen screen--hero">
    <img class="logo" src="assets/logo-pvmt.png" alt="PVMT" width="113" height="50" />
    <p class="eyebrow">Tabata &amp; HIIT timer</p>
    <h1 class="title">${users.length ? 'Wie traint er vandaag?' : 'Welkom. Wie ben jij?'}</h1>
    <p class="lead">${
      users.length
        ? 'Kies je profiel. Je eigen trainingen en sessies staan voor je klaar.'
        : 'Maak een profiel aan. Zo houdt iedereen zijn eigen trainingen en sessies bij.'
    }</p>
    <div class="user-grid">
      ${cards}
      <button class="user-card user-card--new" data-action="new-user">
        <span class="avatar avatar--lg avatar--ghost">${icon.plus}</span>
        <strong>Nieuw profiel</strong>
        <small>Toevoegen</small>
      </button>
    </div>
  </main>`;
}

// ---- Scherm: trainingen van de gekozen gebruiker ----
function viewHome(user) {
  const workouts = store.workoutsFor(user.id);
  const week = stats(store.sessionsFor(user.id));
  const groups = store.groupsFor(user.id);

  const card = (w) => `<article class="workout">
      <button class="workout-main" data-action="edit-workout" data-id="${w.id}" aria-label="${esc(w.name)} bewerken">
        <h3>${esc(w.name)}</h3>
        <p>${workoutSummary(w)}</p>
        <span class="pill">${formatTime(totalSeconds(w))} min</span>
        ${w.exercises?.length ? `<span class="pill pill--muted">${plural(w.exercises.length, 'oefening', 'oefeningen')}</span>` : ''}
      </button>
      <button class="round-btn round-btn--primary" data-action="start-workout" data-id="${w.id}" aria-label="${esc(w.name)} starten">${icon.play}</button>
    </article>`;

  // Trainingen per groep tonen; trainingen zonder groep komen onderaan.
  const sections = [...groups, ''].map((group) => {
    const items = workouts.filter((w) => (w.group || '') === group);
    if (!items.length) return '';
    const heading = group || (groups.length ? 'Zonder groep' : 'Mijn trainingen');
    return `<section class="group">
      <h2 class="eyebrow">${esc(heading)}</h2>
      ${items.map(card).join('')}
    </section>`;
  });

  return `<main class="screen screen--hero screen--tabs">
    <header class="topline">
      <div>
        <p class="eyebrow">Hallo ${esc(user.name)}</p>
        <h1 class="title">Klaar voor je training?</h1>
      </div>
      <button class="avatar-btn" data-action="switch-user" aria-label="Wissel van gebruiker">${avatar(user)}</button>
    </header>

    <button class="weekcard" data-action="go" data-view="history" aria-label="Bekijk of corrigeer je sessies">
      <span class="weekcard-cell"><strong>${week.weekCount}</strong><small>${week.weekCount === 1 ? 'sessie' : 'sessies'} deze week</small></span>
      <span class="weekcard-cell"><strong>${longTime(week.weekSeconds)}</strong><small>in beweging</small></span>
      <span class="weekcard-more">${icon.chevron}</span>
    </button>

    ${
      workouts.length
        ? sections.join('')
        : `<div class="empty"><p>Je hebt nog geen trainingen. Maak er hieronder een aan.</p></div>`
    }

    <button class="button button--secondary button--wide" data-action="new-workout">${icon.plus} Nieuwe training</button>
    <button class="button button--secondary button--wide" data-action="receive-training">${icon.importFile} Training ontvangen</button>
  </main>
  ${tabBar('home')}`;
}

// ---- Scherm: geschiedenis ----
function sessionRow(s) {
  const time = new Date(s.at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  return `<button class="session" data-action="session-menu" data-id="${s.id}">
    <span class="session-time">${time}</span>
    <span class="session-body">
      <strong>${esc(s.name)}</strong>
      <small>${s.group ? esc(s.group) + ' · ' : ''}${s.completed ? 'Afgewerkt' : 'Voortijdig gestopt'}</small>
    </span>
    <span class="pill ${s.completed ? '' : 'pill--muted'}">${longTime(s.seconds)}</span>
  </button>`;
}

// Sessies van één gebruiker, gegroepeerd per dag.
function sessionsByDay(sessions) {
  let html = '';
  let currentDay = null;
  for (const s of sessions) {
    const day = startOfDay(s.at);
    if (day !== currentDay) {
      if (currentDay !== null) html += '</div>';
      html += `<h3 class="day">${dayLabel(s.at)}</h3><div class="list">`;
      currentDay = day;
    }
    html += sessionRow(s);
  }
  return html ? html + '</div>' : '';
}

function statTiles(st) {
  return `<div class="tiles">
    <div class="tile"><strong>${st.count}</strong><span>${st.count === 1 ? 'sessie' : 'sessies'}</span></div>
    <div class="tile"><strong>${longTime(st.seconds)}</strong><span>totale tijd</span></div>
    <div class="tile"><strong>${st.weekCount}</strong><span>deze week</span></div>
  </div>`;
}

function viewHistory(user) {
  const scopeButton = (scope, label) =>
    `<button class="${ui.historyScope === scope ? 'is-active' : ''}" data-action="history-scope" data-scope="${scope}">${label}</button>`;

  let body;
  if (ui.historyScope === 'me') {
    const sessions = store.sessionsFor(user.id);
    body =
      statTiles(stats(sessions)) +
      `<div class="history-actions">
        <button class="link" data-action="add-session">${icon.plus} Sessie toevoegen</button>
        ${sessions.length ? `<button class="link link--danger" data-action="reset-history">${icon.trash} Sessies wissen</button>` : ''}
      </div>` +
      (sessionsByDay(sessions) ||
        `<div class="empty"><p>Nog geen sessies. Na je eerste training verschijnt ze hier.</p></div>`) +
      (sessions.length ? `<p class="muted hint">Tip: tik op een sessie om de naam, het tijdstip of de duur aan te passen.</p>` : '');
  } else {
    // Iedereen: één blok per gebruiker.
    body = store
      .users()
      .map((u) => {
        const sessions = store.sessionsFor(u.id);
        const st = stats(sessions);
        const showAll = ui.expandedUsers.has(u.id);
        const visible = showAll ? sessions : sessions.slice(0, 3);
        return `<section class="usergroup">
          <header class="usergroup-head">
            ${avatar(u)}
            <div>
              <strong>${esc(u.name)}${u.id === user.id ? ' <em>(jij)</em>' : ''}</strong>
              <small>${st.count} ${st.count === 1 ? 'sessie' : 'sessies'} · ${longTime(st.seconds)} · ${st.weekCount} deze week</small>
            </div>
          </header>
          ${
            sessions.length
              ? sessionsByDay(visible)
              : `<p class="muted">Nog geen sessies.</p>`
          }
          ${
            sessions.length > 3
              ? `<button class="link" data-action="toggle-user-sessions" data-id="${u.id}">${showAll ? 'Toon minder' : `Toon alle ${sessions.length} sessies`}</button>`
              : ''
          }
        </section>`;
      })
      .join('');
  }

  return `<main class="screen screen--tabs">
    <p class="eyebrow">Geschiedenis</p>
    <h1 class="title">${ui.historyScope === 'me' ? 'Jouw sessies' : 'Alle sessies'}</h1>
    <div class="segmented" role="group" aria-label="Welke sessies tonen">
      ${scopeButton('me', 'Ik')}
      ${scopeButton('all', 'Iedereen')}
    </div>
    ${body}
  </main>
  ${tabBar('history')}`;
}

// ---- Scherm: profiel en instellingen ----
function viewProfile(user) {
  const settings = store.settings();
  const others = store.users().filter((u) => u.id !== user.id);
  const toggle = (key, title, text) => `<button class="row" role="switch" aria-checked="${settings[key]}" data-action="toggle-setting" data-key="${key}">
      <span class="row-body"><strong>${title}</strong><small>${text}</small></span>
      <span class="switch"></span>
    </button>`;

  return `<main class="screen screen--tabs">
    <p class="eyebrow">Profiel</p>
    <div class="profile-head">
      ${avatar(user, 'avatar--lg')}
      <div>
        <h1 class="title title--sm">${esc(user.name)}</h1>
        <small class="muted">Profiel sinds ${new Date(user.createdAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
      </div>
    </div>
    <button class="button button--secondary button--wide" data-action="edit-user">${icon.pencil} Naam of kleur wijzigen</button>

    <h2 class="eyebrow section-gap">Geluid</h2>
    <div class="list">
      ${toggle('sound', 'Geluidssignalen', 'Piepjes bij 3, 2, 1 en bij elke nieuwe fase')}
      ${toggle('halfway', 'Signaal halverwege', 'Twee korte piepjes op de helft van elke werkfase')}
      ${sound.canPlayWhenSilent ? toggle('silentMode', 'Ook in stille modus', 'Piepjes blijven hoorbaar als je iPhone op stil staat. Andere muziek kan hierdoor pauzeren.') : ''}
      ${toggle('voice', 'Gesproken aanwijzingen', 'Een stem zegt de oefening, "Rust" en "Halverwege"')}
      <button class="row" data-action="test-sound">
        <span class="avatar avatar--ghost avatar--plain">${icon.soundOn}</span>
        <span class="row-body"><strong>Geluid testen</strong><small>Speelt de piepjes af, zodat je hoort of het werkt</small></span>
      </button>
    </div>

    <h2 class="eyebrow section-gap">Gebruikers</h2>
    <div class="list">
      ${others
        .map(
          (u) => `<button class="row" data-action="pick-user" data-id="${u.id}">
            ${avatar(u)}
            <span class="row-body"><strong>${esc(u.name)}</strong><small>Wissel naar dit profiel</small></span>
          </button>`
        )
        .join('')}
      <button class="row" data-action="new-user">
        <span class="avatar avatar--ghost">${icon.plus}</span>
        <span class="row-body"><strong>Nieuw profiel</strong><small>Voor iemand anders die meetraint</small></span>
      </button>
    </div>

    <h2 class="eyebrow section-gap">Reservekopie</h2>
    <div class="list">
      <button class="row" data-action="export-data">
        <span class="avatar avatar--ghost avatar--plain">${icon.exportFile}</span>
        <span class="row-body"><strong>Gegevens exporteren</strong><small>Bewaar alle profielen, trainingen en sessies in een bestand</small></span>
      </button>
      <button class="row" data-action="import-data">
        <span class="avatar avatar--ghost avatar--plain">${icon.importFile}</span>
        <span class="row-body"><strong>Gegevens importeren</strong><small>Zet een reservekopie terug op dit toestel</small></span>
      </button>
    </div>

    <h2 class="eyebrow section-gap">App</h2>
    <div class="list">
      <button class="row" data-action="refresh-app">
        <span class="avatar avatar--ghost avatar--plain">${icon.refresh}</span>
        <span class="row-body"><strong>App vernieuwen</strong><small>Haalt de nieuwste versie op${loadedVersion ? ` · nu versie ${esc(loadedVersion)}` : ''}</small></span>
      </button>
    </div>

    <button class="link link--danger" data-action="delete-user">Dit profiel verwijderen</button>
  </main>
  ${tabBar('profile')}`;
}

// ============ 3. Training bewerken ============

// De instelbare onderdelen van een training, in de volgorde van het scherm.
const FIELDS = [
  { key: 'prepare', label: 'Voorbereiding', hint: 'Tijd om klaar te staan', kind: 'time', min: 0, max: 3600 },
  { key: 'work', label: 'Werk', hint: 'Zo lang geef je alles', kind: 'time', min: 1, max: 3600 },
  { key: 'rest', label: 'Rust', hint: 'Pauze na elke ronde', kind: 'time', min: 0, max: 3600 },
  { key: 'rounds', label: 'Rondes', hint: 'Aantal keer werk + rust', kind: 'count', min: 1, max: 99 },
  { key: 'sets', label: 'Sets', hint: 'Herhaal alle rondes', kind: 'count', min: 1, max: 20 },
  { key: 'setRest', label: 'Rust tussen sets', hint: 'Langere pauze na elke set', kind: 'time', min: 0, max: 3600 },
  { key: 'cooldown', label: 'Cooling-down', hint: 'Rustig uitbewegen', kind: 'time', min: 0, max: 3600 },
];
const DOTS = { prepare: 'prepare', work: 'work', rest: 'rest', setRest: 'rest', cooldown: 'cooldown' };

function newDraft(userId) {
  return { userId, name: '', group: '', prepare: 10, work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, cooldown: 0, exercises: [] };
}

function viewEdit(user) {
  const d = ui.draft;
  const groups = store.groupsFor(user.id);

  const field = (f) => `<div class="field" data-field="${f.key}">
      <div class="field-label">
        ${DOTS[f.key] ? `<span class="dot dot--${DOTS[f.key]}"></span>` : '<span class="dot dot--none"></span>'}
        <div><strong>${f.label}</strong><small>${f.hint}</small></div>
      </div>
      <div class="stepper">
        <button type="button" class="step" data-step="-1" data-key="${f.key}" aria-label="${f.label} verlagen">${icon.minus}</button>
        <input class="step-value" data-input="${f.key}" inputmode="${f.kind === 'time' ? 'text' : 'numeric'}" autocomplete="off" aria-label="${f.label}" />
        <button type="button" class="step" data-step="1" data-key="${f.key}" aria-label="${f.label} verhogen">${icon.plus}</button>
      </div>
    </div>`;

  return `<main class="screen screen--edit">
    <header class="navbar">
      <button class="round-btn" data-action="cancel-edit" aria-label="Terug">${icon.back}</button>
      <p class="eyebrow">${d.id ? 'Training bewerken' : 'Nieuwe training'}</p>
      <span class="navbar-spacer"></span>
    </header>

    <label class="textfield">
      <span>Naam</span>
      <input id="draftName" type="text" maxlength="40" placeholder="Bijvoorbeeld: Ochtend-tabata" value="${esc(d.name)}" autocomplete="off" />
    </label>

    <label class="textfield">
      <span>Groep <em>(optioneel)</em></span>
      <input id="draftGroup" type="text" maxlength="30" placeholder="Bijvoorbeeld: Cardio, Kracht, Benen" value="${esc(d.group)}" autocomplete="off" />
    </label>
    ${
      groups.length
        ? `<div class="chips">${groups.map((g) => `<button type="button" class="chip" data-action="pick-group" data-group="${esc(g)}">${esc(g)}</button>`).join('')}</div>`
        : ''
    }

    <h2 class="eyebrow section-gap">Intervallen</h2>
    <div class="list list--fields">${FIELDS.map(field).join('')}</div>
    <p class="muted hint">Tip: tik op een getal om het zelf in te typen, of hou + of − ingedrukt.</p>

    <h2 class="eyebrow section-gap">Oefeningen</h2>
    <div id="exerciseList"></div>
    <button class="button button--secondary button--wide" data-action="open-library">${icon.plus} Oefening toevoegen</button>
    <p class="muted hint" id="exerciseHint"></p>

    ${
      d.id
        ? `<div class="edit-actions">
            <button class="link" data-action="share-workout">${icon.exportFile} Delen</button>
            <button class="link" data-action="duplicate-workout">${icon.copy} Dupliceren</button>
            <button class="link link--danger" data-action="delete-workout">${icon.trash} Verwijderen</button>
          </div>`
        : ''
    }
  </main>

  <footer class="savebar">
    <div class="savebar-info">
      <span>Totale tijd</span>
      <strong id="draftTotal"></strong>
    </div>
    <div class="timeline" id="draftTimeline" aria-hidden="true"></div>
    <div class="savebar-buttons">
      <button class="button button--secondary" data-action="save-workout">Opslaan</button>
      <button class="button button--primary" data-action="save-and-start">${icon.play} Opslaan en starten</button>
    </div>
  </footer>`;
}

// Werkt de getallen, de totale tijd en de tijdlijn bij zonder het hele scherm
// opnieuw te tekenen (anders zou je de cursor in het naamveld verliezen).
function refreshEditor() {
  const d = ui.draft;
  for (const f of FIELDS) {
    const input = app.querySelector(`[data-input="${f.key}"]`);
    if (input && document.activeElement !== input) input.value = f.kind === 'time' ? formatTime(d[f.key]) : d[f.key];
  }
  // "Rust tussen sets" heeft alleen zin bij meer dan één set.
  app.querySelector('[data-field="setRest"]').hidden = d.sets < 2;

  const phases = buildPhases(d);
  app.querySelector('#draftTotal').textContent = `${formatTime(phases.reduce((sum, p) => sum + p.duration, 0))} min`;
  app.querySelector('#draftTimeline').innerHTML =
    phases.length <= 160 ? phases.map((p) => `<i class="seg seg--${p.type}" style="flex-grow:${p.duration}"></i>`).join('') : '<i class="seg seg--work" style="flex-grow:1"></i>';

  refreshExercises();
}

// Tekent de lijst met oefeningen op het bewerkscherm.
function refreshExercises() {
  const d = ui.draft;
  const list = d.exercises || (d.exercises = []);
  const count = list.length;

  const row = (e, i) => {
    const src = exerciseImage(e);
    const details = [e.note || 'Geen uitleg', e.video ? 'met filmpje' : ''].filter(Boolean).join(' · ');
    return `<div class="exercise">
      <button class="exercise-main" data-action="edit-exercise" data-id="${e.id}" aria-label="${esc(e.name)} bewerken">
        ${src ? `<img class="thumb" src="${esc(src)}" alt="" />` : `<span class="thumb thumb--empty">${i + 1}</span>`}
        <span class="row-body"><strong>${esc(e.name)}</strong><small>${esc(details)}</small></span>
      </button>
      ${
        count > 1
          ? `<button class="step step--sm" data-action="move-exercise" data-id="${e.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(e.name)} omhoog">${icon.up}</button>
             <button class="step step--sm" data-action="move-exercise" data-id="${e.id}" data-dir="1" ${i === count - 1 ? 'disabled' : ''} aria-label="${esc(e.name)} omlaag">${icon.down}</button>`
          : ''
      }
    </div>`;
  };
  app.querySelector('#exerciseList').innerHTML = count ? `<div class="list list--exercises">${list.map(row).join('')}</div>` : '';

  // Uitleg over hoe oefeningen en rondes samenhangen.
  const rounds = d.rounds;
  let hint;
  if (!count) hint = 'Voeg oefeningen toe als je tijdens de timer wil zien wat je moet doen. Zonder oefeningen toont de timer gewoon "Werk".';
  else if (count === rounds) hint = 'Elke ronde heeft haar eigen oefening.';
  else if (count < rounds) hint = `Je hebt ${plural(rounds, 'ronde', 'rondes')} en ${plural(count, 'oefening', 'oefeningen')}. De oefeningen herhalen zich in dezelfde volgorde.`;
  else hint = `Je hebt ${plural(count, 'oefening', 'oefeningen')} maar ${plural(rounds, 'ronde', 'rondes')}. Alleen de eerste ${rounds} ${rounds === 1 ? 'wordt' : 'worden'} gebruikt.`;
  if (count && count !== rounds && count <= 99) hint += ` <button class="link link--inline" data-action="match-rounds">Zet het aantal rondes op ${count}</button>`;
  app.querySelector('#exerciseHint').innerHTML = hint;
}

const clamp = (value, f) => Math.min(f.max, Math.max(f.min, value));

function stepField(key, direction) {
  const f = FIELDS.find((x) => x.key === key);
  const value = ui.draft[key];
  let next;
  if (f.kind === 'time') {
    // Tijden gaan per 5 seconden omhoog of omlaag.
    next = direction > 0 ? Math.floor(value / 5) * 5 + 5 : Math.ceil(value / 5) * 5 - 5;
  } else {
    next = value + direction;
  }
  ui.draft[key] = clamp(next, f);
  refreshEditor();
}

// "1:30" -> 90, "45" -> 45
function parseTime(text) {
  const parts = text.trim().split(/[:.,]/).map((p) => parseInt(p, 10) || 0);
  return parts.length > 1 ? parts[0] * 60 + parts[1] : parts[0];
}

function saveDraft() {
  const d = ui.draft;
  d.name = d.name.trim() || 'Mijn training';
  d.group = d.group.trim();
  const saved = store.saveWorkout(d);
  ui.draft = null;
  return saved;
}

// ============ 4. De lopende timer ============

// Geeft de instellingen door aan het geluid.
function applySoundSettings() {
  const settings = store.settings();
  sound.enabled = settings.sound;
  sound.voice = settings.voice;
  sound.playWhenSilent = settings.silentMode;
  sound.applySession();
}

let run = null; // de training die nu loopt (of null)
let wakeLock = null;

// Houdt het scherm aan tijdens een training (als het toestel dat toelaat).
async function keepScreenOn(on) {
  try {
    if (on && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (err) {
    /* niet erg: het scherm kan dan gewoon uitgaan */
  }
}

const THEME = { prepare: '#f7f5ef', work: '#174d50', rest: '#87c7c6', setrest: '#87c7c6', cooldown: '#dcefed', idle: '#f7f5ef' };
const setThemeColor = (name) => document.querySelector('meta[name="theme-color"]').setAttribute('content', THEME[name]);

const RING_LENGTH = 2 * Math.PI * 140;

function startRun(workout) {
  const user = store.activeUser();
  const phases = buildPhases(workout);
  if (!phases.length) return;

  applySoundSettings();
  sound.unlock();
  keepScreenOn(true);

  const el = document.createElement('div');
  el.className = 'run';
  el.innerHTML = `
    <header class="run-top">
      <button class="round-btn round-btn--ghost" data-action="run-close" aria-label="Training stoppen">${icon.close}</button>
      <p class="eyebrow">${esc(workout.name)}</p>
      <button class="round-btn round-btn--ghost" data-action="run-sound" aria-label="Geluid aan of uit" data-ref="sound">${sound.enabled ? icon.soundOn : icon.soundOff}</button>
    </header>

    <div class="run-main">
      <p class="run-kicker" data-ref="kicker" hidden>Werk</p>
      <h1 class="run-phase" data-ref="phase" aria-live="polite"></h1>
      <div class="ring-wrap" data-ref="wrap">
        <button class="ring" data-action="run-toggle" aria-label="Pauzeren of hervatten">
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <circle class="ring-track" cx="160" cy="160" r="140" />
            <circle class="ring-bar" data-ref="ring" cx="160" cy="160" r="140" stroke-dasharray="${RING_LENGTH}" transform="rotate(-90 160 160)" />
          </svg>
          <span class="ring-time" data-ref="time"></span>
          <span class="ring-note" data-ref="note"></span>
        </button>
      </div>
      <p class="run-next" data-ref="next"></p>
      <button class="run-card" data-action="run-exercise" data-ref="card" hidden>
        <img data-ref="cardImg" alt="" hidden />
        <span class="run-card-body">
          <small data-ref="cardLabel"></small>
          <strong data-ref="cardName"></strong>
          <span data-ref="cardNote"></span>
        </span>
        <span class="run-card-more" data-ref="cardMore">${icon.info}</span>
      </button>
    </div>

    <div class="run-meta">
      <div><strong data-ref="round"></strong><span>Ronde</span></div>
      <div><strong data-ref="set"></strong><span>Set</span></div>
      <div><strong data-ref="left"></strong><span>Resterend</span></div>
    </div>
    <div class="run-progress"><i data-ref="bar"></i></div>

    <footer class="run-controls">
      <button class="round-btn round-btn--ghost round-btn--lg" data-action="run-prev" aria-label="Vorige fase">${icon.prev}</button>
      <button class="round-btn round-btn--play" data-action="run-toggle" data-ref="toggle" aria-label="Pauzeren">${icon.pause}</button>
      <button class="round-btn round-btn--ghost round-btn--lg" data-action="run-next" aria-label="Volgende fase">${icon.next}</button>
    </footer>`;
  document.body.append(el);
  document.body.classList.add('is-running');

  const ref = {};
  el.querySelectorAll('[data-ref]').forEach((node) => (ref[node.dataset.ref] = node));
  const shown = {}; // onthoudt wat er al staat, zodat we het scherm niet onnodig bijwerken
  const setText = (name, text) => {
    if (shown[name] !== text) ref[name].textContent = shown[name] = text;
  };

  // De cirkel neemt alle ruimte die overblijft tussen de titel en de rest van het scherm.
  // Zo past alles, ook op een klein toestel of met een lange naam en een oefeningkaart.
  const fitRing = () => {
    const size = Math.floor(Math.min(ref.wrap.clientWidth, ref.wrap.clientHeight));
    if (size > 0) ref.wrap.style.setProperty('--ring-size', `${size}px`);
  };
  const observer = 'ResizeObserver' in window ? new ResizeObserver(fitRing) : null;
  observer?.observe(ref.wrap);

  const runner = new Runner(phases, {
    onPhase(phase, index) {
      el.dataset.phase = phase.type;
      setThemeColor(phase.type);
      setText('round', `${phase.round}/${workout.rounds}`);
      setText('set', `${phase.set}/${workout.sets}`);

      // Tijdens het werk tonen we de naam van de oefening; anders de naam van de fase.
      const exercise = phase.type === 'work' ? phase.exercise : null;
      setText('phase', exercise ? exercise.name : PHASE_LABELS[phase.type]);
      ref.phase.classList.toggle('is-long', !!exercise && exercise.name.length > 14);
      ref.kicker.hidden = !exercise;

      // Tijdens rust of voorbereiding tonen we al welke oefening eraan komt.
      const nextWork = phases.slice(index + 1).find((p) => p.type === 'work');
      const comingUp = phase.type === 'work' || phase.type === 'cooldown' ? null : nextWork?.exercise || null;

      // De kaart onder de cirkel: de uitleg van de huidige oefening, of de volgende oefening.
      const shownExercise = exercise || comingUp;
      const src = shownExercise ? exerciseImage(shownExercise) : null;
      const hasDetails = !!shownExercise && !!(src || shownExercise.note || shownExercise.video);
      const showCard = comingUp ? true : hasDetails;
      ref.card.hidden = !showCard;
      ref.card.disabled = !hasDetails;
      ref.cardMore.hidden = !hasDetails;
      if (showCard) {
        ref.cardImg.hidden = !src;
        if (src && shown.cardSrc !== src) ref.cardImg.src = shown.cardSrc = src;
        setText('cardLabel', comingUp ? 'Hierna' : 'Uitleg');
        setText('cardName', comingUp ? shownExercise.name : '');
        setText('cardNote', shownExercise.note || (comingUp ? '' : shownExercise.video ? 'Tik om het filmpje te bekijken' : ''));
      }
      run.exercise = hasDetails ? shownExercise : null;

      // De regel "Hierna: ..." is niet nodig als de kaart al zegt wat er komt.
      const upcoming = phases[index + 1];
      ref.next.hidden = !!comingUp;
      setText('next', upcoming ? `Hierna: ${PHASE_LABELS[upcoming.type].toLowerCase()} · ${formatTime(upcoming.duration)}` : 'Laatste fase. Bijna klaar!');
      fitRing();

      if (phase.type === 'work') sound.work(exercise ? exercise.name : 'Werk');
      else if (phase.type === 'prepare') sound.prepare();
      else sound.rest(PHASE_LABELS[phase.type]);
    },
    onCountdown() {
      sound.countdown();
    },
    onHalfway(phase) {
      if (phase.type === 'work' && store.settings().halfway) sound.halfway();
    },
    onTick(r) {
      const seconds = Math.ceil(r.remainingMs / 1000);
      setText('time', formatTime(seconds));
      setText('left', formatTime(Math.ceil(r.totalRemainingMs / 1000)));
      setText('note', r.running ? '' : 'Gepauzeerd');
      ref.ring.style.strokeDashoffset = RING_LENGTH * (1 - r.remainingMs / (r.phase.duration * 1000));
      ref.bar.style.transform = `scaleX(${1 - r.totalRemainingMs / r.totalMs})`;
      el.classList.toggle('is-paused', !r.running);
      el.classList.toggle('is-ending', r.running && seconds <= 3);
      if (shown.playing !== r.running) {
        shown.playing = r.running;
        ref.toggle.innerHTML = r.running ? icon.pause : icon.play;
        ref.toggle.setAttribute('aria-label', r.running ? 'Pauzeren' : 'Hervatten');
      }
    },
    onFinish() {
      endRun(true);
    },
  });

  run = { el, ref, runner, workout, user, observer, exercise: null };
  runner.start();
}

// Sluit de timer af. completed = true als de training volledig is afgewerkt.
function endRun(completed) {
  if (!run) return;
  const { el, runner, workout, user } = run;
  runner.stop();
  keepScreenOn(false);
  setThemeColor('idle');

  const seconds = Math.round(runner.elapsedMs / 1000);
  // Heel korte pogingen (minder dan 10 s) bewaren we niet.
  if (completed || seconds >= 10) {
    store.addSession({
      userId: user.id,
      workoutId: workout.id,
      name: workout.name,
      group: workout.group || '',
      at: Date.now(),
      seconds,
      planned: totalSeconds(workout),
      completed,
    });
  }

  if (!completed) return closeRun();

  sound.finish();
  const week = stats(store.sessionsFor(user.id));
  el.dataset.phase = 'done';
  el.classList.remove('is-paused', 'is-ending');
  el.innerHTML = `<div class="done">
    <p class="eyebrow">Training afgerond</p>
    <h1 class="title">Sterk gedaan, ${esc(user.name)}.</h1>
    <p class="lead">${esc(workout.name)} zit erop. Neem even de tijd om op adem te komen.</p>
    <div class="tiles">
      <div class="tile"><strong>${longTime(seconds)}</strong><span>in beweging</span></div>
      <div class="tile"><strong>${workout.rounds * workout.sets}</strong><span>${workout.rounds * workout.sets === 1 ? 'ronde' : 'rondes'}</span></div>
      <div class="tile"><strong>${week.weekCount}</strong><span>deze week</span></div>
    </div>
    <div class="done-buttons">
      <button class="button button--primary button--wide" data-action="run-done">Klaar</button>
      <button class="button button--secondary button--wide" data-action="run-again">Nog een keer</button>
    </div>
  </div>`;
}

function closeRun() {
  if (!run) return;
  run.runner.stop();
  run.observer?.disconnect();
  run.el.remove();
  run = null;
  document.body.classList.remove('is-running');
  keepScreenOn(false);
  setThemeColor('idle');
  render();
}

// Komt de app terug naar voren? Dan de tijd meteen bijwerken en het scherm weer aan houden.
document.addEventListener('visibilitychange', () => {
  if (run && !run.runner.stopped && document.visibilityState === 'visible') {
    keepScreenOn(true);
    run.runner.tick();
  }
  if (document.visibilityState === 'visible') {
    sound.wake(); // de iPhone legt het geluid stil als de app naar de achtergrond gaat
    checkForUpdate(); // staat er intussen een nieuwe versie online?
  }
});

// Bij elke tik het geluid weer wakker maken, mocht de iPhone het hebben stilgelegd.
document.addEventListener('pointerdown', () => sound.wake(), true);

// ============ 5. Pop-ups ("sheets") en meldingen ============

let sheetConfirm = null; // functie die uitgevoerd wordt bij "bevestigen"

function openSheet(html) {
  closeSheet();
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeSheet();
  });
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('is-open'));
}

function closeSheet() {
  document.querySelector('.sheet-backdrop')?.remove();
  sheetConfirm = null;
  pendingBackup = null;
  exerciseEdit = null;
  pendingMessage = null;
  pendingShared = null;
}

function confirmSheet({ title, text, label, danger = false, cancel = 'Annuleren', onConfirm }) {
  openSheet(`
    <h2 class="sheet-title">${title}</h2>
    <p class="lead lead--sm">${text}</p>
    <button class="button ${danger ? 'button--danger' : 'button--primary'} button--wide" data-action="sheet-confirm">${label}</button>
    <button class="button button--secondary button--wide" data-action="sheet-close">${cancel}</button>`);
  sheetConfirm = onConfirm;
}

// Pop-up om een gebruiker aan te maken of te wijzigen.
function userSheet(user = null) {
  const used = store.users().map((u) => u.color);
  const firstFree = AVATAR_COLORS.find((c) => !used.includes(c)) || AVATAR_COLORS[0];
  const current = user ? user.color : firstFree;
  openSheet(`
    <form data-form="user" data-id="${user ? user.id : ''}">
      <h2 class="sheet-title">${user ? 'Profiel wijzigen' : 'Nieuw profiel'}</h2>
      <label class="textfield">
        <span>Naam</span>
        <input name="name" type="text" maxlength="24" required placeholder="Voornaam" value="${user ? esc(user.name) : ''}" autocomplete="off" />
      </label>
      <fieldset class="swatches">
        <legend>Kleur</legend>
        ${AVATAR_COLORS.map(
          (c) => `<label><input type="radio" name="color" value="${c}" ${c === current ? 'checked' : ''} /><span style="background:${c}"></span></label>`
        ).join('')}
      </fieldset>
      <button class="button button--primary button--wide" type="submit">${user ? 'Opslaan' : 'Profiel aanmaken'}</button>
      <button class="button button--secondary button--wide" type="button" data-action="sheet-close">Annuleren</button>
    </form>`);
  if (!user) document.querySelector('.sheet input[name="name"]').focus();
}

// ---- Een training delen ----
let pendingMessage = null; // het bericht dat klaarstaat om te versturen
let pendingShared = null; // een ontvangen training, tot je ze toevoegt
let waitingShared = null; // een training uit een link, als er nog geen profiel is

// Stap 1: het bericht klaarmaken en tonen. Het versturen zelf gebeurt bij de tik op "Delen via…".
async function shareSheet() {
  const user = store.activeUser();
  const workout = { ...ui.draft, name: ui.draft.name.trim() || 'Mijn training' };
  const url = shareUrl(await encodeWorkout(workout, user.name));
  const summary = `${workoutSummary(workout)}, ${formatTime(totalSeconds(workout))} min`;
  const message = shareMessage({ name: workout.name, summary, from: user.name, url });
  const hasPhotos = (workout.exercises || []).some((e) => e.imageId);

  openSheet(`
    <h2 class="sheet-title">Training delen</h2>
    <p class="lead lead--sm">De ontvanger krijgt dit bericht, met de uitleg om de training toe te voegen.${
      hasPhotos ? ' Eigen foto\'s gaan niet mee: die oefeningen komen aan zonder foto.' : ''
    }</p>
    <div class="message-preview">${esc(message.replace(url, 'https://… (de link met de training)'))}</div>
    <button class="button button--primary button--wide" data-action="share-send">${icon.exportFile} Delen via…</button>
    <button class="button button--secondary button--wide" data-action="share-copy">${icon.copy} Bericht kopiëren</button>
    <button class="link" data-action="sheet-close">Sluiten</button>`);
  pendingMessage = message; // na openSheet, want die maakt eerst alles leeg
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Oudere manier, voor toestellen waar het klembord niet rechtstreeks mag.
    const field = document.createElement('textarea');
    field.value = text;
    field.className = 'file-picker';
    document.body.append(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  }
}

// ---- Een gedeelde training ontvangen ----

// Toont de ontvangen training, met de knop om ze toe te voegen.
function sharedSheet(shared, fromLink = false) {
  const user = store.activeUser();
  const w = shared.workout;
  const names = w.exercises.map((e) => e.name);
  const inBrowser = !(navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  openSheet(`
    <p class="eyebrow">${shared.from ? `Gedeeld door ${esc(shared.from)}` : 'Gedeelde training'}</p>
    <h2 class="sheet-title">${esc(w.name)}</h2>
    <p class="lead lead--sm">${workoutSummary(w)}</p>
    <div class="shared-facts">
      <span class="pill">${formatTime(totalSeconds(w))} min</span>
      ${w.group ? `<span class="pill pill--muted">${esc(w.group)}</span>` : ''}
      ${names.length ? `<span class="pill pill--muted">${plural(names.length, 'oefening', 'oefeningen')}</span>` : ''}
    </div>
    ${names.length ? `<p class="muted shared-list">${esc(names.slice(0, 8).join(' · '))}${names.length > 8 ? ' · …' : ''}</p>` : ''}
    <button class="button button--primary button--wide" data-action="shared-add">Toevoegen bij ${esc(user.name)}</button>
    <button class="button button--secondary button--wide" data-action="sheet-close">Niet toevoegen</button>
    ${
      fromLink && inBrowser
        ? `<p class="muted sheet-note">Gebruik je de app op je beginscherm? Kopieer dan het bericht dat je kreeg, open de app daar en tik op "Training ontvangen".</p>`
        : ''
    }`);
  pendingShared = shared;
}

// Pop-up om het bericht zelf te plakken (als het klembord leeg is of niet gelezen mag worden).
function pasteSheet() {
  openSheet(`
    <h2 class="sheet-title">Training ontvangen</h2>
    <p class="lead lead--sm">Kopieer het bericht dat je kreeg en plak het hieronder.</p>
    <label class="textfield">
      <span>Bericht</span>
      <textarea id="sharedText" rows="4" placeholder="Hou hier ingedrukt en kies Plak"></textarea>
    </label>
    <div class="sheet-buttons">
      <button class="button button--primary button--wide" data-action="shared-read">Verder</button>
      <button class="button button--secondary button--wide" data-action="sheet-close">Annuleren</button>
    </div>`);
}

// Zit er een training in de link waarmee de app geopend werd? Toon ze dan.
async function openSharedLink() {
  if (!location.hash.includes('training=')) return;
  const shared = await decodeWorkout(location.hash);
  history.replaceState(null, '', location.pathname + location.search); // link opruimen, zodat herladen niet opnieuw vraagt
  if (!shared) return toast('Deze link bevat geen geldige training');
  if (store.activeUser()) sharedSheet(shared, true);
  else waitingShared = shared; // eerst een profiel aanmaken; daarna tonen we de training
}
window.addEventListener('hashchange', openSharedLink);

// Tekent het scherm opnieuw zonder terug naar boven te springen.
function renderKeepingScroll() {
  const scroll = window.scrollY;
  render();
  window.scrollTo(0, scroll);
}

// ---- Pop-up: een sessie aanpassen of zelf toevoegen ----
const pad = (number) => String(number).padStart(2, '0');
const dateValue = (time) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeValue = (time) => {
  const d = new Date(time);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function sessionSheet(session = null) {
  const user = store.activeUser();
  const owner = session ? store.getUser(session.userId) : user;
  const at = session ? session.at : Date.now();
  const seconds = session ? session.seconds : 0;
  const names = [...new Set(store.workoutsFor(owner.id).map((w) => w.name))];
  openSheet(`
    <form data-form="session" data-id="${session ? session.id : ''}">
      <h2 class="sheet-title">${session ? 'Sessie aanpassen' : 'Sessie toevoegen'}</h2>
      <p class="lead lead--sm">${
        session
          ? `Van ${esc(owner.name)}${session.completed ? '' : ' · voortijdig gestopt'}. Pas aan wat niet klopt.`
          : 'Voor een training die je deed zonder de timer.'
      }</p>
      <label class="textfield">
        <span>Naam</span>
        <input name="name" type="text" maxlength="40" required list="workoutNames" placeholder="Bijvoorbeeld: Klassieke Tabata" value="${session ? esc(session.name) : esc(names[0] || '')}" autocomplete="off" />
        <datalist id="workoutNames">${names.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
      </label>
      <div class="field-pair">
        <label class="textfield">
          <span>Datum</span>
          <input name="date" type="date" required max="${dateValue(Date.now())}" value="${dateValue(at)}" />
        </label>
        <label class="textfield">
          <span>Uur</span>
          <input name="time" type="time" required value="${timeValue(at)}" />
        </label>
      </div>
      <div class="field-pair">
        <label class="textfield">
          <span>Minuten</span>
          <input name="minutes" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${Math.floor(seconds / 60)}" />
        </label>
        <label class="textfield">
          <span>Seconden</span>
          <input name="seconds" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${seconds % 60}" />
        </label>
      </div>
      <div class="sheet-buttons">
        <button class="button button--primary button--wide" type="submit">${session ? 'Opslaan' : 'Toevoegen'}</button>
        <button class="button button--secondary button--wide" type="button" data-action="sheet-close">Annuleren</button>
      </div>
      ${session ? `<button class="link link--danger" type="button" data-action="delete-session" data-id="${session.id}">${icon.trash} Sessie verwijderen</button>` : ''}
    </form>`);
}

// ---- Pop-up: oefening kiezen uit de bibliotheek ----
function librarySheet() {
  const counts = {};
  for (const e of ui.draft.exercises) if (e.libraryId) counts[e.libraryId] = (counts[e.libraryId] || 0) + 1;

  const tile = (item) => `<button class="library-tile" data-action="add-library" data-id="${item.id}">
      <img src="${esc(libraryImage(item.id))}" alt="" />
      <strong>${esc(item.name)}</strong>
      <span class="tile-count" ${counts[item.id] ? '' : 'hidden'}>${counts[item.id] || ''}×</span>
    </button>`;

  openSheet(`
    <h2 class="sheet-title">Oefening toevoegen</h2>
    <p class="lead lead--sm">Tik op een oefening om ze toe te voegen. Je kan er meerdere na elkaar kiezen.</p>
    <button class="button button--secondary button--wide" data-action="new-exercise">${icon.plus} Eigen oefening maken</button>
    ${LIBRARY_GROUPS.map(
      (group) => `<h3 class="eyebrow section-gap">${esc(group)}</h3>
        <div class="library-grid">${LIBRARY.filter((item) => item.group === group).map(tile).join('')}</div>`
    ).join('')}
    <div class="sheet-footer"><button class="button button--primary button--wide" data-action="sheet-close">Klaar</button></div>`);
}

// ---- Pop-up: één oefening bewerken (of een eigen oefening maken) ----
let exerciseEdit = null; // { id, imageId, libraryId, newImage } van de oefening in de pop-up

function exerciseSheet(exercise = null) {
  openSheet(`
    <form data-form="exercise">
      <h2 class="sheet-title">${exercise ? 'Oefening bewerken' : 'Eigen oefening'}</h2>
      <label class="textfield">
        <span>Naam</span>
        <input name="name" type="text" maxlength="40" required placeholder="Bijvoorbeeld: Squats" value="${exercise ? esc(exercise.name) : ''}" autocomplete="off" />
      </label>
      <label class="textfield">
        <span>Uitleg <em>(optioneel)</em></span>
        <textarea name="note" maxlength="400" rows="3" placeholder="Waar moet je op letten?">${exercise ? esc(exercise.note) : ''}</textarea>
      </label>
      <div class="textfield">
        <span>Afbeelding <em>(optioneel)</em></span>
        <div id="exerciseImage"></div>
      </div>
      <label class="textfield">
        <span>Filmpje <em>(optioneel)</em></span>
        <input name="video" type="text" inputmode="url" maxlength="300" placeholder="Plak hier een link, bv. van YouTube" value="${exercise ? esc(exercise.video || '') : ''}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
      </label>
      <div class="sheet-buttons">
        <button class="button button--primary button--wide" type="submit">${exercise ? 'Opslaan' : 'Toevoegen'}</button>
        <button class="button button--secondary button--wide" type="button" data-action="sheet-close">Annuleren</button>
      </div>
      ${exercise ? `<button class="link link--danger" type="button" data-action="delete-exercise">${icon.trash} Oefening verwijderen</button>` : ''}
    </form>`);
  // Na openSheet, want die maakt eerst alles leeg.
  exerciseEdit = { id: exercise?.id || null, imageId: exercise?.imageId || null, libraryId: exercise?.libraryId || null, newImage: null };
  refreshExerciseImage();
}

// Toont in de pop-up de huidige afbeelding, of een knop om er een toe te voegen.
function refreshExerciseImage() {
  const box = document.querySelector('#exerciseImage');
  if (!box || !exerciseEdit) return;
  const photo = exerciseEdit.newImage || images.get(exerciseEdit.imageId);
  const src = photo || libraryImage(exerciseEdit.libraryId);
  box.innerHTML = src
    ? `<img class="image-preview" src="${esc(src)}" alt="Afbeelding van de oefening" />
       <div class="image-actions">
         <button type="button" class="link" data-action="pick-image">${icon.image} ${photo ? 'Andere foto' : 'Eigen foto gebruiken'}</button>
         <button type="button" class="link link--danger" data-action="remove-image">${photo ? 'Foto verwijderen' : 'Tekening verwijderen'}</button>
       </div>`
    : `<button type="button" class="image-add" data-action="pick-image">
         ${icon.image}
         <strong>Foto toevoegen</strong>
         <small>Maak een foto of kies er een uit je bibliotheek</small>
       </button>`;
}

// Onzichtbaar veld waarmee je een foto kiest of maakt.
const imagePicker = document.createElement('input');
imagePicker.type = 'file';
imagePicker.accept = 'image/*';
imagePicker.className = 'file-picker';
imagePicker.tabIndex = -1;
imagePicker.setAttribute('aria-hidden', 'true');
document.body.append(imagePicker);

imagePicker.addEventListener('change', async () => {
  const file = imagePicker.files[0];
  imagePicker.value = '';
  if (!file || !exerciseEdit) return;
  try {
    const dataUrl = await shrinkImage(file);
    if (!exerciseEdit) return; // pop-up intussen gesloten
    exerciseEdit.newImage = dataUrl;
    refreshExerciseImage();
  } catch (err) {
    toast('Deze afbeelding kon niet gelezen worden');
  }
});

let toastTimer = null;
function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2200);
}

// ---- Reservekopie: exporteren en importeren ----

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const countsText = (c) =>
  [plural(c.users, 'profiel', 'profielen'), plural(c.workouts, 'training', 'trainingen'), plural(c.sessions, 'sessie', 'sessies')].join(', ');

// Maakt een bestand van alle gegevens. Op iPhone opent het deelvenster
// (Bewaar in Bestanden, Mail, AirDrop ...); elders wordt het gedownload.
async function exportData() {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const name = `tabata-reservekopie-${date}.json`;
  const json = JSON.stringify({ ...store.exportData(), images: images.pick(store.imageIds()) }, null, 2);
  const file = new File([json], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tabata Timer reservekopie' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // deelvenster gesloten zonder te kiezen
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast('Reservekopie gedownload');
}

// Onzichtbaar veld waarmee je een bestand kiest.
const filePicker = document.createElement('input');
filePicker.type = 'file';
filePicker.accept = '.json,application/json';
filePicker.className = 'file-picker';
filePicker.tabIndex = -1;
filePicker.setAttribute('aria-hidden', 'true');
document.body.append(filePicker);

let pendingBackup = null; // de gekozen reservekopie, tot je beslist wat ermee gebeurt

filePicker.addEventListener('change', async () => {
  const file = filePicker.files[0];
  filePicker.value = ''; // zodat je daarna hetzelfde bestand opnieuw kan kiezen
  if (!file) return;

  let backup;
  try {
    backup = readBackup(JSON.parse(await file.text()));
  } catch (err) {
    openSheet(`
      <h2 class="sheet-title">Dit bestand werkt niet</h2>
      <p class="lead lead--sm">Het is geen reservekopie van Tabata Timer. Kies een bestand dat je eerder met "Gegevens exporteren" hebt gemaakt.</p>
      <button class="button button--primary button--wide" data-action="sheet-close">Oké</button>`);
    return;
  }

  const when = backup.exportedAt ? ` van ${new Date(backup.exportedAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
  openSheet(`
    <h2 class="sheet-title">Reservekopie terugzetten</h2>
    <p class="lead lead--sm">Deze reservekopie${when} bevat ${countsText({ users: backup.users.length, workouts: backup.workouts.length, sessions: backup.sessions.length })}.</p>
    <button class="button button--primary button--wide" data-action="import-merge">Samenvoegen</button>
    <p class="muted sheet-note">Voegt toe wat nog niet op dit toestel staat. Niets wordt gewist.</p>
    <button class="button button--secondary button--wide" data-action="import-replace">Alles vervangen</button>
    <p class="muted sheet-note">Wist alles op dit toestel en zet de reservekopie in de plaats.</p>
    <button class="link" data-action="sheet-close">Annuleren</button>`);
  pendingBackup = backup; // na openSheet, want die maakt eerst alles leeg
});

// ============ 6. Acties ============
// Elke knop heeft een data-action="...". Hieronder staat per actie wat er gebeurt.

const actions = {
  go: (el) => go(el.dataset.view),

  // ---- Gebruikers ----
  'pick-user'(el) {
    store.setActiveUser(el.dataset.id);
    go('home');
  },
  'switch-user'() {
    go('users');
  },
  'new-user': () => userSheet(),
  'edit-user': () => userSheet(store.activeUser()),
  'delete-user'() {
    const user = store.activeUser();
    confirmSheet({
      title: `${esc(user.name)} verwijderen?`,
      text: 'Alle trainingen en sessies van dit profiel worden gewist. Dit kan je niet ongedaan maken.',
      label: 'Profiel verwijderen',
      danger: true,
      onConfirm() {
        store.deleteUser(user.id);
        go('users');
      },
    });
  },

  // ---- Trainingen ----
  'new-workout'() {
    ui.draft = newDraft(store.activeUser().id);
    go('edit');
  },
  'edit-workout'(el) {
    const workout = store.getWorkout(el.dataset.id);
    // Een kopie maken, zodat "Annuleren" de echte training ongemoeid laat.
    ui.draft = { ...workout, exercises: (workout.exercises || []).map((e) => ({ ...e })) };
    go('edit');
  },
  'cancel-edit'() {
    ui.draft = null;
    go('home');
  },
  'pick-group'(el) {
    ui.draft.group = el.dataset.group;
    app.querySelector('#draftGroup').value = el.dataset.group;
  },
  'save-workout'() {
    saveDraft();
    go('home');
    toast('Training opgeslagen');
  },
  'save-and-start'() {
    const workout = saveDraft();
    go('home');
    startRun(workout);
  },
  'duplicate-workout'() {
    const { id, createdAt, ...copy } = ui.draft;
    copy.name = `${copy.name.trim() || 'Mijn training'} (kopie)`;
    copy.exercises = (copy.exercises || []).map((e) => ({ ...e, id: newId() }));
    store.saveWorkout(copy);
    ui.draft = null;
    go('home');
    toast('Kopie gemaakt');
  },
  'delete-workout'() {
    const workout = ui.draft;
    confirmSheet({
      title: 'Training verwijderen?',
      text: `"${esc(workout.name)}" verdwijnt uit je lijst. Je afgewerkte sessies blijven bewaard.`,
      label: 'Verwijderen',
      danger: true,
      onConfirm() {
        store.deleteWorkout(workout.id);
        ui.draft = null;
        go('home');
      },
    });
  },
  'start-workout'(el) {
    startRun(store.getWorkout(el.dataset.id));
  },

  // ---- Delen en ontvangen ----
  'share-workout': () => shareSheet(),
  async 'share-send'() {
    const message = pendingMessage;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        closeSheet();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // deelvenster gesloten zonder te kiezen
      }
    }
    // Geen deelvenster op dit toestel: dan kopiëren we het bericht.
    toast((await copyText(message)) ? 'Bericht gekopieerd. Plak het in een chat of mail.' : 'Delen lukt niet op dit toestel');
  },
  async 'share-copy'() {
    toast((await copyText(pendingMessage)) ? 'Bericht gekopieerd' : 'Kopiëren lukt niet op dit toestel');
  },
  // Eerst kijken of het gekopieerde bericht al op het klembord staat; anders zelf laten plakken.
  async 'receive-training'() {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      /* klembord niet beschikbaar of niet toegestaan */
    }
    const shared = text ? await decodeWorkout(text) : null;
    if (shared) sharedSheet(shared);
    else pasteSheet();
  },
  async 'shared-read'() {
    const shared = await decodeWorkout(document.querySelector('#sharedText').value);
    if (shared) sharedSheet(shared);
    else toast('In dit bericht zit geen training');
  },
  'shared-add'() {
    const { workout } = pendingShared;
    store.saveWorkout({
      ...workout,
      userId: store.activeUser().id,
      exercises: workout.exercises.map((e) => ({ id: newId(), imageId: null, ...e })),
    });
    closeSheet();
    ui.draft = null;
    go('home');
    toast('Training toegevoegd');
  },

  // ---- Oefeningen in een training ----
  'open-library': () => librarySheet(),
  'add-library'(el) {
    ui.draft.exercises.push(exerciseFromLibrary(el.dataset.id));
    refreshEditor();
    // Op de tegel tonen hoe vaak deze oefening in de training zit.
    const count = ui.draft.exercises.filter((e) => e.libraryId === el.dataset.id).length;
    const badge = el.querySelector('.tile-count');
    badge.textContent = `${count}×`;
    badge.hidden = false;
  },
  'new-exercise': () => exerciseSheet(),
  'edit-exercise'(el) {
    exerciseSheet(ui.draft.exercises.find((e) => e.id === el.dataset.id));
  },
  'move-exercise'(el) {
    const list = ui.draft.exercises;
    const from = list.findIndex((e) => e.id === el.dataset.id);
    const to = from + Number(el.dataset.dir);
    if (from < 0 || to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    refreshExercises();
  },
  'delete-exercise'() {
    ui.draft.exercises = ui.draft.exercises.filter((e) => e.id !== exerciseEdit.id);
    closeSheet();
    refreshEditor();
  },
  'match-rounds'() {
    ui.draft.rounds = Math.min(99, ui.draft.exercises.length);
    refreshEditor();
  },
  'pick-image': () => imagePicker.click(),
  'remove-image'() {
    // Eerst de eigen foto weghalen; is er geen, dan de tekening.
    if (exerciseEdit.newImage || exerciseEdit.imageId) {
      exerciseEdit.newImage = null;
      exerciseEdit.imageId = null;
    } else {
      exerciseEdit.libraryId = null;
    }
    refreshExerciseImage();
  },

  // ---- Geschiedenis ----
  'history-scope'(el) {
    ui.historyScope = el.dataset.scope;
    render();
  },
  'toggle-user-sessions'(el) {
    const id = el.dataset.id;
    ui.expandedUsers.has(id) ? ui.expandedUsers.delete(id) : ui.expandedUsers.add(id);
    const scroll = window.scrollY;
    render();
    window.scrollTo(0, scroll);
  },
  'session-menu'(el) {
    sessionSheet(store.getSession(el.dataset.id));
  },
  'add-session': () => sessionSheet(),
  'delete-session'(el) {
    store.deleteSession(el.dataset.id);
    closeSheet();
    renderKeepingScroll();
  },
  // Sessies wissen: eerst kiezen wat er weg mag.
  'reset-history'() {
    const user = store.activeUser();
    const sessions = store.sessionsFor(user.id);
    const week = sessions.filter((s) => s.at >= startOfWeek()).length;
    openSheet(`
      <h2 class="sheet-title">Sessies wissen</h2>
      <p class="lead lead--sm">Kies wat je wil wissen bij ${esc(user.name)}. Je trainingen blijven staan. Dit kan je niet ongedaan maken.</p>
      ${
        week && week < sessions.length
          ? `<button class="button button--danger button--wide" data-action="reset-sessions" data-range="week">Deze week wissen (${plural(week, 'sessie', 'sessies')})</button>`
          : ''
      }
      <button class="button button--danger button--wide" data-action="reset-sessions" data-range="all">Alles wissen (${plural(sessions.length, 'sessie', 'sessies')})</button>
      <button class="button button--secondary button--wide" data-action="sheet-close">Annuleren</button>`);
  },
  'reset-sessions'(el) {
    store.deleteSessionsFor(store.activeUser().id, el.dataset.range === 'week' ? startOfWeek() : 0);
    closeSheet();
    render();
    toast('Sessies gewist');
  },

  // ---- Instellingen ----
  'toggle-setting'(el) {
    const key = el.dataset.key;
    store.setSetting(key, !store.settings()[key]);
    el.setAttribute('aria-checked', store.settings()[key]);
    applySoundSettings();
  },
  'test-sound'() {
    if (!store.settings().sound) return toast('Zet eerst "Geluidssignalen" aan');
    applySoundSettings();
    sound.unlock();
    sound.test();
    if (document.querySelector('.sheet-backdrop')) return; // "Nog eens afspelen": pop-up staat al open
    const silentTip = !sound.canPlayWhenSilent
      ? 'Zet de stille modus van je iPhone uit (het schuifje of de knop aan de zijkant).'
      : store.settings().silentMode
        ? 'Sluit de app volledig af en open ze opnieuw. Soms heeft de iPhone dat nodig na een wijziging.'
        : 'Zet hierboven "Ook in stille modus" aan, of zet de stille modus van je iPhone uit.';
    openSheet(`
      <h2 class="sheet-title">Geluid testen</h2>
      <p class="lead lead--sm">Je hoort nu drie korte piepjes en daarna een lange. Hoor je niets?</p>
      <ol class="steps">
        <li>Zet het volume hoger met de knoppen aan de zijkant van je iPhone.</li>
        <li>${silentTip}</li>
      </ol>
      <button class="button button--primary button--wide" data-action="test-sound">Nog eens afspelen</button>
      <button class="button button--secondary button--wide" data-action="sheet-close">Sluiten</button>`);
  },

  // ---- App vernieuwen ----
  async 'refresh-app'() {
    toast('Even geduld, de app wordt vernieuwd');
    try {
      await (await navigator.serviceWorker?.getRegistration())?.update();
    } catch (err) {
      /* geen internet: we herladen gewoon de bewaarde versie */
    }
    location.reload();
  },

  // ---- Reservekopie ----
  'export-data': () => exportData(),
  'import-data': () => filePicker.click(),
  'import-merge'() {
    const backup = pendingBackup;
    for (const [id, dataUrl] of Object.entries(backup.images)) if (!images.has(id)) images.set(id, dataUrl);
    const added = store.importBackup(backup, 'merge');
    closeSheet();
    images.keepOnly(store.imageIds());
    render();
    toast(added.users + added.workouts + added.sessions ? `Toegevoegd: ${countsText(added)}` : 'Alles stond al op dit toestel');
  },
  'import-replace'() {
    const backup = pendingBackup;
    confirmSheet({
      title: 'Alles vervangen?',
      text: 'Alle profielen, trainingen en sessies op dit toestel worden gewist en vervangen door de reservekopie. Dit kan je niet ongedaan maken.',
      label: 'Wissen en vervangen',
      danger: true,
      onConfirm() {
        store.importBackup(backup, 'replace');
        for (const [id, dataUrl] of Object.entries(backup.images)) images.set(id, dataUrl);
        go('users');
        toast('Reservekopie teruggezet');
      },
    });
  },

  // ---- Timer ----
  'run-toggle'() {
    run.runner.toggle();
    run.runner.tick();
  },
  // Tik op de kaart van een oefening: timer op pauze en de volledige uitleg tonen.
  'run-exercise'() {
    const exercise = run.exercise;
    if (!exercise) return;
    run.runner.pause();
    run.runner.tick();
    const src = exerciseImage(exercise);
    openSheet(`
      ${src ? `<img class="sheet-image" src="${esc(src)}" alt="" />` : ''}
      <h2 class="sheet-title">${esc(exercise.name)}</h2>
      ${exercise.note ? `<p class="lead lead--sm exercise-note">${esc(exercise.note)}</p>` : '<p class="lead lead--sm"></p>'}
      ${exercise.video ? `<a class="button button--secondary button--wide" href="${esc(exercise.video)}" target="_blank" rel="noopener noreferrer">${icon.play} Filmpje bekijken</a>` : ''}
      <button class="button button--primary button--wide" data-action="run-resume">Verder trainen</button>`);
  },
  'run-resume'() {
    closeSheet();
    run?.runner.resume();
    run?.runner.tick();
  },
  'run-next': () => run.runner.next(),
  'run-prev': () => run.runner.previous(),
  'run-sound'() {
    sound.enabled = !sound.enabled;
    store.setSetting('sound', sound.enabled);
    run.ref.sound.innerHTML = sound.enabled ? icon.soundOn : icon.soundOff;
  },
  'run-close'() {
    run.runner.pause();
    run.runner.tick();
    confirmSheet({
      title: 'Training stoppen?',
      text: 'Je timer staat op pauze. Stop je nu, dan bewaren we wat je al gedaan hebt.',
      label: 'Stoppen',
      danger: true,
      cancel: 'Verder trainen',
      onConfirm: () => endRun(false),
    });
  },
  'run-done'() {
    closeRun();
    if (updatePending) reloadWhenSafe();
  },
  'run-again'() {
    const workout = run.workout;
    closeRun();
    startRun(workout);
  },

  // ---- Pop-ups ----
  'sheet-close': () => closeSheet(),
  'sheet-confirm'() {
    const confirm = sheetConfirm;
    closeSheet();
    confirm?.();
  },
};

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el, event);

  // Plus/min-knoppen bediend met het toetsenbord (met de vinger: zie "pointerdown" hieronder).
  const step = event.target.closest('[data-step]');
  if (step && event.detail === 0) stepField(step.dataset.key, Number(step.dataset.step));
});

// Formulier van de gebruikers-pop-up.
// Formulier van de sessie-pop-up.
document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-form="session"]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  const name = String(values.get('name')).trim();
  if (!name) return;

  const at = new Date(`${values.get('date')}T${values.get('time')}`).getTime();
  if (!Number.isFinite(at)) return toast('Vul een geldige datum en een geldig uur in');
  if (at > Date.now() + 60000) return toast('Kies een moment dat al voorbij is');

  const seconds = (parseInt(values.get('minutes'), 10) || 0) * 60 + (parseInt(values.get('seconds'), 10) || 0);
  if (seconds <= 0) return toast('Vul in hoe lang de training duurde');
  if (seconds > 86400) return toast('Een training kan hoogstens 24 uur duren');

  if (form.dataset.id) {
    store.updateSession(form.dataset.id, { name, at, seconds });
  } else {
    store.addSession({ userId: store.activeUser().id, workoutId: null, name, group: '', at, seconds, planned: seconds, completed: true });
  }
  closeSheet();
  renderKeepingScroll();
  toast(form.dataset.id ? 'Sessie aangepast' : 'Sessie toegevoegd');
});

// Formulier van de oefening-pop-up.
document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-form="exercise"]');
  if (!form || !exerciseEdit || !ui.draft) return;
  event.preventDefault();
  const values = new FormData(form);
  const name = String(values.get('name')).trim();
  if (!name) return;
  const typedVideo = String(values.get('video')).trim();
  const video = cleanUrl(typedVideo);
  if (typedVideo && !video) return toast('Deze link is niet geldig');

  // Een nieuw gekozen foto nu pas echt bewaren.
  let imageId = exerciseEdit.imageId;
  if (exerciseEdit.newImage) {
    imageId = newId();
    images.set(imageId, exerciseEdit.newImage);
  }

  const fields = { name, note: String(values.get('note')).trim().slice(0, 400), imageId, libraryId: exerciseEdit.libraryId, video };
  const existing = ui.draft.exercises.find((e) => e.id === exerciseEdit.id);
  if (existing) Object.assign(existing, fields);
  else ui.draft.exercises.push({ id: newId(), ...fields });
  closeSheet();
  refreshEditor();
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-form="user"]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  const name = String(values.get('name')).trim();
  if (!name) return;
  const color = values.get('color');
  if (form.dataset.id) store.updateUser(form.dataset.id, { name, color });
  else store.addUser({ name, color });
  closeSheet();
  if (ui.view === 'users') ui.view = 'home';
  render();
  // Kwam je binnen via een gedeelde link? Dan nu de training tonen.
  if (waitingShared) {
    sharedSheet(waitingShared, true);
    waitingShared = null;
  }
});

// Plus/min: één tik = één stap; ingedrukt houden = snel doortellen.
let holdTimer = null;
const stopHold = () => clearTimeout(holdTimer);
document.addEventListener('pointerdown', (event) => {
  const step = event.target.closest('[data-step]');
  if (!step) return;
  const tick = (delay) => {
    stepField(step.dataset.key, Number(step.dataset.step));
    holdTimer = setTimeout(() => tick(90), delay);
  };
  stopHold();
  tick(450);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => document.addEventListener(type, stopHold, true));

// Typen in de velden van het bewerkscherm.
document.addEventListener('input', (event) => {
  if (!ui.draft) return;
  if (event.target.id === 'draftName') ui.draft.name = event.target.value;
  if (event.target.id === 'draftGroup') ui.draft.group = event.target.value;
});

// Een getal zelf intypen: bij het verlaten van het veld nakijken en overnemen.
document.addEventListener('focusin', (event) => {
  if (event.target.matches?.('[data-input]')) event.target.select();
});
document.addEventListener('focusout', (event) => {
  const key = event.target.dataset?.input;
  if (!key || !ui.draft) return;
  const f = FIELDS.find((x) => x.key === key);
  const typed = f.kind === 'time' ? parseTime(event.target.value) : parseInt(event.target.value, 10);
  if (Number.isFinite(typed)) ui.draft[key] = clamp(typed, f);
  refreshEditor();
  event.target.value = f.kind === 'time' ? formatTime(ui.draft[key]) : ui.draft[key];
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches?.('[data-input]')) event.target.blur();
});

// ============ Start van de app ============

// Offline-werking (alleen via https of localhost).
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

applySoundSettings();

// Eerst de foto's van oefeningen laden, dan het eerste scherm tonen.
images.init().then(() => {
  ui.view = store.activeUser() ? 'home' : 'users';
  go(ui.view);
  openSharedLink();
});

// Onthoud welke versie geladen is (en toon ze op het profielscherm).
fetchVersion().then((version) => {
  loadedVersion = version;
  if (ui.view === 'profile' && !document.querySelector('.sheet-backdrop')) render();
});
