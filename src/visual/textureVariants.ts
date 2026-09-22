export interface TextureVariant {
  index: number;
  offsetXRatio: number;
  offsetYRatio: number;
  brightnessOverlay: number;
  knotRatios: number[];
}

const VARIANTS: TextureVariant[] = [
  { index: 0, offsetXRatio: 0.04, offsetYRatio: 0.07, brightnessOverlay: 0.00, knotRatios: [0.24] },
  { index: 1, offsetXRatio: 0.31, offsetYRatio: 0.18, brightnessOverlay: 0.025, knotRatios: [0.63] },
  { index: 2, offsetXRatio: 0.57, offsetYRatio: 0.11, brightnessOverlay: -0.018, knotRatios: [0.37, 0.81] },
  { index: 3, offsetXRatio: 0.79, offsetYRatio: 0.24, brightnessOverlay: 0.012, knotRatios: [] },
];

export function resolveTextureVariant(rowIndex: number, segmentIndex = 0, variantCount = 4): TextureVariant {
  const count = Math.max(1, Math.min(variantCount, VARIANTS.length));
  const seed = Math.abs((rowIndex * 7 + segmentIndex * 3) % count);
  return VARIANTS[seed];
}
