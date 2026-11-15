// ---------------------------------------------------------------
// store.js — alle gegevens van de app (gebruikers, trainingen,
// sessies, instellingen). Alles wordt bewaard in localStorage,
// dus op het toestel zelf. Er is geen server of account nodig.
// ---------------------------------------------------------------

const KEY = 'tabata-timer.v1';

// Kleuren waaruit een gebruiker kan kiezen voor zijn/haar avatar.
export const AVATAR_COLORS = ['#174d50', '#87c7c6', '#c58f62', '#5d7c9a', '#b0667f', '#7d9160'];

const emptyData = () => ({
  users: [],
  activeUserId: null,
  workouts: [],
  sessions: [],
  settings: { sound: true, voice: false },
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

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// De trainingen die elke nieuwe gebruiker als voorbeeld krijgt.
const STARTER_WORKOUTS = [
  { name: 'Klassieke Tabata', group: 'Cardio', prepare: 10, work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, cooldown: 0 },
  { name: 'HIIT 30/30', group: 'Cardio', prepare: 10, work: 30, rest: 30, rounds: 10, sets: 1, setRest: 60, cooldown: 60 },
  { name: 'Krachtcircuit', group: 'Kracht', prepare: 15, work: 40, rest: 20, rounds: 6, sets: 3, setRest: 60, cooldown: 0 },
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
    STARTER_WORKOUTS.forEach((w) => data.workouts.push({ ...w, id: newId(), userId: user.id, createdAt: Date.now() }));
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

  deleteSession(id) {
    data.sessions = data.sessions.filter((s) => s.id !== id);
    save();
  },

  getSession: (id) => data.sessions.find((s) => s.id === id) || null,

  // ---------- Instellingen ----------
  settings: () => data.settings,

  setSetting(key, value) {
    data.settings[key] = value;
    save();
  },
};
