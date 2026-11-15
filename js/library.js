// ---------------------------------------------------------------
// library.js — de ingebouwde bibliotheek met klassieke oefeningen.
//
// Elke oefening heeft:
//   id     vaste code, moet overeenkomen met een tekening in library-art.js
//   group  onder welke titel ze in de lijst staat
//   name   de naam die de gebruiker ziet
//   note   korte uitleg (de gebruiker kan die nadien aanpassen)
//
// Een oefening toevoegen? Zet ze hier in de lijst én teken het
// figuurtje in tools/teken-oefeningen.mjs (zelfde id).
// ---------------------------------------------------------------

import { ART } from './library-art.js';

export const LIBRARY_GROUPS = ['Benen', 'Romp', 'Armen en borst', 'Cardio'];

export const LIBRARY = [
  { id: 'squat', group: 'Benen', name: 'Squats', note: 'Voeten op schouderbreedte. Zak door je knieën alsof je gaat zitten en hou je rug recht.' },
  { id: 'jumpsquat', group: 'Benen', name: 'Jump squats', note: 'Zak door je knieën en spring krachtig omhoog. Land zacht en ga meteen door.' },
  { id: 'lunge', group: 'Benen', name: 'Lunges', note: 'Stap ver naar voren en zak tot beide knieën gebogen zijn. Wissel van been.' },
  { id: 'wallsit', group: 'Benen', name: 'Muurzit', note: 'Rug tegen de muur, knieën in een rechte hoek. Blijf zo zitten.' },
  { id: 'bridge', group: 'Benen', name: 'Bruggetje', note: 'Lig op je rug met gebogen knieën. Duw je heupen omhoog en laat ze rustig zakken.' },

  { id: 'plank', group: 'Romp', name: 'Plank', note: 'Steun op je onderarmen en tenen. Span je buik aan en hou je lichaam recht.' },
  { id: 'sideplank', group: 'Romp', name: 'Zijplank', note: 'Steun op één hand of onderarm, lichaam in één lijn. Wissel halverwege van kant.' },
  { id: 'situp', group: 'Romp', name: 'Sit-ups', note: 'Lig op je rug met gebogen knieën. Rol je bovenlichaam op en zak rustig terug.' },
  { id: 'russiantwist', group: 'Romp', name: 'Russian twist', note: 'Zit met je rug schuin naar achteren. Draai je romp afwisselend naar links en rechts.' },
  { id: 'legraise', group: 'Romp', name: 'Beenheffen', note: 'Lig op je rug. Til je gestrekte benen op en laat ze traag zakken zonder de grond te raken.' },
  { id: 'superman', group: 'Romp', name: 'Superman', note: 'Lig op je buik. Til armen en benen tegelijk een stukje op en hou even vast.' },
  { id: 'birddog', group: 'Romp', name: 'Bird-dog', note: 'Op handen en knieën. Strek je ene arm en het andere been, en wissel.' },

  { id: 'pushup', group: 'Armen en borst', name: 'Push-ups', note: 'Handen onder je schouders, lichaam in één lijn. Op je knieën mag ook.' },
  { id: 'dip', group: 'Armen en borst', name: 'Triceps dips', note: 'Steun met je handen op een stevige stoel of bank. Buig je ellebogen en duw je weer op.' },

  { id: 'jumpingjack', group: 'Cardio', name: 'Jumping jacks', note: 'Spring met je benen open en breng je armen boven je hoofd.' },
  { id: 'highknees', group: 'Cardio', name: 'Knieheffen', note: 'Loop ter plaatse en trek je knieën om de beurt hoog op.' },
  { id: 'mountainclimber', group: 'Cardio', name: 'Mountain climbers', note: 'Start in plankhouding en trek om de beurt je knieën naar je borst.' },
  { id: 'burpee', group: 'Cardio', name: 'Burpees', note: 'Zak door je knieën, spring naar plankhouding, kom terug en spring omhoog.' },
];

const byId = new Map(LIBRARY.map((item) => [item.id, item]));
export const libraryItem = (id) => byId.get(id) || null;

// Geeft de tekening terug als adres dat je in <img src="..."> kan zetten.
const imageCache = new Map();
export function libraryImage(id) {
  if (!id || !ART[id]) return null;
  if (!imageCache.has(id)) imageCache.set(id, 'data:image/svg+xml;utf8,' + encodeURIComponent(ART[id]));
  return imageCache.get(id);
}
