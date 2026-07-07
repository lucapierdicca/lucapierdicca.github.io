// Sketch di partenza: pattern fluido psichedelico
// Pensato come base per visual live (cumbia psichedelica / sonidera)

let t = 0; // tempo interno, avanza ad ogni frame

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
}

function draw() {
  background(0, 0, 5, 20); // leggero fade, lascia una scia

  let cols = 40;
  let spacing = width / cols;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < height / spacing; j++) {
      let x = i * spacing;
      let y = j * spacing;

      // angolo che varia nello spazio e nel tempo -> effetto "fluido"
      let angle = noise(i * 0.1, j * 0.1, t * 0.5) * TWO_PI * 2;

      let px = x + cos(angle) * spacing * 0.4;
      let py = y + sin(angle) * spacing * 0.4;

      // colore che scorre lungo lo spettro (psichedelico)
      let hue = (angle * 60 + t * 40) % 360;

      fill(hue, 80, 90, 60);
      let size = spacing * (0.3 + 0.3 * noise(i * 0.2, j * 0.2, t));
      ellipse(px, py, size, size);
    }
  }

  t += 0.01; // velocità di evoluzione del pattern
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
