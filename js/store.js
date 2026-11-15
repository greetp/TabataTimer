// ---------------------------------------------------------------
// store.js — alle gegevens van de app (gebruikers, trainingen,
// sessies, instellingen). Alles wordt bewaard in localStorage,
// dus op het toestel zelf. Er is geen server of account nodig.
// ---------------------------------------------------------------

import { libraryItem } from './library.js';

const KEY = 'tabata-timer.v1';

// Kleuren waaruit een gebruiker kan kiezen voor zijn/haar avatar.
export const AVATAR_COLORS = ['#174d50', '#87c7c6', '#c58f62', '#5d7c9a', '#b0667f', '#7d9160'];

const emptyData = () => ({
  users: [],
  activeUserId: null,
  workouts: [],
  sessions: [],
  settings: { sound: true, halfway: true, silentMode: true, voice: false },
});

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...emptyData(), ...parsed, settings: { ...emptyData().settings, ...parsed.settings } };
    }
  } catch (err) {
    console.warn('Kon bewaarde gegevens niet lezen', err);
  }
  return emptyData();
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Kon gegevens niet bewaren', err);
  }
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Maakt een oefening op basis van een oefening uit de bibliotheek.
export function exerciseFromLibrary(libraryId) {
  const item = libraryItem(libraryId);
  return { id: newId(), name: item.name, note: item.note, libraryId, imageId: null, video: '' };
}

// Kijkt een link naar een filmpje na. Geeft '' terug als het geen geldige weblink is.
// "youtu.be/abc" wordt aangevuld tot "https://youtu.be/abc".
export function cleanUrl(value) {
  const text = String(value ?? '').trim().slice(0, 300);
  if (!text) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const ok = (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
    return ok ? url.href : '';
  } catch (err) {
    return '';
  }
}

// ---------- Reservekopie: hulpfuncties ----------
// Een bestand van buitenaf vertrouwen we niet zomaar. Deze functies
// kijken elke waarde na en zetten ze in de juiste vorm.

const BACKUP_APP = 'tabata-timer';

const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);

const cleanNumber = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const isId = (value) => typeof value === 'string' && /^[a-z0-9]{1,40}$/i.test(value);

// Houdt van elk id alleen het eerste item over.
function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}

// Maakt van eender wat een lijst van objecten (of een lege lijst).
const list = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

// De oefeningen van één training nakijken.
const cleanExercises = (value) =>
  uniqueById(
    list(value)
      .filter((e) => isId(e.id) && cleanText(e.name, 40))
      .slice(0, 60)
      .map((e) => ({
        id: e.id,
        name: cleanText(e.name, 40),
        note: cleanText(e.note, 400),
        libraryId: libraryItem(e.libraryId) ? e.libraryId : null,
        imageId: isId(e.imageId) ? e.imageId : null,
        video: cleanUrl(e.video),
      }))
  );

// Een foto moet een data-URL van een afbeelding zijn, en niet te groot.
const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const isImage = (value) => typeof value === 'string' && value.length < 1500000 && IMAGE_PATTERN.test(value);

