import canvasSketch from 'canvas-sketch';
import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';
import p5 from 'p5';
import Cube from './Cube';
import addListeners from './event-listeners';
import palettes from './palettes';
import textureFrag from './texture.frag';
import textureVert from './texture.vert';
import { fbm, fbmz, overrideColor, weighted } from './utils';

// Gets url params
const urlParams = new URLSearchParams(window.location.search);
// Set the random seed (using fxhash's seed or the 'seed' url param)
let seed = fxhash;
let urlSeed = urlParams.get('seed');
if (urlSeed) {
  seed = urlSeed;
}
random.setSeed(seed);

// choose mood
const mood = weighted([
  { value: 'Reflective', weight: 1 },
  { value: 'Confident', weight: 1 },
  { value: 'Energized', weight: 1 },
  { value: 'Zen', weight: 1 },
  { value: 'Renewed', weight: 1 },
]);

// choose time of day and set shadows
const timeOfDay = weighted([
  { value: 'Morning', weight: 3 },
  { value: 'Afternoon', weight: 3 },
  { value: 'Evening', weight: 2 },
  { value: 'Night', weight: 1 },
  { value: 'Party Time', weight: 1 },
]);

let shadows;
switch (timeOfDay) {
  case 'Morning':
    shadows = { left: 'grad', top: 'light', right: 'dark' };
    break;
  case 'Afternoon':
    shadows = { left: 'grad', top: 'light', right: 'grad' };
    break;
  case 'Evening':
    shadows = { left: 'dark', top: 'dark', right: 'grad' };
    break;
  case 'Night':
    shadows = { left: 'dark', top: 'dark', right: 'dark' };
    break;
  case 'Party Time':
    shadows = {
      left: 'random',
      top: 'random',
      right: 'random',
    };
    break;
}
let shadowAlpha = random.range(0.6);
let [gradStop1, gradStop2] = weighted([
  { value: [0, 1], weight: 1 },
  { value: [0.5, 0.5001], weight: 1 },
]);

// choose special feature
let specialFeature = weighted([
  { value: 'Glowing', weight: 1 },
  { value: 'Shattered', weight: 1 },
  { value: 'Patchwork', weight: 1 },
  { value: 'Messy', weight: 1 },
  { value: 'Standard', weight: 5 },
  { value: 'Perfect', weight: 1 },
]);

// chance to be black and white
const bw = random.value() > 0.975;

let shatterDivider = random.pick([3, 4, 6, 8, 10]);
let shattered = specialFeature === 'Shattered';
let glowing = specialFeature === 'Glowing';
let patchwork = specialFeature === 'Patchwork';
let messy = specialFeature === 'Messy';
let perfect = specialFeature === 'Perfect';

// shuffle and choose patterns
let allCubePatterns = random.shuffle([
  'gradient',
  'fill',
  'empty',
  'dots',
  'stripes',
  'zigzag',
  'fans',
  'patches',
]);
if (messy) {
  allCubePatterns = ['gradient', 'fill', 'empty', 'stripes', 'zigzag'];
}

let zenPattern = random.pick(allCubePatterns.filter(p => p !== 'empty'));
let reflectivePatterns = random.shuffle(allCubePatterns).slice(0, 3);

// set the canvas scale based on the url param 'scale' (default to 1)
let canvasScale = urlParams.get('scale');
if (canvasScale) {
  canvasScale = Math.min(10, Number.parseInt(canvasScale));
} else {
  canvasScale = 1;
}

let dimensions = [2500, 2500];
let borderSizes = [0, 50, 75, 100, 150];
let borderSize = 50;

// set canvas size if 'fitToScreen' or 'x' and 'y' url params are set
let fitToScreen = urlParams.get('fitToScreen');
let screenX = urlParams.get('x');
let screenY = urlParams.get('y');
if (fitToScreen && fitToScreen === 'true') {
  fitToScreen = true;
  dimensions = [window.innerWidth * 4, window.innerHeight * 4];
} else {
  fitToScreen = false;
}
if (screenX && screenY) {
  if (Number.parseInt(screenX) > 0 && Number.parseInt(screenY) > 0) {
    dimensions = [Number.parseInt(screenX), Number.parseInt(screenY)];
    borderSize = 0;
  }
}

