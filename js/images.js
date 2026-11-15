// ---------------------------------------------------------------
// images.js — bewaart de foto's van oefeningen.
//
// Foto's zijn te groot voor localStorage (daar past maar ~5 MB in).
// Daarom staan ze in IndexedDB, een grotere opslag in de browser.
// Bij het openen van de app laden we alle foto's één keer in het
// geheugen ("cache"), zodat de rest van de app ze meteen kan tonen.
//
// Een foto wordt bewaard als tekst (een "data-URL") met een id.
// Een oefening onthoudt alleen dat id.
// ---------------------------------------------------------------

const DB_NAME = 'tabata-timer';
const STORE = 'images';

const cache = new Map(); // id -> data-URL
let db = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Voert een bewerking uit op de opslag. Lukt dat niet, dan blijft de
// foto wel in het geheugen staan tot je de app sluit.
function write(action) {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    action(transaction.objectStore(STORE));
    transaction.oncomplete = resolve;
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  }).catch((err) => console.warn('Kon foto niet bewaren', err));
}

function readAll() {
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, 'readonly').objectStore(STORE);
    const keys = store.getAllKeys();
    const values = store.getAll();
    values.onsuccess = () => resolve(keys.result.map((key, i) => [key, values.result[i]]));
    values.onerror = keys.onerror = () => reject(values.error || keys.error);
  });
}

// Maakt een foto kleiner (max. 900 pixels) en zet ze om naar JPEG.
// Zo neemt een foto van de camera maar ~100 kB in plaats van enkele MB.
export async function shrinkImage(file, maxSize = 900, quality = 0.78) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; // witte achtergrond voor doorzichtige afbeeldingen
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const images = {
  // Eén keer aanroepen bij het starten van de app.
  async init() {
    try {
      db = await openDatabase();
      for (const [id, dataUrl] of await readAll()) cache.set(id, dataUrl);
    } catch (err) {
      console.warn('Foto-opslag niet beschikbaar', err);
      db = null;
    }
  },

  get: (id) => (id && cache.get(id)) || null,
  has: (id) => cache.has(id),

  set(id, dataUrl) {
    cache.set(id, dataUrl);
    return write((store) => store.put(dataUrl, id));
  },

  // Verwijdert alle foto's die niet (meer) gebruikt worden.
  // ids = de verzameling id's die wél nog in gebruik zijn.
  keepOnly(ids) {
    const unused = [...cache.keys()].filter((id) => !ids.has(id));
    if (!unused.length) return Promise.resolve();
    unused.forEach((id) => cache.delete(id));
    return write((store) => unused.forEach((id) => store.delete(id)));
  },

  // Geeft de gevraagde foto's terug als { id: data-URL }, voor de reservekopie.
  pick(ids) {
    const result = {};
    for (const id of ids) if (cache.has(id)) result[id] = cache.get(id);
    return result;
  },
};
