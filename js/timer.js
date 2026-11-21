// ---------------------------------------------------------------
// timer.js — de "motor" van de timer.
//  1. buildPhases(): zet een training om in een lijst van fases
//     (voorbereiding, werk, rust, ...).
//  2. Runner: loopt door die fases en houdt de tijd bij.
// Hier zit geen HTML in; het scherm wordt in app.js getekend.
//
// Twee keuzes per training bepalen de fases:
//   workMode  'time' = elke werkfase duurt een vast aantal seconden
//             'reps' = elke werkfase is een aantal herhalingen; ze loopt
//                      tot de gebruiker op "Klaar" tikt (geen aftelling)
//             Dit is de standaard voor de hele training. Een oefening kan
//             er met haar eigen veld "mode" van afwijken (zie exerciseMode).
//   order     'circuit'  = één set is alle oefeningen na elkaar,
//                          daarna herhaal je het geheel
//             'exercise' = eerst alle sets van één oefening, dan de volgende
// ---------------------------------------------------------------

export const PHASE_LABELS = {
  prepare: 'Maak je klaar',
  work: 'Werk',
  rest: 'Rust',
  setrest: 'Rust tussen sets',
  cooldown: 'Cooling-down',
};

// De naam van een fase. Bij "per oefening" is de lange rust een rust tussen oefeningen.
export function phaseLabel(type, workout) {
  if (type === 'setrest' && workout?.order === 'exercise') return 'Rust tussen oefeningen';
  return PHASE_LABELS[type];
}

// Sommige fases hebben een eigen naam, zoals de pauze om van kant te wisselen.
export const labelFor = (phase, workout) => phase.label || phaseLabel(phase.type, workout);

// De pauze tussen links en rechts als de training er zelf geen heeft (oudere trainingen).
export const SWITCH_DEFAULT = 5;

// Doe je deze oefening op tijd ('time') of op aantal ('reps')?
// Een oefening zonder eigen keuze volgt de training. Dat geldt ook voor oefeningen
// van vóór deze keuze bestond, en voor een ronde zonder oefening.
export function exerciseMode(exercise, w) {
  const own = exercise ? exercise.mode : null;
  if (own === 'time' || own === 'reps') return own;
  return w.workMode === 'reps' ? 'reps' : 'time';
}

// De oefeningen die echt aan bod komen: bij meer oefeningen dan rondes alleen de eerste.
export const usedExercises = (w) => (w.exercises || []).slice(0, w.rounds);

// Is er een oefening met links en rechts? Alleen dan is er een wisselpauze.
export const hasSwitchRest = (w) => usedExercises(w).some((e) => e.sides);

// Hoe lang duurt het werk van deze oefening als ze op tijd gaat?
// Een eigen tijd van de oefening gaat voor op de werktijd van de training.
export const exerciseWork = (exercise, w) => (exercise && exercise.work > 0 ? exercise.work : w.work);

// Wat komt er in deze training voor: werk op tijd, werk op aantal, of allebei?
export function workModes(w) {
  const used = usedExercises(w);
  const modes = used.length ? used.map((e) => exerciseMode(e, w)) : [exerciseMode(null, w)];
  return { time: modes.includes('time'), reps: modes.includes('reps') };
}

// Maakt de volgorde van fases voor één training.
export function buildPhases(w) {
  const phases = [];
  const add = (type, duration, round, set) => {
    if (duration > 0) phases.push({ type, duration, round, set, exercise: null });
  };

  // Welke oefening hoort bij welke ronde? Ronde 1 = oefening 1, enzovoort.
  // Zijn er minder oefeningen dan rondes, dan beginnen we opnieuw bij de eerste.
  const exercises = w.exercises || [];
  const exerciseFor = (round) => (exercises.length ? exercises[(round - 1) % exercises.length] : null);

  // Eén werkfase: op tijd, of een aantal herhalingen zonder aftelling ("untimed").
  // Dat kan per oefening verschillen.
  // Een oefening met "links en rechts" doe je twee keer na elkaar: eerst links, dan rechts.
  // De tijd of het aantal geldt per kant.
  const switchRest = w.switchRest ?? SWITCH_DEFAULT;
  const addWork = (round, set) => {
    const exercise = exerciseFor(round);
    const byReps = exerciseMode(exercise, w) === 'reps';
    const sides = exercise && exercise.sides ? ['links', 'rechts'] : [null];
    sides.forEach((side, i) => {
      // Tussen de twee kanten krijg je even de tijd om te wisselen. Dat is een gewone rustfase met een eigen naam.
      if (i > 0 && switchRest > 0) phases.push({ type: 'rest', label: 'Wissel van kant', duration: switchRest, round, set, exercise: null, side: null });
      if (byReps) {
        const reps = (exercise && exercise.reps) || w.reps || 12;
        phases.push({ type: 'work', duration: 0, untimed: true, reps, round, set, exercise, side });
      } else {
        const duration = exerciseWork(exercise, w);
        if (duration > 0) phases.push({ type: 'work', duration, round, set, exercise, side });
      }
    });
  };

  add('prepare', w.prepare, 1, 1);

  // Twee lussen in elkaar. Bij een circuit loopt de buitenste lus over de sets en de
  // binnenste over de rondes (oefeningen). Bij "per oefening" is het net omgekeerd.
  const perExercise = w.order === 'exercise';
  const outerCount = perExercise ? w.rounds : w.sets;
  const innerCount = perExercise ? w.sets : w.rounds;

  for (let outer = 1; outer <= outerCount; outer++) {
    for (let inner = 1; inner <= innerCount; inner++) {
      const round = perExercise ? outer : inner;
      const set = perExercise ? inner : outer;
      addWork(round, set);

      const lastInner = inner === innerCount;
      const lastOuter = outer === outerCount;

      if (!lastInner) {
        add('rest', w.rest, round, set);
      } else if (!lastOuter) {
        // Na de laatste van de binnenste lus: de langere rust
        // (of de gewone rust als die op 0 staat).
        if (w.setRest > 0) add('setrest', w.setRest, round, set);
        else add('rest', w.rest, round, set);
      }
    }
  }

  add('cooldown', w.cooldown, w.rounds, w.sets);
  return phases;
}

