import type {
  LayingDirection,
  LayingStart,
  LayingZone,
  ProjectInput,
  TerraceObstacle,
  TerracePoint,
} from '../domain/types';
import { getDeckOutlinePointsM, getDeckPolygonM, isPointInsideBaseDeck } from './geometry';

export interface LayingBasis {
  dirX: number;
  dirY: number;
  normalX: number;
  normalY: number;
}

export interface ProjectedBounds {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

export type IntervalMm = [number, number];

const EPS = 1e-7;

function pointsToXY(points: TerracePoint[]): Array<{ x: number; y: number }> {
  return points.map((point) => ({ x: point.xM, y: point.yM }));
}

function regionOutline(input: ProjectInput, zone?: LayingZone): Array<{ x: number; y: number }> {
  return zone?.points?.length ? pointsToXY(zone.points) : getDeckOutlinePointsM(input);
}

function baseDirection(direction: LayingDirection): [number, number] {
  const inv = 1 / Math.sqrt(2);
  if (direction === 'width') return [0, 1];
  if (direction === 'diagonal-45') return [inv, inv];
  if (direction === 'diagonal--45') return [inv, -inv];
  return [1, 0];
}

function centroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function startPoint(
  points: Array<{ x: number; y: number }>,
  start: LayingStart,
  edgeIndex?: number,
): { x: number; y: number } {
  const c = centroid(points);
  if (!points.length) return c;
  if (start === 'edge') {
    const index = Math.max(0, Math.min(points.length - 1, Math.trunc(edgeIndex ?? 0)));
    const a = points[index];
    const b = points[(index + 1) % points.length];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  if (start === 'left') return { x: Math.min(...points.map((p) => p.x)), y: c.y };
  if (start === 'right') return { x: Math.max(...points.map((p) => p.x)), y: c.y };
  if (start === 'top') return { x: c.x, y: Math.min(...points.map((p) => p.y)) };
  return { x: c.x, y: Math.max(...points.map((p) => p.y)) };
}

export function resolveLayingBasis(
  input: ProjectInput,
  direction: LayingDirection,
  start: LayingStart,
  zone?: LayingZone,
  startEdgeIndex?: number,
): LayingBasis {
  let [dirX, dirY] = baseDirection(direction);
  let normalX = -dirY;
  let normalY = dirX;
  const points = regionOutline(input, zone);
  const c = centroid(points);
  const s = startPoint(points, start, startEdgeIndex);
  const towardCenterX = c.x - s.x;
  const towardCenterY = c.y - s.y;

  const alongDot = dirX * towardCenterX + dirY * towardCenterY;
  const transverseDot = normalX * towardCenterX + normalY * towardCenterY;
  if (alongDot < -EPS) {
    dirX *= -1;
    dirY *= -1;
  }
  if (transverseDot < -EPS) {
    normalX *= -1;
    normalY *= -1;
  }
  return { dirX, dirY, normalX, normalY };
}

export function effectiveProjectDirection(input: ProjectInput): LayingDirection {
  return input.layingDirection ?? input.orientation;
}

export function projectPointMm(
  xM: number,
  yM: number,
  basis: LayingBasis,
): { u: number; v: number } {
  return {
    u: (xM * basis.dirX + yM * basis.dirY) * 1000,
    v: (xM * basis.normalX + yM * basis.normalY) * 1000,
  };
}

export function worldPointFromUV(
  uMm: number,
  vMm: number,
  basis: LayingBasis,
): { xM: number; yM: number } {
  return {
    xM: (uMm * basis.dirX + vMm * basis.normalX) / 1000,
    yM: (uMm * basis.dirY + vMm * basis.normalY) / 1000,
  };
}

export function projectedBounds(
  points: Array<{ x: number; y: number }>,
  basis: LayingBasis,
): ProjectedBounds {
  const projected = points.map((point) => projectPointMm(point.x, point.y, basis));
  if (!projected.length) return { minU: 0, maxU: 0, minV: 0, maxV: 0 };
  return {
    minU: Math.min(...projected.map((p) => p.u)),
    maxU: Math.max(...projected.map((p) => p.u)),
    minV: Math.min(...projected.map((p) => p.v)),
    maxV: Math.max(...projected.map((p) => p.v)),
  };
}

function polygonIntervalsAtV(
  points: Array<{ x: number; y: number }>,
  basis: LayingBasis,
  vMm: number,
): IntervalMm[] {
  if (points.length < 3) return [];
  const projected = points.map((point) => projectPointMm(point.x, point.y, basis));
  const intersections: number[] = [];
  for (let i = 0; i < projected.length; i += 1) {
    const a = projected[i];
    const b = projected[(i + 1) % projected.length];
    if (Math.abs(b.v - a.v) <= 0.0001) continue;
    const minV = Math.min(a.v, b.v);
    const maxV = Math.max(a.v, b.v);
    if (vMm < minV - 0.0001 || vMm >= maxV - 0.0001) continue;
    const ratio = (vMm - a.v) / (b.v - a.v);
    intersections.push(a.u + ratio * (b.u - a.u));
  }
  intersections.sort((a, b) => a - b);
  const out: IntervalMm[] = [];
  for (let i = 0; i + 1 < intersections.length; i += 2) {
    if (intersections[i + 1] - intersections[i] > 0.01) out.push([intersections[i], intersections[i + 1]]);
  }
  return out;
}

function circleDeckIntervals(input: ProjectInput, basis: LayingBasis, vMm: number): IntervalMm[] {
  const radiusMm = input.dimensions.circleDiameterM * 500;
  const centerM = input.dimensions.circleDiameterM / 2;
  const center = projectPointMm(centerM, centerM, basis);
  const delta = vMm - center.v;
  if (Math.abs(delta) >= radiusMm) return [];
  const half = Math.sqrt(Math.max(0, radiusMm * radiusMm - delta * delta));
  return [[center.u - half, center.u + half]];
}

function intersectIntervals(a: IntervalMm[], b: IntervalMm[]): IntervalMm[] {
  const out: IntervalMm[] = [];
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      const start = Math.max(a0, b0);
      const end = Math.min(a1, b1);
      if (end - start > 0.01) out.push([start, end]);
    }
  }
  return out.sort((x, y) => x[0] - y[0]);
}

