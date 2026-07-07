// Film grain
// Canvas a schermo intero, ridimensionabile | sfondo bianco con grana da pellicola sovrapposta

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());  // rendering nitido su schermi retina/HiDPI
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);

  // Grana da pellicola sovrapposta
  grain();
}

function grain() {
  loadPixels();
  const d = pixelDensity();      // 2 su schermi retina/HiDPI: il buffer reale è width*d × height*d
  const bufW = width * d;
  const bufH = height * d;

  for (let i = 0; i < 3000; i++) {
    let x = floor(random(width)) * d;
    let y = floor(random(height)) * d;
    let g = random(230, 250);              // valore grigio
    let a = random(8, 50) / 255;         // opacità bassa (0..1)
    let big = random() < 0.15;           // qualche grano più grande
    let size = (big ? 3 : 1) * d;

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        let px = x + dx, py = y + dy;
        if (px >= bufW || py >= bufH) continue;
        let idx = 4 * (py * bufW + px);
        pixels[idx]     = pixels[idx]     * (1 - a) + g * a;
        pixels[idx + 1] = pixels[idx + 1] * (1 - a) + g * a;
        pixels[idx + 2] = pixels[idx + 2] * (1 - a) + g * a;
      }
    }
  }
  updatePixels();
}
