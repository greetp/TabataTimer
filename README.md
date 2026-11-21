# Tabata Timer

Een timer-app voor Tabata- en HIIT-trainingen, in de stijl van [pvmtdankaerts.be](https://www.pvmtdankaerts.be).
De app is een **web-app (PWA)**: je zet ze op het beginscherm van je iPhone en ze gedraagt zich als een gewone app
(schermvullend, eigen icoon, werkt zonder internet).

## Wat kan de app?

- **Meerdere gebruikers** – elk profiel heeft een eigen naam, kleur, trainingen en sessies.
- **Trainingen op maat** – voorbereiding, werk, rust, rondes, sets, rust tussen sets en cooling-down.
- **Op tijd of op aantal** – laat de timer aftellen, of werk met herhalingen (bv. 3 sets van 12) en tik op het
  vinkje als je klaar bent. Je kiest dit voor de hele training en kan er per oefening van afwijken,
  ook met een eigen tijd of een eigen aantal per oefening.
  Kies per training tussen een circuit en alle sets per oefening.
- **Links en rechts** – een oefening die je aan elke kant doet (bv. een zijplank) zet je in één keer in de lijst.
  De timer doet eerst links en dan rechts, met een wisselpauze die je zelf instelt.
- **Groepen** – orden je trainingen per groep (bv. Cardio, Kracht).
- **Oefeningen** – kies per training oefeningen uit een ingebouwde bibliotheek met tekeningen, of maak een eigen
  oefening met naam, uitleg, een eigen foto en een link naar een filmpje. De timer toont bij elke ronde wat je moet doen.
- **Duidelijke timer** – grote cijfers, een kleur per fase, pauze / vorige / volgende, piepjes op 3-2-1.
- **Geschiedenis** – alle afgewerkte sessies per dag, voor jezelf of voor iedereen (gegroepeerd per gebruiker).
  Tik op een sessie om de naam, het tijdstip of de duur te corrigeren. Je kan ook zelf een sessie toevoegen
  en de sessies van deze week of alle sessies wissen.
- **Delen** – stuur een training door via WhatsApp, Berichten of mail. De ontvanger krijgt een bericht met de uitleg
  en een link waarin de hele training zit.
- **Offline** – alles wordt op het toestel zelf bewaard. Er is geen account of server nodig.
- **Reservekopie** – exporteer alle gegevens naar een bestand en zet ze later terug, ook op een ander toestel.

## De app lokaal bekijken

Er is geen installatie of build-stap nodig. Je hebt alleen een eenvoudige webserver nodig.

1. Open een terminal in deze map.
2. Start een webserver:

   ```bash
   python3 -m http.server 4173
   ```

3. Open <http://localhost:4173> in je browser.

Tip: zet in Chrome of Safari de "responsive/mobiele weergave" aan om het iPhone-formaat te zien.

## De app online zetten (GitHub Pages)

Een iPhone kan de app alleen installeren vanaf een adres met `https`. GitHub Pages is daarvoor gratis.

1. Ga op GitHub naar deze repository en klik op **Settings**.
2. Klik links op **Pages**.
3. Kies bij **Source** voor **Deploy from a branch**.
4. Kies de branch (bv. `main`) en de map **/ (root)** en klik op **Save**.
5. Wacht een minuutje. Bovenaan verschijnt het adres, bv. `https://<gebruikersnaam>.github.io/TabataTimer/`.

De app staat nu op een eigen adres: **https://timer.pvmtdankaerts.be**. Dat adres staat in het bestand `CNAME`;
bij Combell verwijst een DNS-record (type CNAME, naam `timer`) naar `greetp.github.io`.

## De app op je iPhone zetten

1. Open het adres van hierboven in je browser op je iPhone, bijvoorbeeld **Safari** of **Chrome**.
2. Tik op de **drie puntjes** en kies **Deel**. Staat het **deel-icoon** (vierkantje met pijl omhoog) al in de balk,
   tik daar dan meteen op.
3. Kies **Zet op beginscherm** en tik op **Voeg toe**.
4. Open de app voortaan via het nieuwe icoon op je beginscherm.

In Chrome gaat het anders:

- **Chrome op een iPhone**: tik rechts van de adresbalk op het deel-icoon en kies **Toevoegen aan startscherm**.
- **Chrome op Android**: tik rechts van de adresbalk op de drie puntjes, kies **Installeren en snelkoppeling maken**
  en daarna **Installeren**.

Dezelfde stappen staan voor gebruikers op de hulppagina (`hulp/`).

Goed om te weten:

- **Geluid**: onder **Profiel → Geluid** staat de knop **Geluid testen**. Hoor je niets, zet dan het volume hoger.
  Met **Ook in stille modus** blijven de piepjes hoorbaar als je iPhone op stil staat; andere muziek kan daardoor
  pauzeren. Zet je dat uit, dan mengen de piepjes met je muziek, maar hoor je ze niet in stille modus.
- **Signaal halverwege**: twee korte piepjes op de helft van elke werkfase. Aan of uit te zetten onder **Profiel → Geluid**.
- Hou de app **open** tijdens je training. Het scherm blijft vanzelf aan, maar een web-app kan geen geluid
  maken als het toestel vergrendeld is.
- De gegevens staan **alleen op dat toestel**. Wis je de websitegegevens van je browser of verwijder je de app,
  dan zijn ook de profielen weg. Maak daarom af en toe een reservekopie (zie hieronder).

## Een training delen

**Versturen**

1. Open de training en tik onderaan op **Delen**.
2. Tik op **Delen via…** en kies WhatsApp, Berichten of mail.

**Ontvangen (app op het beginscherm)**

1. Hou het bericht ingedrukt en kies **Kopieer**.
2. Open de app en tik bij **Trainingen** op **Training ontvangen**.
3. Tik op **Toevoegen**.

Goed om te weten:

- Een link in een bericht opent op een iPhone altijd in de browser, niet in de app op het beginscherm. Daarom is het
  kopiëren nodig. Wie de app nog niet heeft, kan gewoon op de link tikken.
- Eigen foto's gaan niet mee, want die zijn te groot voor een link. Tekeningen uit de bibliotheek en links naar
  filmpjes gaan wel mee.

## Reservekopie maken en terugzetten

**Exporteren**

1. Ga in de app naar **Profiel**.
2. Tik onderaan op **Gegevens exporteren**.
3. Kies in het deelvenster waar het bestand naartoe gaat, bv. **Bewaar in Bestanden** of mail naar jezelf.

**Importeren**

1. Ga in de app naar **Profiel** en tik op **Gegevens importeren**.
2. Kies het bestand `tabata-reservekopie-….json`.
3. Kies wat er moet gebeuren:
   - **Samenvoegen** – voegt toe wat nog niet op het toestel staat. Niets wordt gewist.
   - **Alles vervangen** – wist alles op het toestel en zet de reservekopie in de plaats.

## Hulppagina

Op `hulp/` (in de app: **Profiel → Hulp en uitleg**) staat een pagina met veelgestelde vragen. Bij drie vragen hoort
een kort filmpje. De tekst pas je aan in `hulp/index.html`; elke vraag is daar een blok `<section class="help-item">`.

De filmpjes maak je opnieuw met de scripts in `promo/` (zie hieronder):

```bash
node promo/opnemen-hulp.js
```

```bash
node promo/maak-film.js installeren
```

```bash
node promo/maak-film.js ontvangen
```

```bash
node promo/maak-film.js vernieuwen
```

De schermen van Safari, het deelvenster en het beginscherm in die filmpjes zijn nagetekend in `promo/uitleg.html`.
Verandert Apple die schermen, dan pas je ze daar aan.

## Promofilmpje

In de map `promo/` staat alles om het promofilmpje te maken. Het filmpje is een webpagina (`promo/film.html`)
die beeld per beeld wordt omgezet naar een video. Je hebt Node.js, Playwright en ffmpeg nodig.

1. Start de app lokaal:

   ```bash
   python3 -m http.server 4173
   ```

2. Neem de schermen van de app op (met voorbeeldgegevens, geen echte namen):

   ```bash
   node promo/opnemen.js
   ```

3. Maak de staande video (1080 × 1920, voor WhatsApp en sociale media):

   ```bash
   node promo/maak-film.js staand
   ```

4. Maak de liggende video (1920 × 1080, voor de wachtzaal of de website):

   ```bash
   node promo/maak-film.js liggend
   ```

De video's komen in `promo/uit/`. De teksten pas je aan in `promo/film.html`; elke scène staat daar als een
blok met haar eigen tekst. Na een wijziging aan de app zelf voer je stap 2 opnieuw uit, zodat de schermen kloppen.

## Hoe zit de code in elkaar?

Werk je met Claude aan deze app? De afspraken en de stand van zaken staan in `CLAUDE.md`.


| Bestand | Wat doet het? |
|---|---|
| `index.html` | De lege pagina waarin de app geladen wordt. |
| `css/app.css` | Alle vormgeving (kleuren, lettertypes, knoppen, schermen). |
| `js/app.js` | Alle schermen en wat er gebeurt als je op een knop tikt. |
| `js/store.js` | Bewaart gebruikers, trainingen en sessies in `localStorage`. |
| `js/images.js` | Bewaart de eigen foto's van oefeningen (in IndexedDB) en verkleint ze. |
| `js/library.js` | De bibliotheek met klassieke oefeningen: naam, groep en uitleg. |
| `js/library-art.js` | De tekeningen van die oefeningen. Automatisch gemaakt, niet met de hand aanpassen. |
| `tools/teken-oefeningen.mjs` | Het script dat de tekeningen maakt. De app zelf heeft het niet nodig. |
| `js/timer.js` | De "motor": bouwt de fases op en houdt de tijd bij. |
| `js/sound.js` | De piepjes en de (optionele) gesproken stem. |
| `js/share.js` | Zet een training om naar een link en terug, om ze te delen. |
| `sw.js` | Service worker: zorgt dat de app zonder internet werkt. |
| `manifest.webmanifest` | Naam, icoon en kleuren voor op het beginscherm. |
| `hulp/` | De hulppagina met veelgestelde vragen en de drie uitlegfilmpjes. |
| `css/hulp.css` | Extra vormgeving voor de hulppagina. |
| `promo/` | Scripts en pagina's om het promofilmpje en de uitlegfilmpjes te maken. De app zelf heeft ze niet nodig. |
| `version.json` | Het versienummer van de app. |
| `assets/` | Logo en app-iconen. |
| `apple-touch-icon.png`, `favicon.ico` | Het app-icoon in de hoofdmap, waar browsers het standaard zoeken. |

### Een nieuwe versie uitbrengen

1. Doe je aanpassingen.
2. Verhoog het nummer in `version.json` (bv. van `1.2` naar `1.3`).
3. Zet alles op `main`. GitHub Pages publiceert de nieuwe versie vanzelf.

De app op de iPhone kijkt bij het openen en telkens ze weer naar voren komt of het nummer veranderd is,
en herlaadt zichzelf dan. Wil je niet wachten, tik dan in de app op **Profiel → App vernieuwen**.

### Een oefening aan de bibliotheek toevoegen

1. Voeg in `js/library.js` een regel toe aan `LIBRARY`, met een eigen `id` (bv. `calfraise`), een groep, een naam en uitleg.
2. Teken het figuurtje in `tools/teken-oefeningen.mjs`: voeg onder `DRAWINGS` een houding toe met hetzelfde `id`.
   Bovenaan dat bestand staat uitgelegd hoe je een houding beschrijft.
3. Maak de tekeningen opnieuw:

   ```bash
   node tools/teken-oefeningen.mjs
   ```

4. Verhoog het nummer in `version.json` en zet alles op `main`.

De uitleg bij een oefening aanpassen kan gewoon in `js/library.js`; daarvoor hoef je niets opnieuw te tekenen.

### Vaak gevraagde aanpassingen

- **Kleuren wijzigen** → bovenaan in `css/app.css`, onder `:root`.
- **Voorbeeldtrainingen voor nieuwe gebruikers** → `STARTER_WORKOUTS` in `js/store.js`.
- **Andere piepjes** → de functies `countdown`, `halfway`, `work`, `rest` en `finish` in `js/sound.js`.
- **Kleuren van de avatars** → `AVATAR_COLORS` in `js/store.js`.
