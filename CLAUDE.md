# Tabata Timer – afspraken voor Claude

Dit bestand wordt gelezen bij het begin van elke nieuwe sessie. Het vat samen wat er afgesproken is en
wat je moet weten voor je iets verandert. De uitleg voor mensen staat in `README.md`.

## Wat dit is

Een timer voor Tabata- en HIIT-trainingen, gemaakt voor de gezondheidspraktijk PVMT. Het is een web-app
(PWA) die patiënten op het beginscherm van hun telefoon zetten.

- **Live**: https://timer.pvmtdankaerts.be (hulppagina: `/hulp/`)
- **Hosting**: GitHub Pages vanaf `main`, map `/ (root)`. Het adres staat in `CNAME`; bij Combell verwijst
  een DNS-record (type CNAME, naam `timer`) naar `greetp.github.io`.
- **Geen server, geen accounts.** Alle gegevens staan op het toestel van de gebruiker.

## Met wie je werkt

- De eigenaar is webontwikkelaar, maar geen sterke programmeur. Leg wijzigingen uit in duidelijke stappen.
- Antwoord in het Nederlands. Alle tekst in de app is Nederlands, in de je-vorm, warm en eenvoudig.
- Commentaar in de code is Nederlands en legt uit waarom iets gebeurt.

## Werkwijze

1. Werk op de werkbranch, nooit rechtstreeks op `main`.
2. Test in een browser op iPhone-formaat (zie "Testen").
3. Zet het werk op de branch en vraag of je een pull request mag aanmaken. De eigenaar voegt zelf samen.
4. Na het samenvoegen publiceert GitHub Pages vanzelf (1–2 minuten). Kijk daarna na of
   `https://timer.pvmtdankaerts.be/version.json` het nieuwe nummer geeft.

### Bij elke wijziging aan de app

- **Verhoog het nummer in `version.json`.** De app vergelijkt dit nummer en herlaadt zichzelf als het
  online veranderd is. Zonder nieuw nummer krijgen gebruikers de wijziging niet vlot.
- **Verhoog `CACHE` in `sw.js`** (bv. `tabata-timer-v11` → `v12`).
- **Nieuw bestand dat offline moet werken?** Zet het in de lijst `FILES` in `sw.js`.
- Alleen documentatie gewijzigd (zoals dit bestand)? Dan hoeft het nummer niet omhoog.

## Hoe de code in elkaar zit

Geen build-stap, geen frameworks: gewone HTML, CSS en JavaScript-modules. Hou dat zo.

| Bestand | Rol |
|---|---|
| `index.html` | Lege pagina waarin de app geladen wordt |
| `js/app.js` | Alle schermen en acties. Knoppen hebben `data-action="..."`; de lijst `actions` zegt wat er gebeurt |
| `js/timer.js` | De motor: `buildPhases()` maakt de fases, `Runner` houdt de tijd bij. Geen HTML |
| `js/store.js` | Gegevens in `localStorage` (sleutel `tabata-timer.v1`), reservekopie, controle van invoer van buitenaf |
| `js/images.js` | Eigen foto's van oefeningen, in IndexedDB, verkleind tot 900 px |
| `js/library.js` + `js/library-art.js` | De oefeningenbibliotheek en haar tekeningen |
| `js/share.js` | Een training omzetten naar een link en terug |
| `js/sound.js` | Piepjes (Web Audio) en de optionele stem |
| `sw.js` | Service worker: eerst het netwerk, anders de bewaarde kopie |
| `hulp/` | Hulppagina met veelgestelde vragen en drie uitlegfilmpjes |
| `promo/` | Scripts en pagina's om de filmpjes te maken. De app gebruikt deze map niet |
| `tools/teken-oefeningen.mjs` | Tekent de figuurtjes en schrijft `js/library-art.js` |

### Regels in de code

- **Tekst van de gebruiker altijd door `esc()`** voor ze in HTML komt.
- **Alles wat van buitenaf komt wordt nagekeken**: een reservekopie via `readBackup()`, een gedeelde
  training via `sanitizeWorkout()`. Voeg je een veld toe aan een training of oefening, voeg het dan ook
  daar toe, en in `pack()`/`unpack()` in `js/share.js`.
- **Oude gegevens moeten blijven werken.** Trainingen van vóór een wijziging missen nieuwe velden; geef
  die een standaardwaarde bij het lezen.
- `js/library-art.js` is automatisch gemaakt. Pas de houdingen aan in `tools/teken-oefeningen.mjs` en
  voer `node tools/teken-oefeningen.mjs` uit.

