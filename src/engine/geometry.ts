import type { GeometryResult, ProjectInput } from '../domain/types';

export const GEOMETRY_TAG = 'IB-TERR-GEO-001';

export function computeGeometry(input: ProjectInput): GeometryResult {
  const { lengthM: L, widthM: W, notchLengthM: nL, notchWidthM: nW } = input.dimensions;

  if (input.shape === 'rectangle') {
    return { areaM2: L * W, perimeterM: 2 * (L + W) };
  }

  return {
    areaM2: L * W - nL * nW,
    perimeterM: 2 * (L + W),
  };
}
