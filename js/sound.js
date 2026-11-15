// ---------------------------------------------------------------
// sound.js — piepjes en (optioneel) een gesproken stem.
// De piepjes worden door de browser zelf gemaakt (Web Audio),
// er zijn dus geen geluidsbestanden nodig.
// ---------------------------------------------------------------

let ctx = null;

function tone(frequency, delay, duration, volume = 0.6) {
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export const sound = {
  enabled: true, // piepjes aan/uit
  voice: false, // gesproken aanwijzingen aan/uit

  // iPhone laat pas geluid toe ná een tik op het scherm.
  // Roep dit dus aan wanneer de gebruiker op "Start" drukt.
  unlock() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!ctx && AudioCtx) ctx = new AudioCtx();
      if (ctx && ctx.state !== 'running') ctx.resume();
      tone(440, 0, 0.02, 0.0002); // onhoorbaar, maakt de audio "wakker"
      if (this.voice && 'speechSynthesis' in window) {
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        speechSynthesis.speak(silent);
      }
    } catch (err) {
      console.warn('Geluid niet beschikbaar', err);
    }
  },

  // Kort tikje: 3, 2, 1 ...
  countdown() {
    if (this.enabled) tone(700, 0, 0.14, 0.5);
  },

  // Start van een werkfase: hoog en duidelijk.
  // text = wat de stem zegt (de naam van de oefening, of gewoon "Werk").
  work(text = 'Werk') {
    if (this.enabled) tone(1175, 0, 0.5, 0.7);
    this.say(text);
  },

  // Start van een rustfase: lager.
  rest(text = 'Rust') {
    if (this.enabled) tone(523, 0, 0.5, 0.6);
    this.say(text);
  },

  prepare() {
    this.say('Maak je klaar');
  },

  // Training klaar: drie tonen omhoog.
  finish() {
    if (this.enabled) {
      tone(784, 0, 0.18, 0.6);
      tone(988, 0.18, 0.18, 0.6);
      tone(1319, 0.36, 0.6, 0.7);
    }
    this.say('Klaar. Goed gedaan!');
  },

  say(text) {
    if (!this.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const dutch = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('nl'));
      if (dutch) utterance.voice = dutch;
      utterance.lang = dutch ? dutch.lang : 'nl-BE';
      speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Stem niet beschikbaar', err);
    }
  },
};
