# Sketch Cumbia Psichedelica

Progetto di partenza per creare visual in p5.js da usare live (led wall) con la vostra musica cumbia / psichedelica / sonidera.

## Struttura

- `index.html` — galleria: mostra un'anteprima live di ogni sketch con link per aprirlo a schermo intero (pensata anche per essere pubblicata online, vedi sotto)
- `<nome_sketch>.html` (es. `sand_art.html`, `paint_brush.html`...) — pagina che carica p5.js e il relativo script a schermo intero
- `<nome_sketch>.js` — qui sta il codice dei singoli visual
- `lib/` — funzioni riutilizzabili tra più sketch (vedi sezione dedicata più sotto)
- `README.md` — questo file

Per lavorare su un singolo sketch, apri direttamente il suo file `.html` (non serve
passare dalla galleria). Per aggiungere un nuovo sketch alla galleria, crea il suo
`.html` sul modello degli altri e aggiungi una card in `index.html`.

## Come aprirlo in PyCharm

1. Estrai la cartella `sketch_cumbia_psichedelica` dentro la tua cartella `Sketches` sul desktop
2. Apri la cartella come progetto in PyCharm (File > Open)
3. Apri `psi_points.html` nell'editor (o il file `.html` dello sketch su cui vuoi lavorare)
4. In alto a destra nell'editor (o nel margine a sinistra vicino al numero di riga)
   troverai le icone dei browser installati sul tuo computer: clicca su una per aprire
   il file direttamente nel browser
5. Ogni volta che modifichi `psi_points.js` e salvi, ricarica la pagina nel browser (F5)
   per vedere le modifiche

## Come funziona lo sketch di partenza

Lo sketch attuale disegna una griglia di cerchi che si muovono seguendo un campo di
"rumore" (Perlin noise), con colori che scorrono attraverso lo spettro cromatico —
un effetto fluido e psichedelico, pensato come base di partenza.

Parametri facili da modificare in `psi_points.js`:

- `cols` — quante colonne di cerchi (più alto = pattern più fitto)
- `t += 0.01` — velocità di evoluzione dell'animazione (più alto = più rapido)
- `hue = (angle * 60 + t * 40) % 360` — come cambia il colore nel tempo
- `background(0, 0, 5, 20)` — il valore `20` controlla quanto "rimane" la scia
  (più basso = scie più lunghe, più alto = pulizia più rapida del frame)

## Come pubblicarlo online / embeddarlo

Se vuoi un link pubblico da condividere o da inserire in un `<iframe>`:

- **GitHub Pages**: carica la cartella su un repository GitHub, attiva GitHub Pages
  nelle impostazioni del repo, ottieni un URL pubblico
- **Netlify / Vercel**: trascina la cartella nella loro interfaccia web (drag & drop),
  ottieni un link in pochi secondi

## Riusare effetti da altri sketch (trama granulosa, pennellate...)

Alcuni effetti sono stati estratti in file libreria dentro `lib/`, così si possono
riusare in un nuovo script senza doverli riscrivere:

- `lib/grain_texture.js` — trama granulosa (da `sand_art.js`)
- `lib/brush_strokes.js` — pennellate a "setole" (da `paint_brush.js`)

Per usarli in un nuovo sketch, aggiungi il relativo `<script>` nella pagina html
del tuo sketch (es. `mio_nuovo_sketch.html`), PRIMA dello script del tuo sketch:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
<script src="lib/grain_texture.js"></script>
<script src="lib/brush_strokes.js"></script>
<script src="mio_nuovo_sketch.js"></script>
```

Poi, nel tuo script, richiama le funzioni che espongono (vedi i commenti in cima
a ciascun file per le opzioni disponibili):

```js
let grain, brush;
function setup() {
  createCanvas(windowWidth, windowHeight);
  grain = createGrainTexture(5, [15, 12, 10]);
  brush = createBrushSystem();
}
function draw() {
  brush.update();
  grain.apply();
}
```

`sand_art.js` e `paint_brush.js` restano invariati (non usano questi file), quindi
continuano a funzionare esattamente come prima.

## Alternative rapide per sperimentare senza installare nulla

- p5.js Web Editor: https://editor.p5js.org
- CodePen: https://codepen.io (aggiungi p5.js come libreria esterna nelle impostazioni del pen)