function subtractIntervals(base: IntervalMm[], cuts: IntervalMm[]): IntervalMm[] {
  let current = [...base];
  for (const [cutStart, cutEnd] of cuts) {
    const next: IntervalMm[] = [];
    for (const [start, end] of current) {
      if (cutEnd <= start + 0.01 || cutStart >= end - 0.01) {
        next.push([start, end]);
        continue;
      }
      if (cutStart > start + 0.01) next.push([start, Math.min(cutStart, end)]);
      if (cutEnd < end - 0.01) next.push([Math.max(cutEnd, start), end]);
    }
    current = next;
  }
  return current;
}

interface UVPoint { u: number; v: number }

function clipByV(
  polygon: UVPoint[],
  threshold: number,
  keepAbove: boolean,
): UVPoint[] {
  if (!polygon.length) return [];
  const inside = (p: UVPoint) => keepAbove ? p.v >= threshold - 0.0001 : p.v <= threshold + 0.0001;
  const out: UVPoint[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const ci = inside(current);
    const pi = inside(previous);
    const intersect = () => {
      const dv = current.v - previous.v;
      const t = Math.abs(dv) <= 0.0001 ? 0 : (threshold - previous.v) / dv;
      return {
        u: previous.u + (current.u - previous.u) * t,
        v: threshold,
      };
    };
    if (ci) {
      if (!pi) out.push(intersect());
      out.push(current);
    } else if (pi) {
      out.push(intersect());
    }
  }
  return out;
}

function polygonBandProjection(
  points: Array<{ x: number; y: number }>,
  basis: LayingBasis,
  vMm: number,
  halfWidthMm: number,
): IntervalMm | null {
  let polygon = points.map((point) => projectPointMm(point.x, point.y, basis));
  polygon = clipByV(polygon, vMm - halfWidthMm, true);
  polygon = clipByV(polygon, vMm + halfWidthMm, false);
  if (!polygon.length) return null;
  const us = polygon.map((point) => point.u);
  return [Math.min(...us), Math.max(...us)];
}

