// ---------------------------------------------------------------
// tools/teken-oefeningen.mjs — tekent de figuurtjes van de
// oefeningenbibliotheek en schrijft ze naar js/library-art.js.
//
// Uitvoeren (vanuit de hoofdmap van het project):
//     node tools/teken-oefeningen.mjs
//
// Hoe werkt het?
// Een figuurtje bestaat uit lijnstukken met een vaste lengte (romp,
// bovenbeen, onderbeen, bovenarm, onderarm). Per houding geef je
// alleen de RICHTING van elk lijnstuk op, in graden:
//       0 = naar rechts     90 = naar beneden
//     180 = naar links     -90 = naar boven
// Het script rekent zelf uit waar de gewrichten dan komen. Zo blijven
// armen en benen in elke tekening even lang.
//
// De app zelf heeft dit script niet nodig; het wordt alleen gebruikt
// om de tekeningen (opnieuw) te maken.
// ---------------------------------------------------------------

import { writeFileSync } from 'node:fs';

const COLOR = {
  main: '#174d50', // petrol: de houding die je moet aannemen
  far: '#5f8c8d', // arm en been aan de achterkant, iets lichter
  ghost: '#a6d4d2', // cyaan: de beginhouding
  bg: '#edf6f1', // mint: achtergrond
  ground: '#c3d5ce', // de grond
  prop: '#d6d1cd', // muur, bank ...
  arrow: '#87c7c6',
};

// Lengtes van de lichaamsdelen (het tekenvlak is 120 x 120).
const LEN = { torso: 27, thigh: 19.5, shin: 19.5, upperArm: 13.5, foreArm: 12.5, foot: 6.5, neck: 4.5, head: 7 };
const LIMB = 6.5; // dikte van armen en benen
const TORSO = 8.5; // dikte van de romp
const GROUND = 109;

