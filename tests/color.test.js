import { describe, expect, it } from 'vitest';
import { oklchToRgb } from '../src/render/index.js';

describe('OKLCH color conversion', () => {
  it('maps neutral black and white to canvas RGB', () => {
    expect(oklchToRgb(0, 0, 0)).toBe('rgb(0 0 0)');
    expect(oklchToRgb(1, 0, 0)).toBe('rgb(255 255 255)');
  });

  it('keeps highly chromatic colors in display gamut', () => {
    const rgb = oklchToRgb(0.7, 0.4, 350).match(/\d+/g).map(Number);
    expect(rgb).toHaveLength(3);
    expect(rgb.every((channel) => channel >= 0 && channel <= 255)).toBe(true);
  });
});
