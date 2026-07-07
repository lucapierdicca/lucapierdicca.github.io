// Pattern andini procedurali in stile "maglia jacquard" (fair-isle) con formazione a superpixel
// Canvas a schermo intero, ridimensionabile | sfondo scuro, fasce di bordo con
// zigzag/rombi ripetuti e un grande glifo simmetrico generato proceduralmente al
// centro. Ogni superpixel è disegnato come un punto a maglia (una "V") e ogni
// pattern si materializza gradualmente, un punto alla volta in ordine casuale,
// sfumando dal colore precedente a quello corretto. Solo a formazione completata
// può iniziare il pattern successivo.

const BLOCK = 20;           // dimensione dei superpixel/punti a maglia (più piccoli di 40x40)
let COLS, ROWS, N;          // ricalcolati in base alla dimensione della finestra

const FORM_DURATION = 3500; // ms: tempo totale in cui i superpixel iniziano la loro transizione
const CELL_FADE_MS  = 350;  // ms: durata della sfumatura di colore di un singolo superpixel
const HOLD_TIME      = 2500; // ms: pausa a pattern completamente formato prima del prossimo

// Palette ispirate ai tessuti andini: sfondo scuro + colori d'accento per fasce e glifo
const PALETTES = [
  { bg: [58, 52, 50], accents: [[64, 181, 157], [230, 148, 36], [178, 40, 48], [163, 160, 156]] },
  { bg: [48, 44, 46], accents: [[214, 150, 40], [176, 44, 58], [70, 150, 150], [190, 186, 180]] },
  { bg: [40, 46, 44], accents: [[224, 120, 44], [40, 120, 108], [198, 58, 60], [214, 204, 180]] },
];

let cells = [];         // stato per superpixel: colore attuale, colore di partenza/destinazione, timing
let paletteCurrent;
let currentBg = [20, 20, 20];
let formationActive = false;
let holdUntil = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());
  noStroke();

  paletteCurrent = random(PALETTES);
  initGrid();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGrid();
}

// Ricalcola la griglia di superpixel in base alla dimensione corrente del
// canvas e riparte con una formazione da zero (le dimensioni sono cambiate,
// lo stato precedente dei superpixel non è più valido)
function initGrid() {
  COLS = ceil(width / BLOCK);
  ROWS = ceil(height / BLOCK);
  N = COLS * ROWS;

  cells = [];
  for (let i = 0; i < N; i++) {
    cells.push({ color: [0, 0, 0], fromColor: [0, 0, 0], toColor: [0, 0, 0], startTime: 0, endTime: 0 });
  }

  currentBg = paletteCurrent.bg;
  formationActive = false;
  holdUntil = 0;
  startFormation(generatePatternColors(paletteCurrent));
}

function draw() {
  background(currentBg[0], currentBg[1], currentBg[2]);

  let allDone = true;
  const now = millis();

  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const c = cells[cy * COLS + cx];
      const t = constrain(map(now, c.startTime, c.endTime, 0, 1), 0, 1);
      c.color = lerpRGB(c.fromColor, c.toColor, t);
      if (t < 1) allDone = false;

      drawStitch(cx * BLOCK, cy * BLOCK, BLOCK, c.color);
    }
  }

  if (formationActive && allDone) {
    formationActive = false;
    holdUntil = now + HOLD_TIME;
  }

  if (!formationActive && now > holdUntil) {
    paletteCurrent = randomPaletteDiverseFrom(paletteCurrent);
    currentBg = paletteCurrent.bg;
    startFormation(generatePatternColors(paletteCurrent));
  }
}

// Disegna un singolo superpixel come un punto a maglia: una "V" divisa in due
// metà con rilievo chiaro/scuro, per imitare la texture della maglia jacquard
function drawStitch(x, y, s, col) {
  const light = [constrain(col[0] * 1.18, 0, 255), constrain(col[1] * 1.18, 0, 255), constrain(col[2] * 1.18, 0, 255)];
  const dark  = [constrain(col[0] * 0.80, 0, 255), constrain(col[1] * 0.80, 0, 255), constrain(col[2] * 0.80, 0, 255)];

  const p = (u, v) => [x + u * s, y + v * s];
  const outerL = p(0, 0), outerR = p(1, 0);
  const tip = p(0.5, 0.62);
  const innerTip = p(0.5, 0.34);
  const innerL = p(0.24, 0), innerR = p(0.76, 0);

  noStroke();
  fill(light[0], light[1], light[2]);
  quad(outerL[0], outerL[1], tip[0], tip[1], innerTip[0], innerTip[1], innerL[0], innerL[1]);

  fill(dark[0], dark[1], dark[2]);
  quad(outerR[0], outerR[1], tip[0], tip[1], innerTip[0], innerTip[1], innerR[0], innerR[1]);
}

// Avvia la formazione di un nuovo pattern: ogni superpixel parte dal proprio
// colore attuale e viene programmato per sfumare verso il colore target,
// in un istante casuale (ordine mescolato) entro FORM_DURATION
function startFormation(targetColors) {
  const order = shuffle([...Array(N).keys()]);
  const stagger = FORM_DURATION / N;
  const now = millis();

  for (let k = 0; k < N; k++) {
    const idx = order[k];
    const c = cells[idx];
    c.fromColor = c.color.slice();
    c.toColor = targetColors[idx];
    c.startTime = now + k * stagger + random(-stagger * 0.4, stagger * 0.4);
    c.endTime = c.startTime + CELL_FADE_MS;
  }

  formationActive = true;
}

