// ---------------------------------------------------------------
// share.js — een training delen met iemand anders.
//
// Er is geen server: de hele training zit in een link, bv.
//     https://.../TabataTimer/#training=c.eJyrVkrLz1eyUl...
// Het stuk na "training=" is de training, klein verpakt:
//   1. de training wordt kort opgeschreven (pack)
//   2. daarna samengeperst, als het toestel dat kan
//   3. en omgezet naar letters en cijfers die in een link mogen
// De eerste letter zegt hoe: "c" = samengeperst, "p" = niet.
//
// Eigen foto's gaan niet mee: die zijn te groot voor een link.
// ---------------------------------------------------------------

import { sanitizeWorkout } from './store.js';
import { libraryItem } from './library.js';
import { workModes, hasSwitchRest, SWITCH_DEFAULT } from './timer.js';

// De intervallen, in de volgorde waarin ze in de link staan.
const TIMES = ['prepare', 'work', 'rest', 'rounds', 'sets', 'setRest', 'cooldown'];

// ---------- Kort opschrijven en weer uitpakken ----------

function pack(workout, from) {
  const exercises = (workout.exercises || []).map((e) => {
    const item = libraryItem(e.libraryId);
    // Een ongewijzigde oefening uit de bibliotheek: alleen haar code is genoeg.
    // (Een oefening met links en rechts schrijven we altijd voluit: in oudere links
    // betekent alleen de code "zonder links en rechts", en dat moet zo blijven.)
    if (item && e.name === item.name && (e.note || '') === item.note && !e.video && !e.reps && !e.mode && !e.work && !e.sides) return e.libraryId;
    const short = { n: e.name };
    if (e.note) short.o = e.note;
    if (e.libraryId) short.l = e.libraryId;
    if (e.video) short.v = e.video;
    if (e.reps) short.r = e.reps;
    // Alleen als de oefening afwijkt van de training: "t" = op tijd, "r" = op aantal.
    if (e.mode === 'time' || e.mode === 'reps') short.m = e.mode === 'time' ? 't' : 'r';
    if (e.work) short.t = e.work; // eigen werktijd
    if (e.sides) short.s = 1; // links en rechts
    return short;
  });
  const packed = { v: 1, n: workout.name, g: workout.group || '', t: TIMES.map((key) => workout[key]), e: exercises, by: from };
  // Alleen meesturen als het afwijkt van het gewone geval (op tijd, als circuit): zo blijft de link kort.
  if (workout.workMode === 'reps') packed.m = 1;
  // Het aantal herhalingen is ook nodig als maar één oefening op aantal gaat.
  if (workModes(workout).reps) packed.r = workout.reps || 12;
  if (workout.order === 'exercise') packed.d = 1;
  // De wisselpauze tussen links en rechts, als ze gebruikt wordt en niet de gewone 5 seconden is.
  const switchRest = workout.switchRest ?? SWITCH_DEFAULT;
  if (hasSwitchRest(workout) && switchRest !== SWITCH_DEFAULT) packed.w = switchRest;
  return packed;
}

function unpack(data) {
  if (!data || data.v !== 1 || !Array.isArray(data.t)) return null;
  const raw = { name: data.n, group: data.g, workMode: data.m ? 'reps' : 'time', reps: data.r, order: data.d ? 'exercise' : 'circuit', switchRest: data.w };
  TIMES.forEach((key, i) => (raw[key] = data.t[i]));
  raw.exercises = (Array.isArray(data.e) ? data.e : []).map((e) => {
    if (typeof e === 'string') {
      const item = libraryItem(e);
      return item ? { name: item.name, note: item.note, libraryId: e } : null;
    }
    if (!e || typeof e !== 'object') return null;
    const mode = e.m === 't' ? 'time' : e.m === 'r' ? 'reps' : null;
    return { name: e.n, note: e.o, libraryId: e.l, video: e.v, reps: e.r, mode, work: e.t, sides: e.s === 1 };
  });
  // sanitizeWorkout kijkt elke waarde na: een link kan door iedereen gemaakt zijn.
  const workout = sanitizeWorkout(raw);
  return workout ? { workout, from: String(data.by ?? '').trim().slice(0, 24) } : null;
}

// ---------- Omzetten naar tekst voor in een link ----------

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Stuurt gegevens door een (de)compressor. Stopt als het resultaat te groot wordt.
async function transform(bytes, stream, limit = 300000) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) throw new Error('Te groot');
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// ---------- Wat de rest van de app gebruikt ----------

// Maakt van een training de code die in de link komt.
export async function encodeWorkout(workout, from) {
  const bytes = new TextEncoder().encode(JSON.stringify(pack(workout, from)));
  const plain = `p.${toBase64Url(bytes)}`;
  try {
    if (typeof CompressionStream === 'function') {
      const compressed = `c.${toBase64Url(await transform(bytes, new CompressionStream('deflate-raw')))}`;
      if (compressed.length < plain.length) return compressed;
    }
  } catch (err) {
    /* samenpersen lukt niet op dit toestel: dan de gewone vorm */
  }
  return plain;
}

// Zoekt in een tekst (een link of een heel bericht) naar een gedeelde training.
// Geeft { workout, from } terug, of null als er geen geldige training in zit.
export async function decodeWorkout(text) {
  const match = /training=([pc])\.([A-Za-z0-9_-]{1,20000})/.exec(String(text ?? ''));
  if (!match) return null;
  try {
    let bytes = fromBase64Url(match[2]);
    if (match[1] === 'c') bytes = await transform(bytes, new DecompressionStream('deflate-raw'));
    return unpack(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (err) {
    return null;
  }
}

// De volledige link naar deze app, met de training erin.
export const shareUrl = (code) => `${location.origin}${location.pathname}#training=${code}`;

// Het bericht dat verstuurd wordt: wat het is, hoe je het toevoegt, en de link.
export function shareMessage({ name, summary, from, url }) {
  return [
    `${from} deelt een training met je in Tabata Timer: ${name} (${summary}).`,
    '',
    'Zo voeg je ze toe aan de app op je beginscherm:',
    '1. Hou dit bericht ingedrukt en kies Kopieer.',
    '2. Open de Tabata Timer-app.',
    '3. Tik bij Trainingen op "Training ontvangen".',
    '',
    'Heb je de app nog niet? Tik dan op deze link:',
    url,
  ].join('\n');
}
