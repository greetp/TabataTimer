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

import { store, AVATAR_COLORS, readBackup } from './store.js';
import { buildPhases, totalSeconds, formatTime, Runner, PHASE_LABELS } from './timer.js';
import { sound } from './sound.js';

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

    <div class="weekcard">
      <div><strong>${week.weekCount}</strong><span>${week.weekCount === 1 ? 'sessie' : 'sessies'} deze week</span></div>
      <div><strong>${longTime(week.weekSeconds)}</strong><span>in beweging</span></div>
    </div>

    ${
      workouts.length
        ? sections.join('')
        : `<div class="empty"><p>Je hebt nog geen trainingen. Maak er hieronder een aan.</p></div>`
    }

    <button class="button button--secondary button--wide" data-action="new-workout">${icon.plus} Nieuwe training</button>
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
      (sessionsByDay(sessions) ||
        `<div class="empty"><p>Nog geen sessies. Na je eerste training verschijnt ze hier.</p></div>`);
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
      ${toggle('voice', 'Gesproken aanwijzingen', 'Een stem zegt "Werk" en "Rust"')}
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
  return { userId, name: '', group: '', prepare: 10, work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, cooldown: 0 };
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

    ${
      d.id
        ? `<div class="edit-actions">
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

  sound.enabled = store.settings().sound;
  sound.voice = store.settings().voice;
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
      <h1 class="run-phase" data-ref="phase" aria-live="polite"></h1>
      <button class="ring" data-action="run-toggle" aria-label="Pauzeren of hervatten">
        <svg viewBox="0 0 320 320" aria-hidden="true">
          <circle class="ring-track" cx="160" cy="160" r="140" />
          <circle class="ring-bar" data-ref="ring" cx="160" cy="160" r="140" stroke-dasharray="${RING_LENGTH}" transform="rotate(-90 160 160)" />
        </svg>
        <span class="ring-time" data-ref="time"></span>
        <span class="ring-note" data-ref="note"></span>
      </button>
      <p class="run-next" data-ref="next"></p>
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

  const runner = new Runner(phases, {
    onPhase(phase, index) {
      el.dataset.phase = phase.type;
      setThemeColor(phase.type);
      setText('phase', PHASE_LABELS[phase.type]);
      setText('round', `${phase.round}/${workout.rounds}`);
      setText('set', `${phase.set}/${workout.sets}`);
      const upcoming = phases[index + 1];
      setText('next', upcoming ? `Hierna: ${PHASE_LABELS[upcoming.type].toLowerCase()} · ${formatTime(upcoming.duration)}` : 'Laatste fase. Bijna klaar!');

      if (phase.type === 'work') sound.work();
      else if (phase.type === 'prepare') sound.prepare();
      else sound.rest(PHASE_LABELS[phase.type]);
    },
    onCountdown() {
      sound.countdown();
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

  run = { el, ref, runner, workout, user };
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
  // Staat er intussen een nieuwe versie online?
  if (document.visibilityState === 'visible') checkForUpdate();
});

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
  const json = JSON.stringify(store.exportData(), null, 2);
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
    ui.draft = { ...store.getWorkout(el.dataset.id) };
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
    const s = store.getSession(el.dataset.id);
    const owner = store.getUser(s.userId);
    const when = new Date(s.at).toLocaleString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    confirmSheet({
      title: esc(s.name),
      text: `${esc(owner ? owner.name : '')} · ${when} · ${longTime(s.seconds)}${s.completed ? '' : ' (voortijdig gestopt)'}`,
      label: 'Sessie verwijderen',
      danger: true,
      cancel: 'Sluiten',
      onConfirm() {
        store.deleteSession(s.id);
        const scroll = window.scrollY;
        render();
        window.scrollTo(0, scroll);
      },
    });
  },

  // ---- Instellingen ----
  'toggle-setting'(el) {
    const key = el.dataset.key;
    store.setSetting(key, !store.settings()[key]);
    el.setAttribute('aria-checked', store.settings()[key]);
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
    const added = store.importBackup(pendingBackup, 'merge');
    closeSheet();
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

ui.view = store.activeUser() ? 'home' : 'users';
render();

// Onthoud welke versie geladen is (en toon ze op het profielscherm).
fetchVersion().then((version) => {
  loadedVersion = version;
  if (ui.view === 'profile' && !document.querySelector('.sheet-backdrop')) render();
});
