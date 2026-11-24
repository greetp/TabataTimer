// ---------------------------------------------------------------
// library.js — de ingebouwde bibliotheek met klassieke oefeningen.
//
// Elke oefening heeft:
//   id     vaste code, moet overeenkomen met een tekening in library-art.js
//   group  onder welke titel ze in de lijst staat
//   name   de naam die de gebruiker ziet
//   note   korte uitleg (de gebruiker kan die nadien aanpassen)
//   sides  (optioneel) true = een oefening die je links en rechts doet;
//          ze start dan met "Links en rechts" aan
//
// Een oefening toevoegen? Zet ze hier in de lijst én teken het
// figuurtje in tools/teken-oefeningen.mjs (zelfde id).
// ---------------------------------------------------------------

import { ART } from './library-art.js';

export const LIBRARY_GROUPS = ['Benen', 'Romp', 'Armen en borst', 'Cardio', 'Muurpilates'];

export const LIBRARY = [
  { id: 'squat', group: 'Benen', name: 'Squats', note: 'Voeten op schouderbreedte. Zak door je knieën alsof je gaat zitten en hou je rug recht.' },
  { id: 'jumpsquat', group: 'Benen', name: 'Jump squats', note: 'Zak door je knieën en spring krachtig omhoog. Land zacht en ga meteen door.' },
  { id: 'lunge', group: 'Benen', name: 'Lunges', note: 'Stap ver naar voren en zak tot beide knieën gebogen zijn. Wissel van been.' },
  { id: 'bridge', group: 'Benen', name: 'Bruggetje', note: 'Lig op je rug met gebogen knieën. Duw je heupen omhoog en laat ze rustig zakken.' },
  { id: 'singlebridge', group: 'Benen', name: 'Bruggetje op één been', note: 'Lig op je rug, één voet op de grond en het andere been gestrekt omhoog. Duw je heupen omhoog en laat ze langzaam zakken. Wissel van been.' },
  { id: 'sidelegraise', group: 'Benen', name: 'Beenheffen in zijlig', note: 'Lig op je zij met gestrekte benen. Til je bovenste been op en laat het langzaam zakken. Wissel van kant.' },

  { id: 'plank', group: 'Romp', name: 'Plank', note: 'Steun op je onderarmen en tenen. Span je buik aan en hou je lichaam recht.' },
  { id: 'sideplank', group: 'Romp', name: 'Zijplank', note: 'Steun op één hand of onderarm, lichaam in één lijn.', sides: true },
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
  { id: 'bike', group: 'Cardio', name: 'Fietsen', note: 'Trap stevig door op de hometrainer. Hou je rug lang en je schouders los.' },
  { id: 'rower', group: 'Cardio', name: 'Roeien', note: 'Duw eerst met je benen, leun dan licht achterover en trek de greep naar je buik. Keer rustig terug.' },
  { id: 'skierg', group: 'Cardio', name: 'SkiErg', note: 'Trek de grepen van boven naar je heupen en buig mee door je heupen en knieën. Kom rustig weer recht.' },
  { id: 'crosstrainer', group: 'Cardio', name: 'Crosstrainer', note: 'Stap in een vloeiende beweging en duw en trek mee met je armen. Blijf rechtop staan.' },

  // Muurpilates: je hebt alleen een vrije muur nodig, geen toestellen.
  { id: 'wallsit', group: 'Muurpilates', name: 'Muurzit', note: 'Rug tegen de muur, knieën in een rechte hoek. Blijf zo zitten.' },
  { id: 'wallrolldown', group: 'Muurpilates', name: 'Afrollen tegen de muur', note: 'Sta met je rug tegen de muur, voeten een stap naar voren. Rol wervel per wervel naar beneden en kom traag weer omhoog.' },
  { id: 'wallangel', group: 'Muurpilates', name: 'Muurengel', note: 'Rug en armen tegen de muur. Schuif je armen traag omhoog en weer omlaag, zonder dat ze de muur loslaten.' },
  { id: 'wallpushup', group: 'Muurpilates', name: 'Push-ups tegen de muur', note: 'Handen op schouderhoogte tegen de muur, lichaam in één lijn. Buig je ellebogen en duw je weer weg.' },
  { id: 'wallbridge', group: 'Muurpilates', name: 'Bruggetje tegen de muur', note: 'Lig op je rug met je voeten plat tegen de muur, knieën gebogen. Duw je heupen omhoog en laat ze rustig zakken.' },
  { id: 'wallscissor', group: 'Muurpilates', name: 'Beenschaar tegen de muur', note: 'Lig op je rug met je benen recht omhoog tegen de muur. Laat om de beurt één been traag naar je toe zakken.' },
  { id: 'wallhundred', group: 'Muurpilates', name: 'De honderd tegen de muur', note: 'Lig op je rug, voeten tegen de muur en knieën in een rechte hoek. Til hoofd en schouders op en pomp met gestrekte armen.' },
  { id: 'wallkick', group: 'Muurpilates', name: 'Been achteruit heffen', note: 'Steun met je handen tegen de muur. Til één been gestrekt naar achteren zonder je rug hol te trekken. Wissel van been.' },
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
