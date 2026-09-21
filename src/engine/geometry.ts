import type { GeometryResult, ProjectInput } from '../domain/types';

export const GEOMETRY_TAG = 'SA-TERR-GEO-001';

export function computeGeometry(input: ProjectInput): GeometryResult {
  const { lengthM: L, widthM: W, notchLengthM: nL, notchWidthM: nW } = input.dimensions;
  if (input.shape === 'rectangle') return { areaM2: L * W, perimeterM: 2 * (L + W) };
  return { areaM2: L * W - nL * nW, perimeterM: 2 * (L + W) };
}

export function isPointInsideDeck(input: ProjectInput, xMm: number, yMm: number): boolean {
  const L = input.dimensions.lengthM * 1000;
  const W = input.dimensions.widthM * 1000;
  if (xMm < -0.001 || yMm < -0.001 || xMm > L + 0.001 || yMm > W + 0.001) return false;
  if (input.shape === 'rectangle') return true;

  const notchStartX = (input.dimensions.lengthM - input.dimensions.notchLengthM) * 1000;
  const notchStartY = (input.dimensions.widthM - input.dimensions.notchWidthM) * 1000;
  return !(xMm > notchStartX + 0.001 && yMm > notchStartY + 0.001);
}
