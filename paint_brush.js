// Paint Brush — pennellate irregolari che si accumulano nel tempo al centro del canvas
// Canvas a schermo intero, ridimensionabile | palette ispirata a un paesaggio di mare
// Ogni pennellata parte vicino al centro e va verso l'alto, verso il basso o in
// diagonale (semi-obliqua), con lunghezza, spessore e colore variabili. La
// pennellata si forma lentamente, un tratto alla volta, come un vero pennello
// che scorre sulla tela. Le pennellate restano sul canvas (non viene ripulito
// ad ogni frame): il dipinto si accumula pennellata dopo pennellata.

// Palette: toni da paesaggio marino
const SEA_PALETTE = [
  [30, 55, 85],     // blu notte
  [45, 110, 130],   // teal
  [90, 150, 165],   // azzurro acqua
  [190, 205, 195],  // spuma
  [210, 195, 160],  // sabbia
  [95, 140, 120],   // verde alga
  [120, 130, 145],  // grigio orizzonte
];

const BG = [238, 232, 218]; // tela chiara

const PAUSE_BETWEEN_STROKES = [200, 400]; // ms di pausa dopo una pennellata, prima della prossima
const BRUSH_SPEED = [0.70, 1.00];          // px al ms: quanto lentamente si forma la pennellata
const CENTER_SPREAD = 0.18;                // quanto le pennellate si allontanano dal centro (frazione di width/height)
const LENGTH_RANGE = [0.15, 0.5];          // lunghezza pennellata, frazione dell'altezza
const WIDTH_START_RANGE = [20, 40];        // spessore all'inizio della pennellata (dove c'è più vernice)
const WIDTH_END_FACTOR = [0.35, 0.55];     // spessore finale, come frazione di quello iniziale
const ALPHA_START_RANGE = [120, 150];      // opacità iniziale (più vernice)
const ALPHA_END_RANGE = [25, 55];          // opacità finale (meno vernice, tratto quasi asciutto)
const BRISTLE_COUNT_RANGE = [8, 14];       // quante "setole" compongono la larghezza della pennellata

let stroke = null;   // pennellata in corso di formazione, o null
let nextStrokeAt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());
  background(BG[0], BG[1], BG[2]);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(BG[0], BG[1], BG[2]);
}

function draw() {
  if (!stroke && millis() > nextStrokeAt) {
    stroke = createStroke();
  }
  if (stroke) {
    advanceStroke(stroke);
    if (stroke.drawnSteps >= stroke.totalSteps) {
      stroke = null;
      nextStrokeAt = millis() + random(PAUSE_BETWEEN_STROKES[0], PAUSE_BETWEEN_STROKES[1]);
    }
  }
}