function obstaclePolygon(obstacle: TerraceObstacle): Array<{ x: number; y: number }> {
  const width = obstacle.widthM ?? 0;
  const height = obstacle.heightM ?? 0;
  return [
    { x: obstacle.xM, y: obstacle.yM },
    { x: obstacle.xM + width, y: obstacle.yM },
    { x: obstacle.xM + width, y: obstacle.yM + height },
    { x: obstacle.xM, y: obstacle.yM + height },
  ];
}

function obstacleForbiddenInterval(
  obstacle: TerraceObstacle,
  basis: LayingBasis,
  vMm: number,
  halfWidthMm: number,
): IntervalMm | null {
  if (obstacle.shape === 'rectangle') {
    return polygonBandProjection(obstaclePolygon(obstacle), basis, vMm, halfWidthMm);
  }
  const radiusMm = (obstacle.diameterM ?? 0) * 500;
  const center = projectPointMm(
    obstacle.xM + (obstacle.diameterM ?? 0) / 2,
    obstacle.yM + (obstacle.diameterM ?? 0) / 2,
    basis,
  );
  const perpendicularDistance = Math.max(0, Math.abs(vMm - center.v) - halfWidthMm);
  if (perpendicularDistance >= radiusMm) return null;
  const half = Math.sqrt(Math.max(0, radiusMm * radiusMm - perpendicularDistance * perpendicularDistance));
  return [center.u - half, center.u + half];
}

export function intervalsForRegionAtV(
  input: ProjectInput,
  basis: LayingBasis,
  vMm: number,
  halfBoardWidthMm: number,
  zone?: LayingZone,
  excludedZones: LayingZone[] = [],
): IntervalMm[] {
  let intervals = input.shape === 'circle'
    ? circleDeckIntervals(input, basis, vMm)
    : polygonIntervalsAtV(getDeckPolygonM(input) ?? [], basis, vMm);

  if (zone) {
    intervals = intersectIntervals(intervals, polygonIntervalsAtV(pointsToXY(zone.points), basis, vMm));
  }

  for (const excluded of excludedZones) {
    intervals = subtractIntervals(intervals, polygonIntervalsAtV(pointsToXY(excluded.points), basis, vMm));
  }

  const obstacleCuts = input.obstacles
    .map((obstacle) => obstacleForbiddenInterval(obstacle, basis, vMm, halfBoardWidthMm))
    .filter((value): value is IntervalMm => Boolean(value));
  return subtractIntervals(intervals, obstacleCuts);
}

function onSegment(a: TerracePoint, b: TerracePoint, p: TerracePoint): boolean {
  const cross = (p.yM - a.yM) * (b.xM - a.xM) - (p.xM - a.xM) * (b.yM - a.yM);
  if (Math.abs(cross) > EPS) return false;
  return p.xM >= Math.min(a.xM, b.xM) - EPS
    && p.xM <= Math.max(a.xM, b.xM) + EPS
    && p.yM >= Math.min(a.yM, b.yM) - EPS
    && p.yM <= Math.max(a.yM, b.yM) + EPS;
}

export function pointInZone(point: TerracePoint, zone: LayingZone): boolean {
  const points = zone.points;
  if (points.length < 3) return false;
  for (let i = 0; i < points.length; i += 1) {
    if (onSegment(points[i], points[(i + 1) % points.length], point)) return true;
  }
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const crosses = (a.yM > point.yM) !== (b.yM > point.yM)
      && point.xM < ((b.xM - a.xM) * (point.yM - a.yM)) / (b.yM - a.yM) + a.xM;
    if (crosses) inside = !inside;
  }
  return inside;
}