// De tijd die vastligt: rust, voorbereiding en werk op tijd. Werk op aantal telt niet mee.
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
    this.elapsedMs = 0; // hoe lang de training al loopt (zonder pauzes)
    this.phaseMs = 0; // hoe lang de huidige fase al loopt
    this.hasUntimed = phases.some((p) => p.untimed); // zit er werk op aantal in?

    // after[i] = aantal seconden dat nog komt ná fase i
    this.after = new Array(phases.length).fill(0);
    for (let i = phases.length - 2; i >= 0; i--) this.after[i] = this.after[i + 1] + phases[i + 1].duration;
    this.totalMs = (this.after[0] + phases[0].duration) * 1000;
  }

  get phase() {
    return this.phases[this.index];
  }

  // Resterende vaste tijd van de hele training, in milliseconden.
  get totalRemainingMs() {
    return this.remainingMs + this.after[this.index] * 1000;
  }

  // Hoe ver de training gevorderd is, van 0 tot 1.
  get progress() {
    if (!this.hasUntimed) return 1 - this.totalRemainingMs / this.totalMs;
    // Met werk op aantal kennen we de totale tijd niet: dan tellen we de fases.
    const inPhase = this.phase.untimed ? 0 : 1 - this.remainingMs / (this.phase.duration * 1000);
    return (this.index + inPhase) / this.phases.length;
  }

  start() {
    this.running = true;
    this.lastTick = Date.now();
    this._enter(0);
    this._loop();
  }

  _enter(index) {
    this.index = index;
    this.phaseMs = 0;
    // Een fase zonder aftelling eindigt nooit vanzelf: ze wacht op next().
    this.remainingMs = this.phases[index].duration * 1000;
    this.endAt = this.phases[index].untimed ? Infinity : Date.now() + this.remainingMs;
    this.lastSecond = null;
    this.halfDone = false;
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
      this.phaseMs += now - this.lastTick;
      this.lastTick = now;

      // Is de fase voorbij? Ga dan naar de volgende. De "while" vangt
      // ook op dat er meerdere fases voorbij zijn (app stond op de achtergrond).
      let changed = false;
      while (now >= this.endAt) {
        if (this.index >= this.phases.length - 1) return this._finish();
        const ended = this.endAt;
        this.index++;
        changed = true;
        if (this.phase.untimed) {
          // Werk op aantal: hier blijven we staan tot de gebruiker op "Klaar" tikt.
          this.endAt = Infinity;
          this.phaseMs = now - ended;
        } else {
          this.endAt = ended + this.phase.duration * 1000;
        }
      }
      this.remainingMs = this.phase.untimed ? 0 : this.endAt - now;
      if (changed) {
        if (!this.phase.untimed) this.phaseMs = this.phase.duration * 1000 - this.remainingMs;
        this.lastSecond = null;
        this.halfDone = false;
        this.cb.onPhase?.(this.phase, this.index);
      }

      if (!this.phase.untimed) {
        // Signaal halverwege de fase (alleen bij fases van minstens 10 seconden).
        const halfMs = this.phase.duration * 500;
        if (!this.halfDone && this.remainingMs <= halfMs) {
          this.halfDone = true;
          // Zijn we de helft al een eind voorbij (de app stond op de achtergrond)? Dan geen signaal meer.
          if (this.phase.duration >= 10 && this.remainingMs > halfMs - 1500) this.cb.onHalfway?.(this.phase);
        }

        // Signaal op 3, 2 en 1 seconde voor het einde van een fase.
        const second = Math.ceil(this.remainingMs / 1000);
        if (second !== this.lastSecond) {
          const first = this.lastSecond === null;
          this.lastSecond = second;
          if (!first && second <= 3 && second > 0) this.cb.onCountdown?.(second);
        }
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
    if (!this.phase.untimed) this.endAt = Date.now() + this.remainingMs;
  }

  toggle() {
    this.running ? this.pause() : this.resume();
  }

  // Naar de volgende fase springen. Bij werk op aantal is dit de knop "Klaar".
  next() {
    if (this.index >= this.phases.length - 1) return this._finish();
    if (!this.running) this.resume(); // "Klaar" tikken tijdens een pauze laat de rust meteen lopen
    this._enter(this.index + 1);
    this.cb.onTick?.(this);
  }

  // Terug: eerst naar het begin van deze fase, bij nog eens tikken naar de vorige.
  previous() {
    this._enter(this.phaseMs > 2000 || this.index === 0 ? this.index : this.index - 1);
    this.cb.onTick?.(this);
  }

  stop() {
    this.stopped = true;
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  _finish() {
    this.stop();
    // Op tijd kan een training nooit langer duren dan gepland (bv. na een tijd op de achtergrond).
    if (!this.hasUntimed) this.elapsedMs = Math.min(this.elapsedMs, this.totalMs);
    this.cb.onFinish?.(this);
  }
}
