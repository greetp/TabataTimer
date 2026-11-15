// ---------------------------------------------------------------
// timer.js — de "motor" van de timer.
//  1. buildPhases(): zet een training om in een lijst van fases
//     (voorbereiding, werk, rust, ...).
//  2. Runner: loopt door die fases en houdt de tijd bij.
// Hier zit geen HTML in; het scherm wordt in app.js getekend.
// ---------------------------------------------------------------

export const PHASE_LABELS = {
  prepare: 'Maak je klaar',
  work: 'Werk',
  rest: 'Rust',
  setrest: 'Rust tussen sets',
  cooldown: 'Cooling-down',
};

// Maakt de volgorde van fases voor één training.
export function buildPhases(w) {
  const phases = [];
  const add = (type, duration, round, set, exercise = null) => {
    if (duration > 0) phases.push({ type, duration, round, set, exercise });
  };

  // Welke oefening hoort bij welke ronde? Ronde 1 = oefening 1, enzovoort.
  // Zijn er minder oefeningen dan rondes, dan beginnen we opnieuw bij de eerste.
  const exercises = w.exercises || [];
  const exerciseFor = (round) => (exercises.length ? exercises[(round - 1) % exercises.length] : null);

  add('prepare', w.prepare, 1, 1);

  for (let set = 1; set <= w.sets; set++) {
    for (let round = 1; round <= w.rounds; round++) {
      add('work', w.work, round, set, exerciseFor(round));

      const lastRound = round === w.rounds;
      const lastSet = set === w.sets;

      if (!lastRound) {
        add('rest', w.rest, round, set);
      } else if (!lastSet) {
        // Na de laatste ronde van een set: de langere rust tussen sets
        // (of de gewone rust als die op 0 staat).
        if (w.setRest > 0) add('setrest', w.setRest, round, set);
        else add('rest', w.rest, round, set);
      }
    }
  }

  add('cooldown', w.cooldown, w.rounds, w.sets);
  return phases;
}

export const totalSeconds = (w) => buildPhases(w).reduce((sum, p) => sum + p.duration, 0);

// 95 -> "1:35"
export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// De Runner rekent met echte kloktijd (Date.now) in plaats van
// seconden te tellen. Zo blijft de timer juist, ook als de telefoon
// even hapert of de app kort naar de achtergrond gaat.
export class Runner {
  constructor(phases, callbacks) {
    this.phases = phases;
    this.cb = callbacks;
    this.index = 0;
    this.running = false;
    this.stopped = false;
    this.elapsedMs = 0;

    // after[i] = aantal seconden dat nog komt ná fase i
    this.after = new Array(phases.length).fill(0);
    for (let i = phases.length - 2; i >= 0; i--) this.after[i] = this.after[i + 1] + phases[i + 1].duration;
    this.totalMs = (this.after[0] + phases[0].duration) * 1000;
  }

  get phase() {
    return this.phases[this.index];
  }

  // Resterende tijd van de hele training, in milliseconden.
  get totalRemainingMs() {
    return this.remainingMs + this.after[this.index] * 1000;
  }

  start() {
    this.running = true;
    this.lastTick = Date.now();
    this._enter(0);
    this._loop();
  }

  _enter(index) {
    this.index = index;
    this.remainingMs = this.phases[index].duration * 1000;
    this.endAt = Date.now() + this.remainingMs;
    this.lastSecond = null;
    this.cb.onPhase?.(this.phase, index);
  }

  _loop = () => {
    if (this.stopped) return;
    this.tick();
    this.frame = requestAnimationFrame(this._loop);
  };

  tick() {
    if (this.stopped) return;
    const now = Date.now();

    if (this.running) {
      this.elapsedMs += now - this.lastTick;
      this.lastTick = now;

      // Is de fase voorbij? Ga dan naar de volgende. De "while" vangt
      // ook op dat er meerdere fases voorbij zijn (app stond op de achtergrond).
      let changed = false;
      while (now >= this.endAt) {
        if (this.index >= this.phases.length - 1) return this._finish();
        this.index++;
        this.endAt += this.phases[this.index].duration * 1000;
        changed = true;
      }
      this.remainingMs = this.endAt - now;
      if (changed) {
        this.lastSecond = null;
        this.cb.onPhase?.(this.phase, this.index);
      }

      // Signaal op 3, 2 en 1 seconde voor het einde van een fase.
      const second = Math.ceil(this.remainingMs / 1000);
      if (second !== this.lastSecond) {
        const first = this.lastSecond === null;
        this.lastSecond = second;
        if (!first && second <= 3 && second > 0) this.cb.onCountdown?.(second);
      }
    }

    this.cb.onTick?.(this);
  }

  pause() {
    if (!this.running) return;
    this.tick();
    this.running = false;
  }

  resume() {
    if (this.running || this.stopped) return;
    this.running = true;
    this.lastTick = Date.now();
    this.endAt = Date.now() + this.remainingMs;
  }

  toggle() {
    this.running ? this.pause() : this.resume();
  }

  // Naar de volgende fase springen.
  next() {
    if (this.index >= this.phases.length - 1) return this._finish();
    this._enter(this.index + 1);
    this.cb.onTick?.(this);
  }

  // Terug: eerst naar het begin van deze fase, bij nog eens tikken naar de vorige.
  previous() {
    const playedMs = this.phase.duration * 1000 - this.remainingMs;
    this._enter(playedMs > 2000 || this.index === 0 ? this.index : this.index - 1);
    this.cb.onTick?.(this);
  }

  stop() {
    this.stopped = true;
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  _finish() {
    this.stop();
    this.elapsedMs = Math.min(this.elapsedMs, this.totalMs);
    this.cb.onFinish?.(this);
  }
}
