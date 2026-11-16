// promo/films.js — de lijst van alle filmpjes: welke pagina, welk formaat en waar de video terechtkomt.
const path = require('path');
const root = path.join(__dirname, '..');

const FILMS = {
  // Het promofilmpje (wordt niet in de app gebruikt; de video's komen in promo/uit).
  staand: { page: 'film.html?layout=staand', size: { width: 1080, height: 1920 }, out: path.join(__dirname, 'uit', 'tabata-timer-staand.mp4'), crf: 19 },
  liggend: { page: 'film.html?layout=liggend', size: { width: 1920, height: 1080 }, out: path.join(__dirname, 'uit', 'tabata-timer-liggend.mp4'), crf: 19 },
  // De uitlegfilmpjes van de hulppagina (komen in de app zelf, map hulp/).
  // "poster" = het moment (in seconden) waarvan het stilstaande voorbeeld gemaakt wordt.
  installeren: { page: 'uitleg.html?film=installeren', size: { width: 1080, height: 1350 }, out: path.join(root, 'hulp', 'installeren.mp4'), crf: 25, scale: 720, poster: 13.2 },
  ontvangen: { page: 'uitleg.html?film=ontvangen', size: { width: 1080, height: 1350 }, out: path.join(root, 'hulp', 'ontvangen.mp4'), crf: 25, scale: 720, poster: 13.6 },
  vernieuwen: { page: 'uitleg.html?film=vernieuwen', size: { width: 1080, height: 1350 }, out: path.join(root, 'hulp', 'vernieuwen.mp4'), crf: 25, scale: 720, poster: 12.4 },
};

module.exports = { FILMS };
