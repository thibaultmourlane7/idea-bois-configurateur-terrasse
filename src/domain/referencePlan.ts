import type { ReferencePlanTransform, TerracePoint } from './types';

const EPS = 1e-9;

export interface ReferenceImageSize {
  widthPx: number;
  heightPx: number;
}

export interface ReferencePlanDiagnostic {
  severity: 'info' | 'warning';
  message: string;
}

function rotate(x: number, y: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function normalizeRotationDeg(value: number): number {
  if (!Number.isFinite(value)) return 0;
  let result = value % 360;
  if (result > 180) result -= 360;
  if (result <= -180) result += 360;
  return result;
}

export function fitReferencePlan(image: ReferenceImageSize, targetLengthM: number, targetWidthM: number): ReferencePlanTransform {
  const widthPx = Math.max(1, image.widthPx);
  const heightPx = Math.max(1, image.heightPx);
  const scaleMmPerPixel = Math.max(
    0.001,
    Math.min((Math.max(0.1, targetLengthM) * 1000) / widthPx, (Math.max(0.1, targetWidthM) * 1000) / heightPx),
  );
  return {
    scaleMmPerPixel,
    offsetXM: 0,
    offsetYM: 0,
    rotationDeg: 0,
    opacity: 0.34,
    locked: false,
    calibrated: false,
    imageWidthPx: widthPx,
    imageHeightPx: heightPx,
  };
}

export function imagePixelToModel(transform: ReferencePlanTransform, pixelX: number, pixelY: number): TerracePoint {
  const scaleMPerPixel = transform.scaleMmPerPixel / 1000;
  const rotated = rotate(pixelX * scaleMPerPixel, pixelY * scaleMPerPixel, transform.rotationDeg);
  return { xM: transform.offsetXM + rotated.x, yM: transform.offsetYM + rotated.y };
}

export function modelToImagePixel(transform: ReferencePlanTransform, point: TerracePoint): { xPx: number; yPx: number } {
  const scaleMPerPixel = transform.scaleMmPerPixel / 1000;
  if (!Number.isFinite(scaleMPerPixel) || scaleMPerPixel <= EPS) return { xPx: 0, yPx: 0 };
  const local = rotate(point.xM - transform.offsetXM, point.yM - transform.offsetYM, -transform.rotationDeg);
  return { xPx: local.x / scaleMPerPixel, yPx: local.y / scaleMPerPixel };
}

export function calibrateReferencePlan(
  transform: ReferencePlanTransform,
  pointA: TerracePoint,
  pointB: TerracePoint,
  knownDistanceMm: number,
): ReferencePlanTransform {
  if (!Number.isFinite(knownDistanceMm) || knownDistanceMm <= 0) throw new Error('Distance de calibration invalide.');
  const imageA = modelToImagePixel(transform, pointA);
  const imageB = modelToImagePixel(transform, pointB);
  const pixelDistance = Math.hypot(imageB.xPx - imageA.xPx, imageB.yPx - imageA.yPx);
  if (!Number.isFinite(pixelDistance) || pixelDistance <= EPS) throw new Error('Les deux points de calibration doivent être distincts.');

  const scaleMmPerPixel = knownDistanceMm / pixelDistance;
  const anchorVector = rotate(
    imageA.xPx * scaleMmPerPixel / 1000,
    imageA.yPx * scaleMmPerPixel / 1000,
    transform.rotationDeg,
  );

  return {
    ...transform,
    scaleMmPerPixel,
    offsetXM: pointA.xM - anchorVector.x,
    offsetYM: pointA.yM - anchorVector.y,
    calibrated: true,
    calibrationDistanceMm: knownDistanceMm,
  };
}

export function zoomReferencePlan(transform: ReferencePlanTransform, factor: number): ReferencePlanTransform {
  if (!Number.isFinite(factor) || factor <= 0) return transform;
  return {
    ...transform,
    scaleMmPerPixel: Math.max(0.001, transform.scaleMmPerPixel * factor),
    calibrated: false,
    calibrationDistanceMm: undefined,
  };
}

export function sanitizeReferencePlanTransform(value: unknown): ReferencePlanTransform | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const scaleMmPerPixel = Number(raw.scaleMmPerPixel);
  const offsetXM = Number(raw.offsetXM);
  const offsetYM = Number(raw.offsetYM);
  const rotationDeg = Number(raw.rotationDeg);
  const opacity = Number(raw.opacity);
  if (![scaleMmPerPixel, offsetXM, offsetYM, rotationDeg, opacity].every(Number.isFinite) || scaleMmPerPixel <= 0) return undefined;
  const calibrationDistanceMm = raw.calibrationDistanceMm == null ? undefined : Number(raw.calibrationDistanceMm);
  const imageWidthPx = raw.imageWidthPx == null ? undefined : Number(raw.imageWidthPx);
  const imageHeightPx = raw.imageHeightPx == null ? undefined : Number(raw.imageHeightPx);
  return {
    scaleMmPerPixel,
    offsetXM,
    offsetYM,
    rotationDeg: normalizeRotationDeg(rotationDeg),
    opacity: Math.min(1, Math.max(0.05, opacity)),
    locked: Boolean(raw.locked),
    calibrated: Boolean(raw.calibrated),
    calibrationDistanceMm: Number.isFinite(calibrationDistanceMm) && (calibrationDistanceMm ?? 0) > 0 ? calibrationDistanceMm : undefined,
    imageWidthPx: Number.isFinite(imageWidthPx) && (imageWidthPx ?? 0) > 0 ? imageWidthPx : undefined,
    imageHeightPx: Number.isFinite(imageHeightPx) && (imageHeightPx ?? 0) > 0 ? imageHeightPx : undefined,
  };
}

export function referencePlanDiagnostics(transform?: ReferencePlanTransform): ReferencePlanDiagnostic[] {
  if (!transform) return [];
  if (!Number.isFinite(transform.scaleMmPerPixel) || transform.scaleMmPerPixel <= 0) {
    return [{ severity: 'warning', message: 'Échelle du fond invalide : recalibration nécessaire.' }];
  }
  if (!transform.calibrated) {
    return [{ severity: 'warning', message: 'Fond chargé mais non calibré : il ne doit pas servir de référence de mesure.' }];
  }
  return [{
    severity: 'info',
    message: `Fond calibré sur ${((transform.calibrationDistanceMm ?? 0) / 1000).toFixed(2)} m. Les dimensions du projet restent celles du dessin vectoriel.`,
  }];
}