// ios safari is dumb and has a very small max canvas, so always setting the canvas size to 1 to avoid any issues
function iOS() {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
      navigator.platform
    ) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

if (iOS()) {
  canvasScale = 1;
}

// determines whether or not to apply grain texture, shapes, cutouts (defaults true)
let applyTexture = true;
let applyShapes = true;
let showCutouts = true;

// settings to pass to canvas-sketch
const settings = {
  dimensions,
  p5: { p5 },
  scaleToView: window.screen.availHeight > window.screen.availWidth,
  scaleToFitPadding: 0,
  pixelRatio: 1,
  pixelsPerInch: 300,
  name: `${seed}`,
  file: seed,
  animate: true,
  fps: 60,
  loop: false,
  exportPixelRatio: canvasScale,
  encoding: 'image/jpeg',
  encodingQuality: 1,
};

if (fitToScreen) {
  borderSize = 0;
}

const sketch = ({ p5, width, height, styleWidth, styleHeight, exportFrame, play }) => {
  // This resizes the overlay that appears when exporting to fit the canvas size
  const saveOverlay = document.querySelector('.save-overlay');
  saveOverlay.style.width = `${styleWidth}px`;
  saveOverlay.style.height = `${styleHeight}px`;

  // event listener callbacks
  const toggleBorder = () => {
    play();
    borderSize =
      borderSizes.indexOf(borderSize) === borderSizes.length - 1
        ? borderSizes[0]
        : borderSizes[borderSizes.indexOf(borderSize) + 1];
  };

  const toggleTexture = () => {
    play();
    applyTexture = !applyTexture;
  };

  const toggleShapes = () => {
    play();
    applyShapes = !applyShapes;
  };

  const toggleCutouts = () => {
    play();
    showCutouts = !showCutouts;
  };

  random.setSeed(seed);
  p5.colorMode(p5.HSB);
  const graphics = p5.createGraphics(width, height);
  graphics.colorMode(p5.HSB);
  p5.scale(canvasScale);
  graphics.pixelDensity(Math.min(6, canvasScale));
  const rotated = random.value() > 0.925;
  if (rotated) {
    graphics.translate(width, 0);
    graphics.rotate(p5.HALF_PI);
  }

  const out = p5.createGraphics(width, height);
  out.colorMode(p5.HSB);
  out.pixelDensity(canvasScale);
  const texture = p5.createGraphics(width, height, p5.WEBGL);
  texture.setAttributes('alpha', true);

  // ------------- Palette selection -------------
  let palette = weighted(palettes(p5));

  addListeners({
    exportFrame,
    fitToScreen,
    toggleBorder,
    toggleTexture,
    toggleShapes,
    toggleCutouts,
    seed,
  });

  if (random.value() > 0.5) {
    palette.colors.push(p5.color(0, 0, 100));
  }
  if (random.value() > 0.75) {
    palette.colors.push(p5.color(0, 0, 10));
  }

  if (bw) {
    palette = palettes(p5)[0].value;
  }
  palette.colors = random.shuffle(palette.colors);

  // ------------- Grain texture -------------
  let textureShader;
  let u_seeds = [random.range(15, 16), random.range(78, 80), random.range(400000, 400002)];
  textureShader = texture.createShader(textureVert, textureFrag);
  texture.shader(textureShader);
  textureShader.setUniform('u_resolution', [width * canvasScale, height * canvasScale]);
  textureShader.setUniform('u_seeds', u_seeds);
  texture.rect(0, 0, 100, 100);
  // -----------------------------------------

  let size = random.pick([75, 100, 150, 200, 250, 300, 400]);
  let sizeVariation = weighted([
    { value: size / 4, weight: 1 },
    { value: size / 2, weight: 1 },
    { value: 0, weight: 10 },
  ]);
  const stripeSize = random.pick([2, 3, 4, 5, 7, 10]);
  const stripeSpacing = random.range(1, 10);
  const zigZagOffset = size / random.pick([15, 20, 25, 30]);
  const zigZagCount = Math.round(random.range(5, 20));
  const zagSpacing = random.pick([5, 7, 10]);
  const [dotDivider, dotSpacing] = random.pick([
    [20, 2.5],
    [5, 2],
    [10, 2],
    [30, 4],
    [50, 5],
  ]);
  const fanRepeats = random.pick([5, 7, 9, 11]);
  const fanMult = random.pick([1, 1.5, 2]);
  let cubeRotation = weighted([
    { value: p5.PI / 6, weight: 10 },
    { value: -p5.PI / 6, weight: 1 },
    { value: p5.PI / 3, weight: 1 },
    { value: 0, weight: 1 },
    { value: 'Whacky', weight: 1 },
  ]);

  let bgColor = palette.colors.at(-2);
  if (timeOfDay === 'Night') {
    bgColor = overrideColor(p5, bgColor, { brightness: p5.brightness(bgColor) / 2 });
    if (bw) {
      bgColor = p5.color(0, 0, 0);
    }
  } else if (timeOfDay === 'Morning') {
    bgColor = overrideColor(p5, bgColor, {
      brightness: p5.brightness(bgColor) * 1.5,
      saturation: p5.brightness(bgColor) * 0.7,
    });
    if (bw) {
      bgColor = p5.color(0, 0, 100);
    }
  } else if (timeOfDay === 'Evening') {
    bgColor = overrideColor(p5, bgColor, { brightness: p5.brightness(bgColor) / 1.5 });
  }
  graphics.stroke(bgColor);

  const directions = [
    [width / 2, 0, width / 2, height],
    [0, height / 2, width, height / 2],
  ];
  let bgGrad = p5.drawingContext.createLinearGradient(...random.pick(directions));
  bgGrad.addColorStop(0, bgColor);
  if (random.value() > 0.5) {
    bgGrad.addColorStop(1, palette.colors.at(-2));
  }

  if (bw) {
    bgGrad.addColorStop(0.999, bgColor);
  }

  graphics.drawingContext.fillStyle = bgGrad;
  graphics.drawingContext.fillRect(0, 0, width, height);

  graphics.drawingContext.lineCap = 'round';
  graphics.drawingContext.lineJoin = 'round';
  let cubeStrokeWeight = random.pick([10, 20, 30, 40, 50, 60]);
  if (patchwork) {
    cubeStrokeWeight = random.pick([10, 20, 30]);
  }
  let [cubeStrokeColor, cubeStrokeColor2] = random.shuffle(palette.colors);
  if (timeOfDay === 'Night') {
    cubeStrokeColor = overrideColor(p5, cubeStrokeColor, {
      brightness: p5.brightness(cubeStrokeColor) / 2,
    });
    if (bw) {
      cubeStrokeColor = p5.color(0, 0, 100);
      cubeStrokeColor2 = p5.color(0, 0, 100);
    }
  }
  if (timeOfDay === 'Morning') {
    cubeStrokeColor = overrideColor(p5, cubeStrokeColor, {
      brightness: p5.brightness(cubeStrokeColor) * 2,
      saturation: p5.saturation(cubeStrokeColor) / 2,
    });
    if (bw) {
      cubeStrokeColor = p5.color(0, 0, 0);
      cubeStrokeColor2 = p5.color(0, 0, 0);
    }
  }
  const strokePatterns = random.value() > 0.25;

  let cubeSpacingX = weighted([
    { value: 1.74, weight: 10 },
    { value: 1.9, weight: 2 },
    { value: 2.2, weight: 3 },
    { value: 2.43, weight: 3 },
  ]);
  let cubeSpacingY = weighted([
    { value: 1.5, weight: 10 },
    { value: 1.7, weight: 2 },
    { value: 1.9, weight: 3 },
    { value: 2, weight: 3 },
  ]);

  const reflectShift = random.pick([2, 4]);
  const reflections = [
    [-width, -height, -1, -1],
    [(random.sign() * size) / reflectShift, (random.sign() * size) / reflectShift, 1, 1],
    [0, 0],
  ];

  let [offX, offY, scaleX, scaleY] = random.pick(reflections);
  if (perfect) {
    cubeSpacingX = 1.74;
    cubeSpacingY = 1.5;
    cubeRotation = p5.PI / 6;
    sizeVariation = 0;
    offX = 0;
    offY = 0;
  }

  const cubeOptions = {
    cubeStrokeWeight,
    cubeStrokeColor,
    cubeRotation,
    palette,
    stripeSize,
    stripeSpacing,
    zigZagOffset,
    zigZagCount,
    zagSpacing,
    dotDivider,
    dotSpacing,
    fanRepeats,
    fanMult,
    strokePatterns,
    shadows,
    gradStop1,
    gradStop2,
    shadowAlpha,
    shattered,
    shatterDivider,
    glowing,
    patchwork,
    messy,
    timeOfDay,
  };
  function* cubeGenerator() {
    for (let x = 0; x < width + size; x += size * cubeSpacingX) {
      let i = 0;
      for (let y = 0; y < height + size; y += size * cubeSpacingY) {
        let xoff = i % 2 === 0 ? size * 0.86 : 0;
        let cubePatterns;
        switch (mood) {
          case 'Zen':
            cubePatterns = [zenPattern, zenPattern, zenPattern];
            break;
          case 'Confident':
            let p = random.pick(allCubePatterns);

            cubePatterns = [p, p, p];
            break;
          case 'Energized':
            let [p1, p2, p3] = random.shuffle(allCubePatterns);
            cubePatterns = [p1, p2, p3];
            break;
          case 'Renewed':
            let pi = Math.floor(
              math.mapRange(fbm(x, y, 1, 2000), -1, 1, 0, allCubePatterns.length - 0.001)
            );
            cubePatterns = [allCubePatterns[pi], allCubePatterns[pi], allCubePatterns[pi]];
            break;
          case 'Reflective':
            cubePatterns = reflectivePatterns;
            reflectivePatterns = [
              reflectivePatterns[1],
              reflectivePatterns[2],
              reflectivePatterns[0],
            ];
            break;
          default:
            break;
        }

        const cube = new Cube(x + xoff, y, random.gaussian(size, sizeVariation), graphics, {
          ...cubeOptions,
          cubePatterns,
        });
        cube.draw();
        if (offX === 0 && offY === 0) {
          const cube2 = new Cube(x + xoff, y, random.gaussian(size, sizeVariation), graphics2, {
            ...cubeOptions,
            cubePatterns,
            palette: { colors: random.shuffle(palette.colors) },
          });
          cube2.draw();
        }
        cubeCount++;
        yield i++;
      }
    }
  }

  out.fill(0, 0, 100);
  out.noStroke();
  const flip = p5.createGraphics(width, height);
  flip.noFill();

  const cutouts = p5.createGraphics(width, height);
  cutouts.colorMode(p5.HSB);
  cutouts.noStroke();
  const actualCutouts = p5.createGraphics(width, height);
  actualCutouts.colorMode(p5.HSB);
  actualCutouts.noFill();

  if (glowing) {
    const glowColor = overrideColor(p5, bgColor, {
      brightness: p5.brightness(bgColor) * 2,
      saturation: p5.saturation(bgColor) / 2,
      alpha: 0.5,
    });
    actualCutouts.drawingContext.shadowColor = glowColor;
    actualCutouts.drawingContext.shadowBlur = 20;
  }

  actualCutouts.stroke(bgColor);
  if (patchwork) {
    const lineDashes = [];
    for (let i = 0; i < 30; i++) {
      lineDashes.push(random.range(size / 50, size / 10));
    }
    actualCutouts.drawingContext.setLineDash(lineDashes);
    if (random.value() > 0.5) {
      actualCutouts.strokeCap(p5.SQUARE);
    }
  }
  actualCutouts.rectMode(p5.CENTER);
  let cutoutStrokeWeight = weighted([
    { value: 2, weight: 2 },
    { value: 3, weight: 3 },
    { value: 4, weight: 3 },
    { value: 5, weight: 2 },
  ]);
  let squareSnap = random.pick([1, 10, 50, 100, 150, 200, 500]);
  let shapeCount = random.range(3, 30);
  if (perfect) {
    shapeCount = random.range(3, 15);
    cutoutStrokeWeight = 2;
    cubeStrokeColor = p5.color(0, 0, 100);
  }

  let circleChance = random.value();
  let squareChance = 0;

  let maxShapeSize = weighted([
    { value: 2, weight: 5 },
    { value: 3, weight: 2 },
    { value: 4, weight: 1 },
  ]);

  let shapeDistribution = weighted([
    { value: 'Random', weight: 25 },
    { value: 'Centered', weight: 1 },
    { value: 'Off-centered', weight: 6 },
    { value: 'Bubbles', weight: 6 },
    { value: 'Gridlike', weight: 3 },
  ]);
  if (shapeDistribution === 'Centered') {
    shapeCount = random.range(4, 20);
  }
  if (shapeDistribution === 'Bubbles') {
    shapeCount = random.range(40, 80);
    circleChance = 0;
  }
  if (shapeDistribution === 'Gridlike') {
    shapeCount = random.range(20, 60);
    circleChance = 1;
    squareSnap = size / 2;
  }
  for (let i = 0; i < shapeCount; i++) {
    actualCutouts.strokeWeight(cutoutStrokeWeight);
    const inverse = random.value() > 0.8;
    actualCutouts.stroke(inverse ? cubeStrokeColor : cubeStrokeColor2);
    let x = random.range(0, width);
    let y = random.range(0, height);

    let r = random.range(width / 10, width / maxShapeSize);
    if (shapeDistribution === 'Bubbles') {
      r = random.range(width / 100, width / 5);
    }
    if (shapeDistribution === 'Centered') {
      x = width / 2;
      y = height / 2;
      r = random.range(width / 10, width / 2);
      squareSnap = 1;
    } else if (shapeDistribution === 'Off-centered') {
      x = random.gaussian(width / 2, width / 4);
      y = random.gaussian(height / 2, height / 4);
      r = random.range(width / 10, width / 2);
      squareSnap = 1;
    }
    const shapeVal = random.value();
    if (shapeVal > circleChance) {
      cutouts.drawingContext.moveTo(x, y);
      cutouts.drawingContext.arc(x, y, r, 0, p5.TWO_PI);
      actualCutouts.circle(x, y, r * 2);
      actualCutouts.stroke(inverse ? cubeStrokeColor2 : cubeStrokeColor);
      actualCutouts.strokeWeight(cutoutStrokeWeight / 4);
      actualCutouts.circle(x, y, r * 2 + cutoutStrokeWeight);
      if (messy) {
        for (let j = 0; j < random.range(2, 5); j++) {
          actualCutouts.strokeWeight(random.range(0.25, 1));
          actualCutouts.circle(x + random.gaussian(0, 4), y + random.gaussian(0, 4), r * 2);
          actualCutouts.stroke(
            random.pick([cubeStrokeColor2, cubeStrokeColor, p5.color(0, 0, 0), p5.color(0, 0, 100)])
          );
          actualCutouts.strokeWeight(cutoutStrokeWeight / 8);
          actualCutouts.circle(
            x + random.gaussian(0, 4),
            y + random.gaussian(0, 4),
            r * 2 + cutoutStrokeWeight
          );
        }
      }
    } else if (shapeVal > squareChance) {
      x = Math.round(x / squareSnap) * squareSnap;
      y = Math.round(y / squareSnap) * squareSnap;
      r = Math.round(r / squareSnap) * squareSnap;
      if (shapeDistribution === 'Centered') {
        r *= random.range(2, 3);
      }
      cutouts.drawingContext.moveTo(x - r / 2, y - r / 2);
      cutouts.drawingContext.rect(x - r / 2, y - r / 2, r * 1, r);
      actualCutouts.rect(x, y, r, r);
      actualCutouts.stroke(inverse ? cubeStrokeColor2 : cubeStrokeColor);
      actualCutouts.strokeWeight(cutoutStrokeWeight / 4);
      actualCutouts.rect(x, y, r + cutoutStrokeWeight, r + cutoutStrokeWeight);
      if (messy) {
        for (let j = 0; j < random.range(2, 5); j++) {
          actualCutouts.strokeWeight(random.range(0.25, 1));
          actualCutouts.rect(x + random.gaussian(0, 4), y + random.gaussian(0, 4), r, r);
          actualCutouts.stroke(
            random.pick([cubeStrokeColor2, cubeStrokeColor, p5.color(0, 0, 0), p5.color(0, 0, 100)])
          );
          actualCutouts.strokeWeight(cutoutStrokeWeight / 8);
          actualCutouts.rect(
            x + random.gaussian(0, 4),
            y + random.gaussian(0, 4),
            r + cutoutStrokeWeight,
            r + cutoutStrokeWeight
          );
        }
      }
    }
  }
  cutouts.drawingContext.clip('evenodd');
  p5.background(bgColor);

  let timeOfDayGrad;
  if (palette.name !== 'Black & White') {
    switch (timeOfDay) {
      case 'Morning':
        timeOfDayGrad = p5.drawingContext.createLinearGradient(0, height / 2, width, height);
        if (rotated) {
          timeOfDayGrad = p5.drawingContext.createLinearGradient(width / 2, 0, width / 2, height);
        }
        timeOfDayGrad.addColorStop(0, p5.color(40, 50, 100, 0.75));
        timeOfDayGrad.addColorStop(1, p5.color(0, 0, 100, 0));
        break;
      case 'Afternoon':
        timeOfDayGrad = p5.drawingContext.createLinearGradient(width / 2, 0, width / 2, height);
        if (rotated) {
          timeOfDayGrad = p5.drawingContext.createLinearGradient(width, height / 2, 0, height / 2);
        }
        timeOfDayGrad.addColorStop(0, p5.color(40, 30, 100, 0.3));
        timeOfDayGrad.addColorStop(0.8, p5.color(0, 0, 45, 0.8));
        break;
      case 'Evening':
        timeOfDayGrad = p5.drawingContext.createLinearGradient(width, 0, 0, height);
        if (rotated) {
          timeOfDayGrad = p5.drawingContext.createLinearGradient(width / 2, height, 0, 0);
        }
        timeOfDayGrad.addColorStop(0, p5.color(270, 20, 50, 0.995));
        timeOfDayGrad.addColorStop(1, p5.color(0, 0, 0, 0.995));
        break;
      case 'Night':
        timeOfDayGrad = p5.drawingContext.createLinearGradient(width / 2, 0, width / 2, height);
        if (rotated) {
          timeOfDayGrad = p5.drawingContext.createLinearGradient(width / 2, height, 0, 0);
        }
        timeOfDayGrad.addColorStop(0, p5.color(0, 0, 0, 1));
        timeOfDayGrad.addColorStop(1, p5.color(0, 0, 50, 1));
        break;
      case 'Party Time':
        const firstColor = palette.colors.find(c => p5.saturation(c) > 0);
        const firstColorIndex = palette.colors.indexOf(firstColor);
        const secondColor = palette.colors.find(
          (c, i) => i !== firstColorIndex && p5.saturation(c) > 0
        );
        timeOfDayGrad = p5.drawingContext.createLinearGradient(0, 0, width, height);
        timeOfDayGrad.addColorStop(
          0,
          overrideColor(p5, firstColor, { alpha: 0.35, brightness: 1 })
        );
        timeOfDayGrad.addColorStop(
          1,
          overrideColor(p5, secondColor, { alpha: 0.35, brightness: 100 })
        );
        break;
    }
  } else {
    timeOfDayGrad = p5.drawingContext.createLinearGradient(0, 0, width, height);
    timeOfDayGrad.addColorStop(0, p5.color(0, 0, 0, 0));
    timeOfDayGrad.addColorStop(1, p5.color(0, 0, 0, 0));
  }

  let sizeString;
  switch (size) {
    case 75:
      sizeString = 'Tiny';
      break;
    case 100:
      sizeString = 'Extra Small';
      break;
    case 150:
      sizeString = 'Small';
      break;
    case 200:
      sizeString = 'Medium';
      break;
    case 250:
      sizeString = 'Large';
      break;
    case 300:
      sizeString = 'Extra Large';
      break;
    case 400:
      sizeString = 'Huge';
      break;
  }

  let variationString;
  switch (sizeVariation) {
    case 0:
      variationString = 'None';
      break;
    case size / 4:
      variationString = 'Some';
      break;
    case size / 2:
      variationString = 'Lots';
      break;
  }

  let shadowString;
  if (shadowAlpha < 0.15) {
    shadowString = 'Faint';
  } else if (shadowAlpha < 0.25) {
    shadowString = 'Light';
  } else if (shadowAlpha < 0.5) {
    shadowString = 'Medium';
  } else {
    shadowString = 'Strong';
  }

  let cubeRotationString;
  switch (cubeRotation) {
    case p5.PI / 6:
      cubeRotationString = 'Upright';
      break;
    case -p5.PI / 6:
      cubeRotationString = 'Upside down';
      break;
    case p5.PI / 3:
      cubeRotationString = 'Tilted';
      break;
    case 0:
      cubeRotationString = 'Tilted the other way';
      break;
    case 'Whacky':
      cubeRotationString = 'Random';
      break;
  }

  let reflectionString;
  if (offX === 0 && offY === 0) {
    reflectionString = 'Overlayed';
  } else if (scaleX === 1) {
    reflectionString = 'Shifted';
  } else {
    reflectionString = 'Mirrored';
  }

  window.$fxhashFeatures = {
    Mood: mood,
    'Time of Day': timeOfDay,
    Palette: palette.name,
    'Special Feature': specialFeature,
    'Base Cube Size': sizeString,
    'Cube Size Variation': variationString,
    'Whole Canvas Rotate': rotated,
    'Cube Rotation': cubeRotationString,
    'Stroke Cube Patterns': strokePatterns,
    'Shadow & Light Strength': shadowString,
    'Cutout Shape Count': Math.round(shapeCount),
    'Cutout Shape Distribution': shapeDistribution,
    'Reflection Style': reflectionString,
  };
  console.table(window.$fxhashFeatures);
  const generator = cubeGenerator();

  const canvas = p5.createGraphics(width, height);
  canvas.pixelDensity(canvasScale);
  canvas.colorMode(p5.HSB);
  canvas.noFill();

  let z = 0;
  canvas.strokeWeight(2);
  for (let x = 0; x < width; x += 10) {
    for (let y = 0; y < height; y += 10) {
      const n = math.mapRange(fbmz(x, y, z, 1, 2000), -1, 1, 0, p5.TWO_PI);
      canvas.stroke(0, 0, 100, random.gaussian(0.14, 0.075));
      canvas.point(x + 50 * p5.cos(n), y + 50 * p5.sin(n));
      z += 0.1;
    }
  }

  return {
    render({ width, height, p5, frame, pause }) {
      let gen;
      if (frame > 0) {
        for (let i = 0; i < math.mapRange(size, 50, 400, 10, 1); i++) {
          gen = generator.next();
        }
      }

      p5.drawingContext.fillStyle = bgGrad;
      p5.rect(0, 0, width, height);
      cutouts.drawingContext.fillStyle = bgGrad;
      cutouts.rect(0, 0, width, height);
      out.drawingContext.fillStyle = bgGrad;
      out.rect(0, 0, width, height);
      out.image(graphics, 0, 0);

      cutouts.push();
      if (offX === 0 && offY === 0) {
        cutouts.image(graphics2, 0, 0);
      } else {
        cutouts.scale(scaleX, scaleY);
        cutouts.image(graphics, offX, offY);
      }
      cutouts.pop();
      if (showCutouts) {
        out.image(cutouts, 0, 0);
        if (applyShapes) {
          out.image(actualCutouts, 0, 0);
        }
      }
      p5.image(out, 0, 0);

      p5.push();
      if (timeOfDay === 'Morning' || timeOfDay === 'Afternoon' || timeOfDay === 'Party Time') {
        p5.blendMode(p5.HARD_LIGHT);
      } else {
        p5.blendMode(p5.SOFT_LIGHT);
      }
      p5.fill(0, 0, 0);
      p5.drawingContext.fillStyle = timeOfDayGrad;
      p5.noStroke();
      p5.rect(0, 0, width, height);
      p5.pop();

      p5.noFill();

      p5.stroke(cubeStrokeColor);
      p5.strokeWeight(borderSize);
      p5.rect(0, 0, width, height);

      if (applyTexture) {
        p5.image(texture, 0, 0);
        p5.image(canvas, 0, 0);
      }
      if (frame > 0 && !Number.isInteger(gen.value)) {
        document.complete = true;
        pause();
        if (isFxpreview) {
          fxpreview();
        }
      }
    },
  };
};
canvasSketch(sketch, settings);
console.log(seed);
console.log('Stepping Stones - teaboswell 2022, CC BY-NC-ND 4.0');
console.log('See bundle.js.LICENSE.txt for third party license information');