const n = (value) => Math.round(value * 10) / 10;
const step = ([x, y], degrees, length) => [x + Math.cos((degrees * Math.PI) / 180) * length, y + Math.sin((degrees * Math.PI) / 180) * length];
const line = (points, color, width) =>
  `<polyline points="${points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

// Tekent één figuurtje in zijaanzicht (kijkt naar rechts).
//   at:      [gewricht, [x, y]]  -> zet dat gewricht op die plaats
//   torso:   richting van heup naar schouder
//   head:    richting van schouder naar hoofd (standaard = torso)
//   leg:     [bovenbeen, onderbeen, voet]   (voorste been)
//   farLeg:  idem voor het achterste been (standaard = leg)
//   arm:     [bovenarm, onderarm]           (voorste arm)
//   farArm:  idem voor de achterste arm (standaard = arm)
function figure(pose, ghost = false) {
  const leg = (hip, [thigh, shin, foot = shin - 90]) => {
    const knee = step(hip, thigh, LEN.thigh);
    const ankle = step(knee, shin, LEN.shin);
    return { knee, ankle, toe: step(ankle, foot, LEN.foot) };
  };
  const arm = (shoulder, [upper, fore]) => {
    const elbow = step(shoulder, upper, LEN.upperArm);
    return { elbow, hand: step(elbow, fore, LEN.foreArm) };
  };

  // Eerst alles uitrekenen met de heup op (0, 0) ...
  const hip = [0, 0];
  const shoulder = step(hip, pose.torso, LEN.torso);
  const head = step(shoulder, pose.head ?? pose.torso, LEN.neck + LEN.head);
  const near = { ...leg(hip, pose.leg), ...arm(shoulder, pose.arm) };
  const far = { ...leg(hip, pose.farLeg || pose.leg), ...arm(shoulder, pose.farArm || pose.arm) };
  const joints = { hip, shoulder, head, ...near, farKnee: far.knee, farAnkle: far.ankle, farToe: far.toe, farElbow: far.elbow, farHand: far.hand };

  // ... en dan het hele figuurtje verschuiven tot het gekozen gewricht op zijn plaats staat.
  const [name, [tx, ty]] = pose.at;
  const dx = tx - joints[name][0];
  const dy = ty - joints[name][1];
  const p = (key) => [joints[key][0] + dx, joints[key][1] + dy];

  const main = ghost ? COLOR.ghost : COLOR.main;
  const back = ghost ? COLOR.ghost : COLOR.far;
  const parts = [];
  if (pose.farArm) parts.push(line([p('shoulder'), p('farElbow'), p('farHand')], back, LIMB));
  if (pose.farLeg) parts.push(line([p('hip'), p('farKnee'), p('farAnkle'), p('farToe')], back, LIMB));
  parts.push(line([p('hip'), p('shoulder')], main, TORSO));
  parts.push(`<circle cx="${n(p('head')[0])}" cy="${n(p('head')[1])}" r="${LEN.head}" fill="${main}"/>`);
  parts.push(line([p('hip'), p('knee'), p('ankle'), p('toe')], main, LIMB));
  parts.push(line([p('shoulder'), p('elbow'), p('hand')], main, LIMB));
  return parts.join('');
}

// Tekent één figuurtje in vooraanzicht (voor de jumping jack).
//   legs: hoek van de benen t.o.v. recht naar beneden;  arms: hoek van de armen t.o.v. recht naar beneden
function frontFigure({ x, footY, legs, arms }, ghost = false) {
  const color = ghost ? COLOR.ghost : COLOR.main;
  const rad = (d) => (d * Math.PI) / 180;
  const LEG = LEN.thigh + LEN.shin;
  const ARM = LEN.upperArm + LEN.foreArm;
  const hipY = footY - Math.cos(rad(legs)) * LEG;
  const shoulderY = hipY - LEN.torso;
  const parts = [];
  for (const side of [-1, 1]) {
    const hip = [x + side * 4.5, hipY];
    const foot = [hip[0] + side * Math.sin(rad(legs)) * LEG, footY];
    parts.push(line([hip, foot, [foot[0] + side * 4.5, foot[1]]], color, LIMB));
    const shoulder = [x + side * 9, shoulderY];
    parts.push(line([shoulder, [shoulder[0] + side * Math.sin(rad(arms)) * ARM, shoulderY + Math.cos(rad(arms)) * ARM]], color, LIMB));
  }
  parts.push(line([[x - 9, shoulderY], [x + 9, shoulderY]], color, LIMB));
  parts.push(line([[x, hipY], [x, shoulderY]], color, TORSO + 3));
  parts.push(`<circle cx="${n(x)}" cy="${n(shoulderY - LEN.neck - LEN.head - 1)}" r="${LEN.head}" fill="${color}"/>`);
  return parts.join('');
}

const ground = `<line x1="8" y1="${GROUND}" x2="112" y2="${GROUND}" stroke="${COLOR.ground}" stroke-width="2.5" stroke-linecap="round"/>`;
const flip = (content) => `<g transform="translate(120 0) scale(-1 1)">${content}</g>`;

// Een muur: x = waar de muur begint (van links geteld).
const wall = (x) => `<rect x="${x}" y="12" width="13" height="${GROUND - 12}" rx="3" fill="${COLOR.prop}"/>`;
// Een muur achter het figuurtje (vooraanzicht).
const wallBehind = `<rect x="14" y="10" width="92" height="${GROUND - 10}" rx="6" fill="#e6e2dc"/>`;

// ---------------- De houdingen ----------------

const squatDown = { at: ['ankle', [54, 103]], torso: -62, leg: [12, 112], arm: [5, -8] };
const jump = (x, y) => ({ at: ['ankle', [x, y]], torso: -90, leg: [93, 87, 55], arm: [-52, -62] });

const DRAWINGS = {
  squat: figure({ at: ['ankle', [54, 103]], torso: -90, leg: [90, 90], arm: [90, 90] }, true) + figure(squatDown),

  jumpsquat: figure(squatDown, true) + figure(jump(58, 98)),

  lunge: figure({ at: ['ankle', [82, 103]], torso: -88, leg: [8, 90], farLeg: [112, 172, 95], arm: [104, 78] }),

  wallsit:
    `<rect x="16" y="14" width="13" height="${GROUND - 14}" rx="3" fill="${COLOR.prop}"/>` +
    figure({ at: ['hip', [34, 84]], torso: -90, leg: [0, 90], arm: [70, 8] }),

  bridge:
    figure({ at: ['shoulder', [36, 101]], torso: 180, head: 180, leg: [-42, 55], arm: [4, 0] }, true) +
    figure({ at: ['shoulder', [36, 101]], torso: 158, head: 180, leg: [-22, 90], arm: [4, 0] }),

  pushup:
    figure({ at: ['ankle', [18, 101]], torso: -7, head: -5, leg: [173, 173, 100], arm: [156, 27] }, true) +
    figure({ at: ['ankle', [18, 101]], torso: -20, head: -12, leg: [160, 160, 100], arm: [90, 90] }),

  dip:
    `<rect x="10" y="80" width="33" height="${GROUND - 80}" rx="3" fill="${COLOR.prop}"/>` +
    figure({ at: ['hip', [48, 92]], torso: 262, head: 270, leg: [-8, 50, -30], arm: [165, 40] }, true) +
    figure({ at: ['hip', [50, 79]], torso: 260, head: 270, leg: [12, 68, -30], arm: [97, 98] }),

  plank: figure({ at: ['ankle', [16, 101]], torso: -10, head: -5, leg: [170, 170, 100], arm: [90, 0] }),

  sideplank: flip(figure({ at: ['ankle', [16, 101]], torso: -22, head: -30, leg: [158, 158, 100], arm: [-90, -90], farArm: [90, 90] })),

  mountainclimber: figure({ at: ['hand', [86, 104]], torso: -22, head: -12, leg: [15, 150, 100], farLeg: [158, 158, 100], arm: [90, 90] }),

  situp:
    figure({ at: ['hip', [62, 101]], torso: 180, head: 180, leg: [-50, 58], arm: [0, 0] }, true) +
    figure({ at: ['hip', [62, 101]], torso: 232, head: 240, leg: [-50, 58], arm: [15, 5] }),

  russiantwist:
    figure({ at: ['hip', [50, 101]], torso: 245, head: 255, leg: [-38, 15, -50], arm: [35, -5] }) +
    `<path d="M58 72 Q70 60 82 72" fill="none" stroke="${COLOR.arrow}" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M57 65 L58 72 L65 71 M83 65 L82 72 L75 71" fill="none" stroke="${COLOR.arrow}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,

  legraise:
    figure({ at: ['hip', [56, 101]], torso: 180, head: 180, leg: [-10, -10, -100], arm: [2, 0] }, true) +
    figure({ at: ['hip', [56, 101]], torso: 180, head: 180, leg: [-58, -58, -148], arm: [2, 0] }),

  superman: figure({ at: ['hip', [50, 101]], torso: -17, head: -42, leg: [196, 196, 205], arm: [-6, -10] }),

  birddog: figure({ at: ['hip', [54, 84]], torso: -15, head: -8, leg: [180, 180, 185], farLeg: [90, 180, 180], arm: [-12, -12], farArm: [90, 90] }),

  jumpingjack: frontFigure({ x: 60, footY: 104, legs: 4, arms: 12 }, true) + frontFigure({ x: 60, footY: 104, legs: 22, arms: 145 }),

  highknees: figure({ at: ['farAnkle', [56, 103]], torso: -88, leg: [-5, 95], farLeg: [90, 90], arm: [130, 60], farArm: [40, -50] }),

  burpee: figure({ at: ['ankle', [30, 103]], torso: -35, head: -20, leg: [-22, 115], arm: [80, 85] }, true) + figure(jump(84, 98)),

  // Op de zij liggen; het bovenste been gaat gestrekt omhoog.
  // Drie dingen tonen dat het figuurtje op de zij ligt en niet op de rug:
  // het hoofd rust op de hand, de bovenste hand ligt op de heup (elleboog steekt uit),
  // en de voeten wijzen in het verlengde van het been in plaats van omhoog.
  sidelegraise: (() => {
    const side = (topLeg) => ({ at: ['hip', [62, 100]], torso: 186, head: 235, leg: [topLeg, topLeg, topLeg], farLeg: [0, 0, 0], arm: [-40, 38], farArm: [170, -72] });
    return figure(side(-7), true) + figure(side(-36));
  })(),

  // Bruggetje met één been gestrekt omhoog; heupen omhoog en traag laten zakken.
  singlebridge:
    figure({ at: ['shoulder', [36, 101]], torso: 180, head: 180, leg: [-70, -70, -160], farLeg: [-42, 55], arm: [4, 0] }, true) +
    figure({ at: ['shoulder', [36, 101]], torso: 158, head: 180, leg: [-62, -62, -152], farLeg: [-22, 90], arm: [4, 0] }),

  // ---------------- Muurpilates ----------------

  // Rug tegen de muur, voeten een stap naar voren; naar voren afrollen.
  wallrolldown:
    wall(16) +
    figure({ at: ['ankle', [44, 103]], torso: -90, leg: [76, 76, 0], arm: [90, 90] }, true) +
    figure({ at: ['ankle', [44, 103]], torso: 35, head: 62, leg: [76, 76, 0], arm: [90, 90] }),

  // Vooraanzicht: armen glijden langs de muur omhoog.
  wallangel: wallBehind + frontFigure({ x: 60, footY: 104, legs: 5, arms: 95 }, true) + frontFigure({ x: 60, footY: 104, legs: 5, arms: 152 }),

  // Schuin tegen de muur leunen en uitduwen.
  wallpushup:
    wall(96) +
    figure({ at: ['ankle', [53, 103]], torso: -68, head: -62, leg: [112, 112, 20], arm: [50, -49] }, true) +
    figure({ at: ['ankle', [53, 103]], torso: -75, head: -72, leg: [105, 105, 10], arm: [0, 0] }),

  // Op de rug, voeten plat tegen de muur; heupen omhoog.
  wallbridge:
    wall(98) +
    figure({ at: ['shoulder', [35, 101]], torso: 180, head: 180, leg: [-46.2, 0, -90], arm: [2, 0] }, true) +
    figure({ at: ['shoulder', [35, 101]], torso: 157, head: 180, leg: [-30.8, 19.3, -90], arm: [2, 0] }),

  // Op de rug, benen recht omhoog tegen de muur; één been zakt naar je toe.
  wallscissor:
    wall(96) +
    figure({ at: ['hip', [90, 101]], torso: 180, head: 180, leg: [-138, -138, 135], farLeg: [-90, -90, 180], arm: [2, 0] }),

  // Op de rug, voeten tegen de muur, hoofd en schouders op; pompen met de armen.
  wallhundred:
    wall(98) +
    figure({ at: ['hip', [75.5, 101]], torso: 196, head: 208, leg: [-90, 0, -90], arm: [10, 4] }) +
    `<path d="M57 76 v12 M53 80 L57 76 l4 4 M53 84 L57 88 l4 -4" fill="none" stroke="${COLOR.arrow}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,

  // Handen tegen de muur, één been gestrekt naar achteren.
  wallkick:
    wall(96) +
    figure({ at: ['farAnkle', [65, 103]], torso: -78, head: -74, leg: [150, 150, 215], farLeg: [90, 90, 0], arm: [5, -5] }),
};

// ---------------- Wegschrijven ----------------

const svg = (content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${COLOR.bg}"/>${ground}${content}</svg>`;

const entries = Object.entries(DRAWINGS).map(([id, content]) => `  ${id}: '${svg(content)}',`);
const output = `// ---------------------------------------------------------------
// library-art.js — de tekeningen van de oefeningenbibliotheek.
//
// DIT BESTAND IS AUTOMATISCH GEMAAKT. Pas het niet met de hand aan:
// wijzig de houdingen in tools/teken-oefeningen.mjs en voer daarna uit:
//     node tools/teken-oefeningen.mjs
// ---------------------------------------------------------------

export const ART = {
${entries.join('\n')}
};
`;
writeFileSync(new URL('../js/library-art.js', import.meta.url), output);
console.log(`${entries.length} tekeningen geschreven naar js/library-art.js`);