function lerpRGB(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function randomPaletteDiverseFrom(pal) {
  const choices = PALETTES.filter(p => p !== pal);
  return random(choices);
}

// Genera un pattern in stile fair-isle: sfondo scuro, fasce di bordo a zigzag,
// fasce secondarie con piccoli rombi ripetuti, e un glifo simmetrico al centro
function generatePatternColors(palette) {
  const bg = palette.bg;
  const accents = palette.accents;
  const colors = new Array(N);
  for (let i = 0; i < N; i++) colors[i] = bg;

  const borderColor = random(accents);
  const secondaryColor = random(accents.filter(a => a !== borderColor));
  const glyphColor = random(accents.filter(a => a !== borderColor && a !== secondaryColor));

  drawZigzagBand(colors, 0.08, borderColor);
  drawZigzagBand(colors, 0.92, borderColor);

  drawDiamondRow(colors, 0.20, secondaryColor);
  drawDiamondRow(colors, 0.80, secondaryColor);

  drawCentralGlyph(colors, glyphColor);

  return colors;
}

function setCell(colors, cx, cy, col) {
  if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) colors[cy * COLS + cx] = col;
}

// Fascia di bordo continua a zigzag (onda triangolare), come i galloni delle maglie andine
function drawZigzagBand(colors, rowFrac, color) {
  const rowStart = round(rowFrac * ROWS);
  const thickness = max(2, round(ROWS * 0.035));
  const period = max(3, round(COLS / 20));
  const half = period / 2;

  for (let cx = 0; cx < COLS; cx++) {
    const posInPeriod = cx % period;
    const wave = posInPeriod < half ? posInPeriod / half : (period - posInPeriod) / half;
    const rowOffset = round(wave * (thickness - 1));
    setCell(colors, cx, rowStart + rowOffset, color);
  }
}

// Fascia secondaria con piccoli rombi ripetuti a intervalli regolari
function drawDiamondRow(colors, rowFrac, color) {
  const rowCenter = round(rowFrac * ROWS);
  const spacing = max(3, round(COLS / 16));

  for (let cx = floor(spacing / 2); cx < COLS; cx += spacing) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (abs(dx) + abs(dy) <= 1) setCell(colors, cx + dx, rowCenter + dy, color);
      }
    }
  }
}

// Glifo grande al centro del pattern: sempre un animale stilizzato (uccello/condor,
// motivo classico dell'iconografia andina) con testa, corpo, ali piumate e coda/zampe
// biforcute, generato in modo procedurale e sempre simmetrico sinistra/destra
function drawCentralGlyph(colors, color) {
  const gw = max(6, round(COLS * 0.5));
  const gh = max(6, round(ROWS * 0.4));
  const originX = floor((COLS - gw) / 2);
  const originY = floor((ROWS - gh) / 2);

  const mask = generateGlyphMask(gw, gh);

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (mask[y][x]) setCell(colors, originX + x, originY + y, color);
    }
  }
}

function generateGlyphMask(gw, gh) {
  const mask = Array.from({ length: gh }, () => new Array(gw).fill(false));
  const midX = (gw - 1) / 2;

  // corpo: colonna verticale centrale
  const bodyTop = round(gh * 0.18);
  const bodyBottom = round(gh * 0.70);
  const bodyHalfWidth = max(1, round(gw * 0.035));
  for (let y = bodyTop; y <= bodyBottom; y++) {
    for (let dx = -bodyHalfWidth; dx <= bodyHalfWidth; dx++) {
      const x = round(midX + dx);
      if (x >= 0 && x < gw) mask[y][x] = true;
    }
  }

  // testa: piccolo rombo sopra il corpo
  const headCenterY = max(2, round(bodyTop * 0.5));
  const headSize = max(2, round(gw * 0.09));
  for (let dy = -headSize; dy <= headSize; dy++) {
    const rowWidth = headSize - abs(dy);
    for (let dx = -rowWidth; dx <= rowWidth; dx++) {
      const x = round(midX + dx);
      const y = headCenterY + dy;
      if (x >= 0 && x < gw && y >= 0 && y < gh) mask[y][x] = true;
    }
  }

  // ali: bracci orizzontali larghi che escono dalla parte alta del corpo, con
  // "penne" a gradini lungo la lunghezza per un profilo da uccello stilizzato
  const wingRow = bodyTop + round((bodyBottom - bodyTop) * 0.12);
  const wingThickness = max(1, round(gh * 0.035));
  const wingLen = max(3, round(midX - 1));

  for (let dy = -wingThickness; dy <= wingThickness; dy++) {
    const y = wingRow + dy;
    if (y < 0 || y >= gh) continue;
    for (let x = round(midX - wingLen); x <= round(midX + wingLen); x++) {
      if (x >= 0 && x < gw) mask[y][x] = true;
    }
  }

  const featherSpacing = max(2, round(wingLen / 4));
  const featherDrop = max(1, round(gh * 0.05));
  for (let d = featherSpacing; d <= wingLen; d += featherSpacing) {
    for (const side of [-1, 1]) {
      const x = round(midX + side * d);
      if (x < 0 || x >= gw) continue;
      for (let fy = 1; fy <= featherDrop; fy++) {
        const y = wingRow + wingThickness + fy;
        if (y < gh) mask[y][x] = true;
      }
    }
  }

  // coda/zampe: due diagonali che divergono dalla base del corpo
  const tailLen = max(2, round(gh * 0.18));
  for (let step = 0; step <= tailLen; step++) {
    const y = bodyBottom + step;
    if (y >= gh) break;
    const spread = round(step * 0.6);
    const xL = round(midX - spread);
    const xR = round(midX + spread);
    if (xL >= 0 && xL < gw) mask[y][xL] = true;
    if (xR >= 0 && xR < gw) mask[y][xR] = true;
  }

  return mask;
}