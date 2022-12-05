import random from 'canvas-sketch-util/random';

export function weighted(items, selectN = 0) {
  const weightedItems = [];
  items.forEach(({ value, weight = 1 }) => {
    for (let i = 0; i < weight; i++) weightedItems.push(value);
  });
  if (selectN > 0) {
    return random.shuffle(weightedItems).slice(0, selectN);
  }
  return random.pick(weightedItems);
}

export function overrideColor(p5, color, values = {}) {
  return p5.color(
    values.hue || p5.hue(color),
    values.saturation || p5.saturation(color),
    values.brightness || p5.brightness(color),
    values.alpha || p5.alpha(color)
  );
}

export function fbm(x, y, octaves = 1, modifier = 1) {
  let noiseAmt = 0;
  let totalAmplitude = 0;
  let frequency = 0.5;
  for (let o = 0; o < octaves; o++) {
    frequency *= 2;
    const amplitude = 1 / frequency;
    totalAmplitude += amplitude;
    noiseAmt += random.noise2D(x / modifier, y / modifier, frequency, amplitude);
  }
  return noiseAmt / totalAmplitude;
}
export function fbmz(x, y, z, octaves = 1, modifier = 1) {
  let noiseAmt = 0;
  let totalAmplitude = 0;
  let frequency = 0.5;
  for (let o = 0; o < octaves; o++) {
    frequency *= 2;
    const amplitude = 1 / frequency;
    totalAmplitude += amplitude;
    noiseAmt += random.noise3D(x / modifier, y / modifier, z / modifier, frequency, amplitude);
  }
  return noiseAmt / totalAmplitude;
}