function segmentIntersection(a: TerracePoint, b: TerracePoint, c: TerracePoint, d: TerracePoint): boolean {
  const orient = (p: TerracePoint, q: TerracePoint, r: TerracePoint) => {
    const value = (q.yM - p.yM) * (r.xM - q.xM) - (q.xM - p.xM) * (r.yM - q.yM);
    if (Math.abs(value) <= EPS) return 0;
    return value > 0 ? 1 : 2;
  };
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && onSegment(a, b, c))
    || (o2 === 0 && onSegment(a, b, d))
    || (o3 === 0 && onSegment(c, d, a))
    || (o4 === 0 && onSegment(c, d, b));
}

function pointStrictlyInZone(point: TerracePoint, zone: LayingZone): boolean {
  for (let i = 0; i < zone.points.length; i += 1) {
    if (onSegment(zone.points[i], zone.points[(i + 1) % zone.points.length], point)) return false;
  }
  return pointInZone(point, zone);
}

function properSegmentIntersection(a: TerracePoint, b: TerracePoint, c: TerracePoint, d: TerracePoint): boolean {
  const cross = (p: TerracePoint, q: TerracePoint, r: TerracePoint) =>
    (q.xM - p.xM) * (r.yM - p.yM) - (q.yM - p.yM) * (r.xM - p.xM);
  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);
  return c1 * c2 < -EPS && c3 * c4 < -EPS;
}

export function zonesOverlap(a: LayingZone, b: LayingZone): boolean {
  for (let i = 0; i < a.points.length; i += 1) {
    const a1 = a.points[i];
    const a2 = a.points[(i + 1) % a.points.length];
    for (let j = 0; j < b.points.length; j += 1) {
      const b1 = b.points[j];
      const b2 = b.points[(j + 1) % b.points.length];
      if (properSegmentIntersection(a1, a2, b1, b2)) return true;
    }
  }

  if (a.points.some((point) => pointStrictlyInZone(point, b))) return true;
  if (b.points.some((point) => pointStrictlyInZone(point, a))) return true;

  const centroidOf = (zone: LayingZone): TerracePoint => ({
    xM: zone.points.reduce((sum, point) => sum + point.xM, 0) / zone.points.length,
    yM: zone.points.reduce((sum, point) => sum + point.yM, 0) / zone.points.length,
  });
  return pointStrictlyInZone(centroidOf(a), b) || pointStrictlyInZone(centroidOf(b), a);
}

export function zoneFitsBaseDeck(input: ProjectInput, zone: LayingZone): boolean {
  if (zone.points.length < 3) return false;
  if (input.shape === 'circle') {
    return zone.points.every((point) => isPointInsideBaseDeck(input, point.xM, point.yM));
  }

  const deck = getDeckOutlinePointsM(input);
  if (deck.length < 3) return false;
  if (zone.points.some((point) => !pointInPolygonForContainment(point, deck))) return false;

  for (let i = 0; i < zone.points.length; i += 1) {
    const a = zone.points[i];
    const b = zone.points[(i + 1) % zone.points.length];
    for (let j = 0; j < deck.length; j += 1) {
      const c = { xM: deck[j].x, yM: deck[j].y };
      const d = { xM: deck[(j + 1) % deck.length].x, yM: deck[(j + 1) % deck.length].y };
      if (properSegmentIntersection(a, b, c, d)) return false;
    }
    const midpoint = { xM: (a.xM + b.xM) / 2, yM: (a.yM + b.yM) / 2 };
    if (!pointInPolygonForContainment(midpoint, deck)) return false;
  }
  return true;
}

function pointInPolygonForContainment(
  point: TerracePoint,
  polygon: Array<{ x: number; y: number }>,
): boolean {
  for (let i = 0; i < polygon.length; i += 1) {
    const a = { xM: polygon[i].x, yM: polygon[i].y };
    const b = { xM: polygon[(i + 1) % polygon.length].x, yM: polygon[(i + 1) % polygon.length].y };
    if (onSegment(a, b, point)) return true;
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.y > point.yM) !== (b.y > point.yM)
      && point.xM < ((b.x - a.x) * (point.yM - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function zoneProjectedBounds(input: ProjectInput, basis: LayingBasis, zone?: LayingZone): ProjectedBounds {
  return projectedBounds(regionOutline(input, zone), basis);
}
