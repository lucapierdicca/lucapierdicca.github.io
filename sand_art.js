// Sand Art — simulazione dell'accumulo di sedimenti che formano una roccia
// Canvas a schermo intero, ridimensionabile. La sagoma della duna (altezza per
// colonna) è calcolata come rumore frattale di superficie, e colorata a fasce
// orizzontali di spessore uguale con un bordo mosso da un'onda di rumore, per
// strati dai contorni morbidi e sinuosi come in una roccia sedimentaria.

// Palette: toni da roccia sedimentaria
const ROCK_PALETTE = [
  [200, 170, 120],  // arenaria chiara
  [170, 90, 55],    // ossido di ferro / ruggine
  [230, 218, 185],  // calcare crema
  [80, 74, 68],     // scisto grigio scuro
  [205, 145, 55],   // ocra
  [175, 95, 70],    // terracotta
  [140, 140, 128],  // grigio-blu pallido
  [110, 70, 50],    // bruno sedimentario
];

const BG = [15, 12, 10];

function nextPaletteColor(exclude) {
  const choices = ROCK_PALETTE.filter(c => c !== exclude);
  return random(choices);
}

function buildBandColors(count) {
  const arr = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    prev = nextPaletteColor(prev);
    arr.push(prev);
  }
  return arr;
}

const CELL = 5; // dimensione di un granello (px)

let gCols, gRows, gridBuf;
let maskPattern;

// Maschera riutilizzabile per "arrotondare" ogni granello: un tassello CELL×CELL
// colorato di sfondo con un foro circolare trasparente al centro, applicato in
// un solo fillRect ripetuto su tutto il canvas — molto più economico che
// disegnare un cerchio per ogni granello
function buildGrainMask() {
  const m = createGraphics(CELL, CELL);
  m.pixelDensity(1);
  m.noStroke();
  m.fill(BG[0], BG[1], BG[2]);
  m.rect(0, 0, CELL, CELL);
  m.erase();
  m.ellipse(CELL / 2, CELL / 2, CELL * 0.9, CELL * 0.9);
  m.noErase();
  maskPattern = drawingContext.createPattern(m.elt, 'repeat');
}

const BAND_COUNT = 14; // numero di confini = BAND_COUNT+1, quindi BAND_COUNT fasce

let bands;      // costruito una volta: spessore, colori e parametri delle sinusoidi restano fissi
let jitterSeed; // fisso, altrimenti la texture dei granelli "brulicherebbe" a caso ad ogni frame

// Ogni confine k ha una propria sinusoide indipendente attorno alla sua
// posizione base (equidistante):
//   riga(k, c, t) = k·spessore + amp_k·sin(c·freq_k+φ_k+t·speed_k)     ← ondulazione orizzontale, scorre lateralmente
//                              + vAmp_k·sin(t·vFreq_k+vφ_k)            ← l'intero confine sale e scende nel tempo
// Non essendoci un'unica onda condivisa, le fasce non hanno tutte lo stesso
// spessore: si allargano e si restringono in punti diversi della larghezza.
// Entrambe le fasi avanzano nel tempo (lentamente) così i confini scorrono
// di lato e ondeggiano su e giù, ognuno con velocità e verso indipendenti
function buildBoundaries() {
  const thickness = gRows / BAND_COUNT;
  const boundaries = [];
  for (let k = 0; k <= BAND_COUNT; k++) {
    boundaries.push({
      base: k * thickness,
      freq: random(0.006, 0.02),
      phase: random(TWO_PI),
      amp: thickness * random(0.3, 0.9),
      speed: random(0.00004, 0.00012) * (random() < 0.5 ? 1 : -1), // rad/ms, verso casuale
      vAmp: thickness * random(0.15, 0.4),
      vFreq: random(0.00004, 0.00012),
      vPhase: random(TWO_PI),
    });
  }
  return { thickness, boundaries, colors: buildBandColors(BAND_COUNT + 6) };
}

// Riga del confine k in una data colonna, all'istante t (ms)
function boundaryRowAt(b, col, t) {
  return b.base
    + b.amp * sin(col * b.freq + b.phase + t * b.speed)
    + b.vAmp * sin(t * b.vFreq + b.vPhase);
}

// Tutti i confini in una colonna, resi monotoni: se il confine k finisse sopra
// il confine k-1 (le loro sinusoidi si incrociano), vi si aggancia — la fascia
// si assottiglia fino quasi a sparire invece di invertirsi
function boundariesForColumn(col, t) {
  const rows = bands.boundaries.map(b => boundaryRowAt(b, col, t));
  for (let i = 1; i < rows.length; i++) {
    if (rows[i] < rows[i - 1]) rows[i] = rows[i - 1];
  }
  return rows;
}

function bandIndexInColumn(row, colBoundaries) {
  for (let i = 0; i < colBoundaries.length - 1; i++) {
    if (row < colBoundaries[i + 1]) return i;
  }
  return colBoundaries.length - 2;
}

const VERTICAL_DRIFT_SPEED = 0.001; // celle al ms: traslazione continua verso il basso

// Calcola la sagoma all'istante t: riempie ogni cella del canvas, dalla prima
// all'ultima riga di ogni colonna, con il colore della sua fascia più un
// piccolo jitter per texture — così le fasce coprono sempre tutta la larghezza
// e tutta l'altezza, e si ridisegnano ogni frame man mano che i confini scorrono.
// Oltre a scorrere di lato e ondeggiare (vedi buildBoundaries), l'intera
// struttura trasla anche verso il basso: si campiona la riga con un offset che
// cresce nel tempo, avvolgendolo (wrap) così il ciclo si ripete senza scatti
function buildTargetShape(t) {
  const target = new Array(gCols * gRows);
  const drift = t * VERTICAL_DRIFT_SPEED;

  for (let c = 0; c < gCols; c++) {
    const colBoundaries = boundariesForColumn(c, t);

    for (let row = 0; row < gRows; row++) {
      const i = row * gCols + c;
      const sampleRow = ((row - drift) % gRows + gRows) % gRows;
      const bandIdx = bandIndexInColumn(sampleRow, colBoundaries);
      const base = bands.colors[bandIdx];
      const jitter = (noise(c * 0.8, sampleRow * 0.8, jitterSeed) - 0.5) * 26;
      target[i] = [
        constrain(base[0] + jitter, 0, 255),
        constrain(base[1] + jitter, 0, 255),
        constrain(base[2] + jitter, 0, 255),
      ];
    }
  }

  return target;
}

function renderSandArt(t) {
  const target = buildTargetShape(t);

  gridBuf.loadPixels();
  for (let i = 0; i < gCols * gRows; i++) {
    const col = target[i];
    const p = i * 4;
    gridBuf.pixels[p] = col[0];
    gridBuf.pixels[p + 1] = col[1];
    gridBuf.pixels[p + 2] = col[2];
    gridBuf.pixels[p + 3] = 255;
  }
  gridBuf.updatePixels();
}

function initSandArt() {
  gCols = floor(width / CELL);
  gRows = floor(height / CELL);

  gridBuf = createGraphics(gCols, gRows);
  gridBuf.pixelDensity(1);
  gridBuf.noStroke();

  bands = buildBoundaries();
  jitterSeed = random(1000);
}

function draw() {
  renderSandArt(millis());

  noSmooth();
  image(gridBuf, 0, 0, width, height);

  drawingContext.save();
  drawingContext.fillStyle = maskPattern;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());
  buildGrainMask();
  initSandArt();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initSandArt();
}