// Leest de inhoud van een reservekopie en geeft nagekeken gegevens terug.
// Geeft een fout als het bestand geen geldige reservekopie is.
export function readBackup(raw) {
  if (!raw || raw.app !== BACKUP_APP || !Array.isArray(raw.users)) throw new Error('Geen geldige reservekopie');

  const users = uniqueById(
    list(raw.users)
      .filter((u) => isId(u.id) && cleanText(u.name, 24))
      .map((u) => ({
        id: u.id,
        name: cleanText(u.name, 24),
        color: /^#[0-9a-f]{6}$/i.test(u.color) ? u.color.toLowerCase() : AVATAR_COLORS[0],
        createdAt: cleanNumber(u.createdAt, 0, 9e15, Date.now()),
      }))
  );
  const userIds = new Set(users.map((u) => u.id));

  const workouts = uniqueById(
    list(raw.workouts)
      .filter((w) => isId(w.id) && userIds.has(w.userId))
      .map((w) => ({
        id: w.id,
        userId: w.userId,
        name: cleanText(w.name, 40) || 'Mijn training',
        group: cleanText(w.group, 30),
        prepare: cleanNumber(w.prepare, 0, 3600, 10),
        work: cleanNumber(w.work, 1, 3600, 20),
        rest: cleanNumber(w.rest, 0, 3600, 10),
        rounds: cleanNumber(w.rounds, 1, 99, 8),
        sets: cleanNumber(w.sets, 1, 20, 1),
        setRest: cleanNumber(w.setRest, 0, 3600, 60),
        cooldown: cleanNumber(w.cooldown, 0, 3600, 0),
        exercises: cleanExercises(w.exercises),
        createdAt: cleanNumber(w.createdAt, 0, 9e15, Date.now()),
      }))
  );

  // Foto's: alleen bewaren wat geldig is én door een oefening gebruikt wordt.
  const images = {};
  const rawImages = raw.images && typeof raw.images === 'object' ? raw.images : {};
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const id = exercise.imageId;
      if (!id) continue;
      if (Object.hasOwn(rawImages, id) && isImage(rawImages[id])) images[id] = rawImages[id];
      else exercise.imageId = null; // foto ontbreekt of is ongeldig
    }
  }

  const sessions = uniqueById(
    list(raw.sessions)
      .filter((s) => isId(s.id) && userIds.has(s.userId))
      .map((s) => ({
        id: s.id,
        userId: s.userId,
        workoutId: isId(s.workoutId) ? s.workoutId : null,
        name: cleanText(s.name, 40) || 'Training',
        group: cleanText(s.group, 30),
        at: cleanNumber(s.at, 0, 9e15, Date.now()),
        seconds: cleanNumber(s.seconds, 0, 864000, 0),
        planned: cleanNumber(s.planned, 0, 864000, 0),
        completed: s.completed === true,
      }))
  );

  return {
    users,
    workouts,
    sessions,
    images,
    settings: {
      sound: raw.settings?.sound !== false,
      halfway: raw.settings?.halfway !== false,
      silentMode: raw.settings?.silentMode !== false,
      voice: raw.settings?.voice === true,
    },
    exportedAt: cleanNumber(raw.exportedAt, 0, 9e15, 0),
  };
}

// De trainingen die elke nieuwe gebruiker als voorbeeld krijgt.
const STARTER_WORKOUTS = [
  { name: 'Klassieke Tabata', group: 'Cardio', prepare: 10, work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, cooldown: 0 },
  { name: 'HIIT 30/30', group: 'Cardio', prepare: 10, work: 30, rest: 30, rounds: 10, sets: 1, setRest: 60, cooldown: 60 },
  {
    name: 'Krachtcircuit',
    group: 'Kracht',
    prepare: 15,
    work: 40,
    rest: 20,
    rounds: 6,
    sets: 3,
    setRest: 60,
    cooldown: 0,
    // Oefeningen uit de bibliotheek (zie js/library.js), één per ronde.
    exercises: ['squat', 'pushup', 'lunge', 'plank', 'jumpingjack', 'mountainclimber'],
  },
];