## Stijl

Volg de live website pvmtdankaerts.be, niet een ouder huisstijldocument. De kleuren staan bovenaan
`css/app.css` onder `:root`:

- papier `#f7f5ef`, oppervlak `#fffef9`, inkt `#1a1b20`
- petrol `#174d50` (knoppen, werkfase), cyaan `#87c7c6` (rustfase), zacht cyaan `#dcefed`, mint `#edf6f1`
- lettertype `"Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif`
- ronde knoppen (`border-radius: 999px`), kaarten met `1.5rem`, titels vet met krappe letterafstand,
  kleine hoofdletter-labels met een streepje ervoor (`.eyebrow`)

De tekeningen van oefeningen: eenvoudige figuurtjes, eindhouding in petrol, beginhouding in lichtcyaan,
achtergrond mint.

## Testen

Er staan geen automatische tests in de repository. Kijk een wijziging zo na:

1. Start de app: `python3 -m http.server 4173`
2. Doorloop ze met Playwright in een venster van 390 × 844 (iPhone-formaat), met `serviceWorkers: 'block'`,
   en let op fouten in de console.
3. Kijk ook 320 × 568 na voor het timerscherm: daar is de ruimte het krapst.
4. De logica van `js/timer.js` kan je los testen in Node door `Date.now` en `requestAnimationFrame` te vervangen.

Zeg altijd eerlijk wat alleen in de testbrowser is nagekeken en wat op een echt toestel.

## Nog niet bevestigd op een echt toestel

- Het app-icoon bij installatie via Chrome op een iPhone (opgelost in 1.11 door het icoon in de hoofdmap
  te zetten, maar niet bevestigd).
- De stappen voor Chrome op de hulppagina: overgenomen uit de hulp van Google, niet uitgeprobeerd.
- De app op Android: nooit getest.
- De uitleg bij de oefeningen in `js/library.js` is nog niet nagelezen door een kinesitherapeut.
- De schermen van Safari, het deelvenster en het beginscherm in de uitlegfilmpjes zijn nagetekend
  (`promo/uitleg.html`), geen echte opnames.

## Bekende grenzen (bewuste keuzes)

- Op tijd of op aantal kies je voor de training, en een oefening kan ervan afwijken (veld `mode` van de
  oefening; leeg = volgt de training). Een oefening op tijd kan ook een eigen tijd hebben (veld `work`;
  leeg = de werktijd van de training), net zoals een oefening op aantal een eigen aantal heeft (`reps`).
- Een oefening met "links en rechts" (veld `sides`) geeft twee werkfases. De tijd of het aantal geldt per kant.
  Ertussen komt de wisselpauze (`switchRest` van de training, standaard 5 s; 0 = meteen door), ook bij een
  oefening op aantal: na het vinkje telt eerst "Wissel van kant" af.
- In de bibliotheek start alleen de zijplank met "links en rechts" aan (`sides: true` in `js/library.js`).
  In een gedeelde link betekent alleen de code van een oefening altijd "zonder links en rechts", zodat
  links van vóór 1.12 hetzelfde blijven doen.
- Eigen foto's gaan niet mee bij het delen van een training: ze zijn te groot voor een link.
- Een link in een bericht opent in de browser, niet in de app op het beginscherm, en die twee bewaren
  hun gegevens apart. Daarom kopieert de ontvanger het bericht en plakt hij het via "Training ontvangen".
- Geen synchronisatie tussen toestellen. Overzetten kan met "Gegevens exporteren" en "importeren".
- Een web-app kan op een iPhone geen geluid maken met het scherm vergrendeld.
- Met "Ook in stille modus" aan kan andere muziek pauzeren wanneer de timer start.

## Filmpjes

- De drie uitlegfilmpjes staan in `hulp/` en horen bij de app.
- De twee promofilmpjes (staand en liggend) staan **niet** in de repository; ze worden gemaakt in
  `promo/uit/` en die map staat in `.gitignore`.
- Opnieuw maken: zie "Promofilmpje" en "Hulppagina" in `README.md`.
- In de filmpjes staan de voorbeeldnamen Emma, Noah en Lotte. Gebruik nooit echte namen of gegevens.

## Ideeën die besproken maar niet gestart zijn

- Een echte iPhone-app via Xcode, door de web-app in te pakken met Capacitor. Voorgestelde code:
  `be.pvmtdankaerts.tabatatimer`. Eerst wordt de web-app uitgeprobeerd.
