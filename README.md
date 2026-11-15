# Tabata Timer

Een timer-app voor Tabata- en HIIT-trainingen, in de stijl van [pvmtdankaerts.be](https://www.pvmtdankaerts.be).
De app is een **web-app (PWA)**: je zet ze op het beginscherm van je iPhone en ze gedraagt zich als een gewone app
(schermvullend, eigen icoon, werkt zonder internet).

## Wat kan de app?

- **Meerdere gebruikers** – elk profiel heeft een eigen naam, kleur, trainingen en sessies.
- **Trainingen op maat** – voorbereiding, werk, rust, rondes, sets, rust tussen sets en cooling-down.
- **Groepen** – orden je trainingen per groep (bv. Cardio, Kracht).
- **Duidelijke timer** – grote cijfers, een kleur per fase, pauze / vorige / volgende, piepjes op 3-2-1.
- **Geschiedenis** – alle afgewerkte sessies per dag, voor jezelf of voor iedereen (gegroepeerd per gebruiker).
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

## De app op je iPhone zetten

1. Open het adres van hierboven in **Safari** op je iPhone.
2. Tik onderaan op het **deel-icoon** (vierkantje met pijl omhoog).
3. Kies **Zet op beginscherm** en tik op **Voeg toe**.
4. Open de app voortaan via het nieuwe icoon op je beginscherm.

Goed om te weten:

- Zet de **stille modus** van je iPhone uit als je de piepjes wil horen.
- Hou de app **open** tijdens je training. Het scherm blijft vanzelf aan, maar een web-app kan geen geluid
  maken als het toestel vergrendeld is.
- De gegevens staan **alleen op dat toestel**. Wis je de websitegegevens van Safari of verwijder je de app,
  dan zijn ook de profielen weg. Maak daarom af en toe een reservekopie (zie hieronder).

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

## Hoe zit de code in elkaar?

| Bestand | Wat doet het? |
|---|---|
| `index.html` | De lege pagina waarin de app geladen wordt. |
| `css/app.css` | Alle vormgeving (kleuren, lettertypes, knoppen, schermen). |
| `js/app.js` | Alle schermen en wat er gebeurt als je op een knop tikt. |
| `js/store.js` | Bewaart gebruikers, trainingen en sessies in `localStorage`. |
| `js/timer.js` | De "motor": bouwt de fases op en houdt de tijd bij. |
| `js/sound.js` | De piepjes en de (optionele) gesproken stem. |
| `sw.js` | Service worker: zorgt dat de app zonder internet werkt. |
| `manifest.webmanifest` | Naam, icoon en kleuren voor op het beginscherm. |
| `assets/` | Logo en app-iconen. |

### Vaak gevraagde aanpassingen

- **Kleuren wijzigen** → bovenaan in `css/app.css`, onder `:root`.
- **Voorbeeldtrainingen voor nieuwe gebruikers** → `STARTER_WORKOUTS` in `js/store.js`.
- **Andere piepjes** → de functies `countdown`, `work`, `rest` en `finish` in `js/sound.js`.
- **Kleuren van de avatars** → `AVATAR_COLORS` in `js/store.js`.
