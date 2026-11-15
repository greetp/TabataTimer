// ---------------------------------------------------------------
// sound.js — piepjes en (optioneel) een gesproken stem.
// De piepjes worden door de browser zelf gemaakt (Web Audio),
// er zijn dus geen geluidsbestanden nodig.
//
// Drie dingen om te weten over geluid op een iPhone:
//   1. Geluid mag pas na een tik op het scherm    -> unlock()
//   2. De iPhone legt het geluid soms stil, bv. als de app even
//      naar de achtergrond gaat                    -> wake()
//   3. Staat de iPhone op stil, dan hoor je een web-app standaard
//      niet. Met "playWhenSilent" vragen we de iPhone om de piepjes
//      toch af te spelen                           -> applySession()
// ---------------------------------------------------------------

let ctx = null;

function tone(frequency, delay, duration, volume = 0.6) {
  if (!ctx) return;
  sound.wake();
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export const sound = {
  enabled: true, // piepjes aan/uit
  voice: false, // gesproken aanwijzingen aan/uit
  playWhenSilent: true, // ook afspelen als de iPhone op stil staat

  // Kan dit toestel de stille modus omzeilen? (iPhone met een recente iOS-versie)
  canPlayWhenSilent: typeof navigator !== 'undefined' && 'audioSession' in navigator,

  // Zegt tegen de iPhone welk soort geluid dit is.
  //   'playback' = zoals muziek: speelt ook in stille modus, maar pauzeert andere muziek
  //   'auto'     = standaard: mengt met andere muziek, maar zwijgt in stille modus
  applySession() {
    try {
      if (this.canPlayWhenSilent) navigator.audioSession.type = this.playWhenSilent ? 'playback' : 'auto';
    } catch (err) {
      console.warn('Kon de geluidsmodus niet instellen', err);
    }
  },

  // iPhone laat pas geluid toe ná een tik op het scherm.
  // Roep dit dus aan wanneer de gebruiker op "Start" drukt.
  unlock() {
    try {
      this.applySession();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!ctx && AudioCtx) ctx = new AudioCtx();
      this.wake();
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

  // Zet het geluid weer aan als de iPhone het heeft stilgelegd.
  wake() {
    try {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    } catch (err) {
      /* niets aan te doen */
    }
  },

  // Kort tikje: 3, 2, 1 ...
  countdown() {
    if (this.enabled) tone(700, 0, 0.14, 0.5);
  },

  // Halverwege een werkfase: twee korte piepjes.
  halfway() {
    if (this.enabled) {
      tone(880, 0, 0.1, 0.55);
      tone(880, 0.17, 0.1, 0.55);
    }
    this.say('Halverwege');
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

  // Voor de knop "Geluid testen": drie tikjes en het startsignaal.
  test() {
    tone(700, 0, 0.14, 0.5);
    tone(700, 0.6, 0.14, 0.5);
    tone(700, 1.2, 0.14, 0.5);
    tone(1175, 1.8, 0.5, 0.7);
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