export const store = {
  // ---------- Gebruikers ----------
  users: () => data.users,
  getUser: (id) => data.users.find((u) => u.id === id) || null,
  activeUser: () => data.users.find((u) => u.id === data.activeUserId) || null,

  setActiveUser(id) {
    data.activeUserId = id;
    save();
  },

  addUser({ name, color }) {
    const user = { id: newId(), name, color, createdAt: Date.now() };
    data.users.push(user);
    STARTER_WORKOUTS.forEach((w) =>
      data.workouts.push({
        ...w,
        exercises: (w.exercises || []).map((libraryId) => exerciseFromLibrary(libraryId)),
        id: newId(),
        userId: user.id,
        createdAt: Date.now(),
      })
    );
    data.activeUserId = user.id;
    save();
    return user;
  },

  updateUser(id, changes) {
    const user = this.getUser(id);
    if (user) Object.assign(user, changes);
    save();
  },

  // Verwijdert de gebruiker én al zijn/haar trainingen en sessies.
  deleteUser(id) {
    data.users = data.users.filter((u) => u.id !== id);
    data.workouts = data.workouts.filter((w) => w.userId !== id);
    data.sessions = data.sessions.filter((s) => s.userId !== id);
    if (data.activeUserId === id) data.activeUserId = null;
    save();
  },

  // ---------- Trainingen ----------
  workoutsFor: (userId) => data.workouts.filter((w) => w.userId === userId),
  getWorkout: (id) => data.workouts.find((w) => w.id === id) || null,

  // De id's van alle foto's die door een oefening gebruikt worden.
  imageIds() {
    const ids = new Set();
    for (const workout of data.workouts) for (const exercise of workout.exercises || []) if (exercise.imageId) ids.add(exercise.imageId);
    return ids;
  },

  // Alle groepsnamen die deze gebruiker al gebruikt (alfabetisch).
  groupsFor(userId) {
    const names = this.workoutsFor(userId).map((w) => w.group).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'nl'));
  },

  // Bewaart een nieuwe training (zonder id) of werkt een bestaande bij.
  saveWorkout(workout) {
    if (workout.id) {
      const index = data.workouts.findIndex((w) => w.id === workout.id);
      if (index >= 0) data.workouts[index] = { ...data.workouts[index], ...workout };
    } else {
      workout = { ...workout, id: newId(), createdAt: Date.now() };
      data.workouts.push(workout);
    }
    save();
    return workout;
  },

  deleteWorkout(id) {
    data.workouts = data.workouts.filter((w) => w.id !== id);
    save();
  },

  // ---------- Sessies (afgewerkte trainingen) ----------
  sessionsFor: (userId) => data.sessions.filter((s) => s.userId === userId).sort((a, b) => b.at - a.at),

  addSession(session) {
    data.sessions.push({ ...session, id: newId() });
    save();
  },

  updateSession(id, changes) {
    const session = this.getSession(id);
    if (session) Object.assign(session, changes);
    save();
  },

  deleteSession(id) {
    data.sessions = data.sessions.filter((s) => s.id !== id);
    save();
  },

  // Wist de sessies van één gebruiker. Met "since" alleen de sessies vanaf dat moment.
  deleteSessionsFor(userId, since = 0) {
    data.sessions = data.sessions.filter((s) => s.userId !== userId || s.at < since);
    save();
  },

  getSession: (id) => data.sessions.find((s) => s.id === id) || null,

  // ---------- Instellingen ----------
  settings: () => data.settings,

  setSetting(key, value) {
    data.settings[key] = value;
    save();
  },

  // ---------- Reservekopie ----------

  // Alles wat in een reservekopie-bestand komt.
  exportData: () => ({
    app: BACKUP_APP,
    version: 1,
    exportedAt: Date.now(),
    users: data.users,
    workouts: data.workouts,
    sessions: data.sessions,
    settings: data.settings,
  }),

  // Zet een (nagekeken) reservekopie terug. Geeft terug hoeveel er is toegevoegd.
  //   mode 'replace' = alles op het toestel vervangen
  //   mode 'merge'   = alleen toevoegen wat er nog niet staat
  importBackup(backup, mode) {
    if (mode === 'replace') {
      data = { ...emptyData(), users: backup.users, workouts: backup.workouts, sessions: backup.sessions, settings: backup.settings };
      save();
      return { users: backup.users.length, workouts: backup.workouts.length, sessions: backup.sessions.length };
    }

    // Samenvoegen: een item met een id dat al bestaat slaan we over.
    // Zo krijg je geen dubbels als je hetzelfde bestand twee keer importeert.
    const added = {};
    for (const kind of ['users', 'workouts', 'sessions']) {
      const existing = new Set(data[kind].map((item) => item.id));
      const fresh = backup[kind].filter((item) => !existing.has(item.id));
      data[kind].push(...fresh);
      added[kind] = fresh.length;
    }
    save();
    return added;
  },
};