// Sceglie i parametri di una nuova pennellata: punto vicino al centro,
// direzione (su / giù / diagonale semi-obliqua) e lunghezza. Il disegno vero e
// proprio avviene un passo alla volta in advanceStroke(), non qui
function createStroke() {
  const cx = width / 2 + random(-width * CENTER_SPREAD, width * CENTER_SPREAD);
  const cy = height / 2 + random(-height * CENTER_SPREAD, height * CENTER_SPREAD);
  const len = random(height * LENGTH_RANGE[0], height * LENGTH_RANGE[1]);

  const direction = random(['su', 'giu', 'diagonale']);
  let angle;
  if (direction === 'su') {
    angle = -HALF_PI + random(-0.12, 0.12);
  } else if (direction === 'giu') {
    angle = HALF_PI + random(-0.12, 0.12);
  } else {
    // diagonale ma "semi-obliqua": resta vicina alla verticale, non a 45°
    const verticaleBase = random() < 0.5 ? -HALF_PI : HALF_PI;
    const inclinazione = random(0.2, 0.55) * (random() < 0.5 ? 1 : -1);
    angle = verticaleBase + inclinazione;
  }

  const dx = cos(angle), dy = sin(angle);
  const startX = cx - (dx * len) / 2;
  const startY = cy - (dy * len) / 2;

  const totalSteps = floor(len / 3);

  // le "setole" del pennello: ognuna ha una posizione laterale fissa (con un
  // piccolo jitter), una propria ondulazione indipendente e porta più o meno
  // vernice delle altre, per un tratto fatto di tanti piccoli segni invece di
  // un'unica striscia uniforme
  const bristleCount = floor(random(BRISTLE_COUNT_RANGE[0], BRISTLE_COUNT_RANGE[1]));
  const bristles = [];
  for (let b = 0; b < bristleCount; b++) {
    bristles.push({
      offset: map(b, 0, bristleCount - 1, -0.5, 0.5) + random(-0.06, 0.06),
      seed: random(1000),
      loadFactor: random(1, 2),
      sizeFactor: random(0.7, 1.2),
    });
  }

  return {
    startX, startY, dx, dy, len, angle,
    col: random(SEA_PALETTE),
    widthStart: random(WIDTH_START_RANGE[0], WIDTH_START_RANGE[1]),
    widthEndFactor: random(WIDTH_END_FACTOR[0], WIDTH_END_FACTOR[1]),
    alphaStart: random(ALPHA_START_RANGE[0], ALPHA_START_RANGE[1]),
    alphaEnd: random(ALPHA_END_RANGE[0], ALPHA_END_RANGE[1]),
    speed: random(BRUSH_SPEED[0], BRUSH_SPEED[1]), // px/ms
    wobbleSeed: random(1000),
    bristles,
    totalSteps,
    drawnSteps: 0,
    startTime: millis(),
  };
}

// Disegna i tratti della pennellata dovuti a questo frame, in base a quanto
// tempo è passato dall'inizio e alla velocità del pennello: più lenta è la
// velocità, più a lungo ci mette la pennellata a formarsi per intero
function advanceStroke(s) {
  const elapsed = millis() - s.startTime;
  const distanceCovered = elapsed * s.speed;
  const targetStep = min(s.totalSteps, floor((distanceCovered / s.len) * s.totalSteps));

  noStroke();
  for (; s.drawnSteps <= targetStep && s.drawnSteps <= s.totalSteps; s.drawnSteps++) {
    const t = s.drawnSteps / s.totalSteps;
    const px = lerp(s.startX, s.startX + s.dx * s.len, t);
    const py = lerp(s.startY, s.startY + s.dy * s.len, t);

    // leggero serpeggiare perpendicolare alla direzione della pennellata (l'intero tratto)
    const wobble = (noise(t * 3, s.wobbleSeed) - 0.5) * s.widthStart * 0.6;
    const nx = -s.dy, ny = s.dx;
    const wx = px + nx * wobble;
    const wy = py + ny * wobble;

    // più vernice (larga e opaca) all'inizio, tratto più sottile e leggero verso la fine
    const w = lerp(s.widthStart, s.widthStart * s.widthEndFactor, t) * random(0.9, 1.1);
    const a = lerp(s.alphaStart, s.alphaEnd, t) * random(0.9, 1.1);

    // ogni setola disegna il proprio piccolo segno, spostato lateralmente
    // secondo la sua posizione fissa più una piccola ondulazione indipendente
    for (const br of s.bristles) {
      const bristleWobble = (noise(t * 5, br.seed) - 0.5) * w * 0.35;
      const lateral = br.offset * w + bristleWobble;
      const bx = wx + nx * lateral;
      const by = wy + ny * lateral;

      const bristleSize = (w / s.bristles.length) * 1.8 * br.sizeFactor * random(0.85, 1.15);
      const bristleAlpha = a * br.loadFactor * random(0.85, 1.15);

      push();
      translate(bx, by);
      rotate(s.angle);
      fill(s.col[0], s.col[1], s.col[2], bristleAlpha);
      ellipse(0, 0, bristleSize, bristleSize * 0.7);
      pop();
    }
  }
}
