import random from 'canvas-sketch-util/random';
import math from 'canvas-sketch-util/math';
import { fbm, overrideColor } from './utils';

export default class Cube {
  constructor(x, y, size, graphics, options) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.graphics = graphics;
    Object.keys(options).forEach(key => {
      this[key] = options[key];
    });
  }

  translateAndRotate(side, overrideTranslate = null, overrideAngle = null) {
    let translate = [0, 0];
    let angle = 0;
    switch (side) {
      case 'left':
        translate = [this.x - this.size, this.y - 1.55 * this.size];
        angle = this.graphics.PI / 6;
        break;
      case 'right':
        translate = [this.x - this.size, this.y - 1.135 * this.size];
        angle = -this.graphics.PI / 6;
        break;
      case 'top':
        if (random.value() > 0.5) {
          translate = [this.x - this.size, this.y - 2.5 * this.size];
          angle = this.graphics.PI / 6;
        } else {
          translate = [this.x - this.size, this.y - this.size / 1.5];
          angle = -this.graphics.PI / 6;
        }
        break;
      default:
        break;
    }

    if (overrideTranslate !== null) {
      translate = overrideTranslate;
    }
    if (overrideAngle !== null) {
      angle = overrideAngle;
    }
    this.graphics.translate(...translate);
    this.graphics.rotate(angle);
    this.angle = angle;
  }

  drawSide(side, drawShadow, drawGlow) {
    const points = [];
    switch (side) {
      case 'left':
        points.push(1, 2, 3);
        break;
      case 'right':
        points.push(1, 0, 5);
        break;
      case 'top':
        points.push(3, 4, 5);
        break;
      default:
        break;
    }
    this.graphics.drawingContext.beginPath();
    this.graphics.drawingContext.moveTo(this.x, this.y);
    points.forEach(p => {
      this.graphics.drawingContext.lineTo(...this.points[p]);
    });
    this.graphics.drawingContext.lineTo(this.x, this.y);
    this.graphics.drawingContext.closePath();
    if (drawShadow) {
      this.graphics.push();
      this.graphics.blendMode(this.graphics.SOFT_LIGHT);
      this.translateAndRotate(
        side,
        side === 'top' ? [this.x - this.size, this.y - this.size / 1.5] : null,
        side === 'top' ? -this.graphics.PI / 5.5 : null
      );
      let shadow = this.shadows[side];
      if (shadow === 'random') {
        shadow = random.pick(['light', 'dark', 'grad']);
      }
      switch (shadow) {
        case 'dark':
          this.graphics.drawingContext.fillStyle = this.graphics.color(0, 0, 0, this.shadowAlpha);
          break;
        case 'light':
          this.graphics.drawingContext.fillStyle = this.graphics.color(0, 0, 100, this.shadowAlpha);
          break;
        case 'grad':
          let grad = this.graphics.drawingContext.createLinearGradient(
            0,
            this.size,
            0,
            this.size * 1.5
          );
          if (side === 'top') {
            grad = this.graphics.drawingContext.createLinearGradient(
              0,
              this.size / 2,
              this.size,
              0
            );
          } else if (side === 'right') {
            grad = this.graphics.drawingContext.createLinearGradient(
              this.size * 150,
              -this.size / 10,
              this.size * 150.013,
              this.size * 2
            );
          }
          grad.addColorStop(this.gradStop1, this.graphics.color(0, 0, 100, this.shadowAlpha));
          grad.addColorStop(this.gradStop2, this.graphics.color(0, 0, 0, this.shadowAlpha));
          this.graphics.drawingContext.fillStyle = grad;
          break;
        case 'grad-reverse':
          let revGrad = this.graphics.drawingContext.createLinearGradient(
            this.size / 1.6,
            -this.size / 1.6,
            this.size / 2,
            this.size * 2
          );
          revGrad.addColorStop(this.gradStop1, this.graphics.color(0, 0, 0, this.shadowAlpha));
          revGrad.addColorStop(this.gradStop2, this.graphics.color(0, 0, 100, this.shadowAlpha));
          this.graphics.drawingContext.fillStyle = revGrad;
          break;
        default:
          break;
      }

      this.graphics.drawingContext.fill();
      this.graphics.pop();
    }

    this.graphics.drawingContext.clip();
    if (this.glowing && drawGlow) {
      this.graphics.push();
      this.graphics.stroke(this.cubeStrokeColor);
      const cubeGlow = random.pick(this.palette.colors);
      for (let i = 0; i < 4; i++) {
        this.graphics.drawingContext.shadowColor = overrideColor(this.graphics, cubeGlow, {
          brightness: this.graphics.brightness(cubeGlow) * 2,
          saturation: this.graphics.saturation(cubeGlow) / 2,
          alpha: 0.5,
        });
        this.graphics.drawingContext.shadowBlur = ((i + 1) * this.size) / 30;
        this.graphics.drawingContext.stroke();
      }
      this.graphics.pop();
    }
    if (this.patchwork) {
      this.graphics.push();
      this.graphics.stroke(0, 0, 0);
      this.graphics.strokeCap(this.graphics.PROJECT);
      this.graphics.strokeWeight(this.size / this.cubeStrokeWeight / 2);
      if (this.graphics.brightness(this.cubeStrokeColor) < 50) {
        this.graphics.stroke(0, 0, 100);
      }
      const lineDashes = [];
      for (let i = 0; i < 30; i++) {
        lineDashes.push(random.range(this.size / 50, this.size / 10));
      }
      this.graphics.drawingContext.setLineDash(lineDashes);
      this.graphics.drawingContext.stroke();
      this.graphics.pop();
    }
    if (this.messy) {
      const reps = random.range(2, 10);
      for (let i = 0; i < reps; i++) {
        this.graphics.stroke(
          random.pick([this.cubeStrokeColor, this.palette.colors[0], this.palette.colors[1]])
        );
        this.graphics.drawingContext.beginPath();
        this.graphics.strokeWeight(1);
        this.graphics.drawingContext.beginPath();
        this.graphics.drawingContext.moveTo(
          this.x + random.gaussian(0, this.size / 20),
          this.y + random.gaussian(0, this.size / 20)
        );
        points.forEach(p => {
          this.graphics.drawingContext.lineTo(
            this.points[p][0] + random.gaussian(0, this.size / 20),
            this.points[p][1] + random.gaussian(0, this.size / 20)
          );
        });
        this.graphics.drawingContext.lineTo(
          this.x + random.gaussian(0, this.size / 20),
          this.y + random.gaussian(0, this.size / 20)
        );
        this.graphics.drawingContext.closePath();
        this.graphics.drawingContext.stroke();
        this.graphics.drawingContext.closePath();
      }
    }
  }

  drawStripes(side, color) {
    this.translateAndRotate(side);

    for (let y = 0; y <= this.size * 3; y += this.stripeSpacing * this.stripeSize) {
      if (this.strokePatterns) {
        this.graphics.strokeWeight(this.stripeSize * 2);
        this.graphics.stroke(this.cubeStrokeColor);
        this.graphics.line(-1500, y, 1500, y);
      }
      this.graphics.strokeWeight(this.stripeSize);
      this.graphics.stroke(color);
      this.graphics.line(-1500, y, 1500, y);
      if (this.messy) {
        this.graphics.stroke(color);
        this.graphics.line(
          -1500 + random.gaussian(0, this.size / 20),
          y + random.gaussian(0, this.size / 20),
          1500 + random.gaussian(0, this.size / 20),
          y + random.gaussian(0, this.size / 20)
        );
      }
    }
  }

  drawDots(side, color) {
    this.translateAndRotate(side);
    const dotSize = this.size / this.dotDivider;
    const dotSpacing = this.dotSpacing;

    let i = 0;
    for (let y = 0; y < this.size * 3; y += dotSize * dotSpacing) {
      for (let x = -this.size; x < this.size * 3; x += dotSize * dotSpacing) {
        if (this.strokePatterns) {
          this.graphics.strokeWeight(dotSize * 1.5);
          this.graphics.stroke(this.cubeStrokeColor);
          this.graphics.point(x + (i % 2 === 0 ? 0 : dotSize * dotSpacing), y);
        }
        this.graphics.strokeWeight(dotSize);
        this.graphics.stroke(color);
        this.graphics.point(x + (i % 2 === 0 ? 0 : dotSize * dotSpacing), y);
      }
      i++;
    }
  }

  drawZigZag(side, color) {
    this.translateAndRotate(side);
    this.graphics.stroke(color);
    for (let round = 0; round < 2; round++) {
      for (let y = 0; y < this.size * 3; y += this.size / 4) {
        let i = 0;
        for (let x = -this.size; x < this.size * 3; x += this.size / this.zigZagCount) {
          if (!this.strokePatterns && round === 0) continue;
          let yoff = i % 2 === 0 ? -this.zigZagOffset : this.zigZagOffset;
          const strokeWeight = this.size / 30;

          if (round === 0) {
            this.graphics.stroke(this.cubeStrokeColor);
            this.graphics.strokeWeight(strokeWeight * 2);
            this.graphics.line(x, y - yoff, x + this.size / this.zigZagCount, y + yoff);
          } else {
            this.graphics.stroke(color);
            this.graphics.strokeWeight(strokeWeight);
            this.graphics.line(x, y - yoff, x + this.size / this.zigZagCount, y + yoff);
          }

          if (this.messy) {
            const reps = random.range(1, 3);
            for (let j = 0; j < reps; j++) {
              if (round === 0) {
                this.graphics.stroke(this.cubeStrokeColor);
                this.graphics.strokeWeight(strokeWeight / 2);
                this.graphics.line(
                  x + random.gaussian(0, this.size / 60),
                  y - yoff + random.gaussian(0, this.size / 60),
                  x + this.size / this.zigZagCount + random.gaussian(0, this.size / 60),
                  y + yoff + random.gaussian(0, this.size / 60)
                );
              } else {
                this.graphics.stroke(color);
                this.graphics.strokeWeight(strokeWeight / 4);
                this.graphics.line(
                  x + random.gaussian(0, this.size / 60),
                  y - yoff + random.gaussian(0, this.size / 60),
                  x + this.size / this.zigZagCount + random.gaussian(0, this.size / 60),
                  y + yoff + random.gaussian(0, this.size / 60)
                );
              }
            }
          }
          i++;
        }
      }
    }
  }

  drawFans(side, color) {
    if (side === 'top') {
      this.translateAndRotate(
        'top',
        [this.x - this.size * 0.05, this.y - this.size * 0.85],
        this.graphics.PI / 6
      );
    } else {
      this.translateAndRotate(side);
    }
    const dotSize = this.size / 10;
    const dotSpacing = 2.5;

    let i = 0;
    for (let y = 0; y < this.size * 3; y += dotSize * dotSpacing) {
      for (let x = -this.size; x < this.size * 3; x += dotSize * dotSpacing) {
        for (let r = 0; r < this.fanRepeats; r++) {
          this.graphics.strokeWeight(
            math.mapRange(r, 0, this.fanRepeats * this.fanMult, 5, 1) * dotSize
          );
          this.graphics.stroke(r % 2 === 0 ? color : this.cubeStrokeColor);
          this.graphics.point(x + (i % 2 === 0 ? 0 : dotSize * dotSpacing), y);
        }
      }
      i++;
    }
  }

  drawPatches(side, color) {
    this.translateAndRotate(side);
    let startingX = 0;
    let startingY = 0;
    switch (side) {
      case 'left':
        this.graphics.drawingContext.transform(1, 0, 0.58, 1, 0, 0);
        startingX = -this.size * 0.58;
        startingY = -this.size * 0.125;
        break;
      case 'right':
        this.graphics.drawingContext.transform(1, 0, -0.58, 1, 0, 0);
        startingX = -this.size * 0.58;
        startingY = -this.size * 0.23;
        break;
      case 'top':
        this.graphics.drawingContext.transform(1, 0, -this.angle * 1.1, 1, 0, 0);
        startingX = -this.size * 0.4;
        startingY = -this.size * 0.62;
        break;
    }

    const patchSize = this.size / random.pick([2, 3, 6, 8, 10]);
    for (let x = startingX; x < this.size * 3; x += patchSize) {
      for (let y = startingY; y < this.size * 3; y += patchSize) {
        if (this.strokePatterns) {
          this.graphics.stroke(this.cubeStrokeColor);
          this.graphics.rect(x, y, patchSize, patchSize);
        } else {
          this.graphics.noStroke();
        }
        this.graphics.fill(random.value() > 0.5 ? random.pick(this.palette.colors) : this.color);
        this.graphics.rect(x, y, patchSize, patchSize);
      }
    }
  }

  fill(color) {
    this.graphics.fill(color);
    this.graphics.drawingContext.fill();
  }

  gradientStroke(color) {
    this.graphics.stroke(color);
  }

  strokeSide() {
    this.graphics.stroke(this.cubeStrokeColor);
    this.graphics.strokeWeight(this.size / this.cubeStrokeWeight);
    this.graphics.drawingContext.stroke();
  }

  draw() {
    this.points = [];
    let angle =
      this.cubeRotation === 'Whacky'
        ? random.range(-this.graphics.PI / 3, this.graphics.PI / 3)
        : this.cubeRotation;
    for (angle; angle < this.graphics.TWO_PI; angle += this.graphics.PI / 3) {
      this.points.push([
        this.x +
          this.graphics.cos(angle) * this.size +
          (this.shattered ? random.gaussian(0, this.size / this.shatterDivider) : 0),
        this.y +
          this.graphics.sin(angle) * this.size +
          (this.shattered ? random.gaussian(0, this.size / this.shatterDivider) : 0),
        ,
      ]);
    }

    this.graphics.strokeWeight(this.size / this.cubeStrokeWeight);

    ['left', 'right', 'top'].forEach((side, i) => {
      this.graphics.push();
      this.drawSide(side, false);

      let pattern = this.cubePatterns[i];

      const ci = Math.floor(
        math.mapRange(
          fbm(this.x, this.y, 1, 500),
          -0.75,
          0.75,
          0,
          this.palette.colors.length - 0.001,
          true
        )
      );
      let color = this.palette.colors[ci];
      if (this.timeOfDay === 'Party Time') {
        color = random.pick(this.palette.colors);
      }
      this.color = color;
      if (color.toString('#rrggbb') === this.cubeStrokeColor.toString('#rrggbb')) {
        color = random
          .shuffle(this.palette.colors)
          .find(col => col.toString('#rrggbb') !== this.cubeStrokeColor.toString('#rrggbb'));
      }

      switch (pattern) {
        case 'fill':
          this.fill(color);
          this.graphics.stroke(this.cubeStrokeColor);
          this.graphics.drawingContext.stroke();
          break;
        case 'dots':
          this.graphics.push();
          this.gradientStroke(color);
          this.drawDots(side, color);
          this.graphics.pop();
          this.drawSide(side);
          this.strokeSide();
          break;
        case 'stripes':
          this.graphics.push();
          this.gradientStroke(color);
          this.drawStripes(side, color);
          this.graphics.pop();
          this.drawSide(side);
          this.strokeSide();
          break;
        case 'zigzag':
          this.graphics.push();
          this.drawZigZag(side, color);
          this.graphics.pop();
          this.drawSide(side);
          this.strokeSide();
          break;
        case 'patches':
          this.graphics.push();
          this.gradientStroke(color);
          this.drawPatches(side, color);
          this.graphics.pop();
          this.drawSide(side);
          this.strokeSide();
          break;
        case 'fans':
          this.graphics.push();
          this.gradientStroke(color);
          this.drawFans(side, color);
          this.graphics.pop();
          this.drawSide(side);
          this.strokeSide();
          break;
        case 'empty':
          this.graphics.push();
          this.gradientStroke(color);
          this.graphics.pop();
          this.drawSide(side);
          this.strokeSide();
          break;
        case 'gradient':
          this.graphics.push();
          this.graphics.blendMode(this.graphics.SOFT_LIGHT);
          this.translateAndRotate(
            side,
            side === 'top' ? [this.x - this.size, this.y - this.size / 1.5] : null,
            side === 'top' ? -this.graphics.PI / 5.5 : null
          );

          let grad = this.graphics.drawingContext.createLinearGradient(
            0,
            this.size,
            0,
            this.size * 1.5
          );
          if (side === 'top') {
            grad = this.graphics.drawingContext.createLinearGradient(
              0,
              this.size / 2,
              this.size,
              0
            );
          } else if (side === 'right') {
            grad = this.graphics.drawingContext.createLinearGradient(
              this.size * 150,
              -this.size / 10,
              this.size * 150.013,
              this.size * 2
            );
          }
          grad.addColorStop(this.gradStop1, random.pick(this.palette.colors));
          const col2 = random.pick(this.palette.colors);
          grad.addColorStop(
            this.gradStop2,
            overrideColor(this.graphics, col2, {
              brightness: this.graphics.brightness(col2) / 1.5,
            })
          );
          this.graphics.drawingContext.fillStyle = grad;

          this.graphics.drawingContext.fill();
          this.graphics.pop();
          this.strokeSide();
        default:
          break;
      }

      this.drawSide(side, true, true);
      this.graphics.pop();
    });
  }
}
