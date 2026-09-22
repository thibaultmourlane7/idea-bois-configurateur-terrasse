import type {
  BoardOrientation,
  GeometryResult,
  ProjectInput,
  TerraceObstacle,
  TerracePoint,
} from '../domain/types';

export const GEOMETRY_TAG = 'SA-TERR-GEO-001';
export const OBSTACLE_TAG = 'SA-TERR-GEO-OBS-001';

export interface PointM {
  x: number;
  y: number;
}

export interface BoundarySegmentM {
  x1M: number;
  y1M: number;
  x2M: number;
  y2M: number;
  role: 'outer' | 'obstacle';
  /** true lorsque le segment approxime un arc : aucune lambourde droite n'est déduite automatiquement. */
  curved?: boolean;
}

export type IntervalMm = [number, number];

const EPS = 1e-7;
const mm = (m: number) => m * 1000;

export function polygonArea(points: PointM[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonPerimeter(points: PointM[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

export function getDeckPolygonM(input: ProjectInput): PointM[] | null {
  const g = input.dimensions;
  const L = input.shape === 'circle' ? g.circleDiameterM : g.lengthM;
  const W = input.shape === 'circle' ? g.circleDiameterM : g.widthM;

  if (input.shape === 'circle') return null;
  if (input.shape === 'freeform') {
    return (input.freeformPoints ?? []).map((point) => ({ x: point.xM, y: point.yM }));
  }
  if (input.shape === 'rectangle') {
    return [{ x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: W }, { x: 0, y: W }];
  }
  if (input.shape === 'l-shape') {
    return [
      { x: 0, y: 0 },
      { x: L, y: 0 },
      { x: L, y: W - g.notchWidthM },
      { x: L - g.notchLengthM, y: W - g.notchWidthM },
      { x: L - g.notchLengthM, y: W },
      { x: 0, y: W },
    ];
  }
  if (input.shape === 't-shape') {
    const stemLeft = (L - g.tStemWidthM) / 2;
    const stemRight = stemLeft + g.tStemWidthM;
    return [
      { x: 0, y: 0 },
      { x: L, y: 0 },
      { x: L, y: g.tBarDepthM },
      { x: stemRight, y: g.tBarDepthM },
      { x: stemRight, y: W },
      { x: stemLeft, y: W },
      { x: stemLeft, y: g.tBarDepthM },
      { x: 0, y: g.tBarDepthM },
    ];
  }

  const openingLeft = (L - g.uOpeningWidthM) / 2;
  const openingRight = openingLeft + g.uOpeningWidthM;
  return [
    { x: 0, y: 0 },
    { x: L, y: 0 },
    { x: L, y: W },
    { x: openingRight, y: W },
    { x: openingRight, y: W - g.uOpeningDepthM },
    { x: openingLeft, y: W - g.uOpeningDepthM },
    { x: openingLeft, y: W },
    { x: 0, y: W },
  ];
}

export function getDeckOutlinePointsM(input: ProjectInput, circleSegments = 48): PointM[] {
  if (input.shape !== 'circle') return getDeckPolygonM(input) ?? [];
  const d = input.dimensions.circleDiameterM;
  const r = d / 2;
  return Array.from({ length: circleSegments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / circleSegments;
    return { x: r + Math.cos(angle) * r, y: r + Math.sin(angle) * r };
  });
}

export function getDeckBoundingSizeM(input: ProjectInput): { lengthM: number; widthM: number } {
  if (input.shape === 'freeform') {
    const points = input.freeformPoints ?? [];
    if (!points.length) return { lengthM: input.dimensions.lengthM, widthM: input.dimensions.widthM };
    return {
      lengthM: Math.max(0.1, ...points.map((point) => point.xM)),
      widthM: Math.max(0.1, ...points.map((point) => point.yM)),
    };
  }
  if (input.shape === 'circle') {
    return { lengthM: input.dimensions.circleDiameterM, widthM: input.dimensions.circleDiameterM };
  }
  return { lengthM: input.dimensions.lengthM, widthM: input.dimensions.widthM };
}

function pointOnSegment(point: PointM, a: PointM, b: PointM): boolean {
  const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > EPS) return false;
  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < -EPS) return false;
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= lenSq + EPS;
}

function pointInPolygon(point: PointM, polygon: PointM[]): boolean {
  for (let i = 0; i < polygon.length; i += 1) {
    if (pointOnSegment(point, polygon[i], polygon[(i + 1) % polygon.length])) return true;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && (point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInsideBaseDeck(input: ProjectInput, xM: number, yM: number): boolean {
  if (input.shape === 'circle') {
    const r = input.dimensions.circleDiameterM / 2;
    return Math.hypot(xM - r, yM - r) <= r + EPS;
  }
  const polygon = getDeckPolygonM(input);
  return polygon ? pointInPolygon({ x: xM, y: yM }, polygon) : false;
}

export function obstacleAreaM2(obstacle: TerraceObstacle): number {
  if (obstacle.shape === 'circle') {
    const d = obstacle.diameterM ?? 0;
    return Math.PI * (d / 2) ** 2;
  }
  return (obstacle.widthM ?? 0) * (obstacle.heightM ?? 0);
}

export function obstaclePerimeterM(obstacle: TerraceObstacle): number {
  if (obstacle.shape === 'circle') return Math.PI * (obstacle.diameterM ?? 0);
  return 2 * ((obstacle.widthM ?? 0) + (obstacle.heightM ?? 0));
}

export function isPointInsideObstacle(obstacle: TerraceObstacle, xM: number, yM: number): boolean {
  if (obstacle.shape === 'circle') {
    const d = obstacle.diameterM ?? 0;
    const r = d / 2;
    return Math.hypot(xM - (obstacle.xM + r), yM - (obstacle.yM + r)) <= r + EPS;
  }
  const width = obstacle.widthM ?? 0;
  const height = obstacle.heightM ?? 0;
  return xM >= obstacle.xM - EPS
    && xM <= obstacle.xM + width + EPS
    && yM >= obstacle.yM - EPS
    && yM <= obstacle.yM + height + EPS;
}

export function getObstacleSamplePointsM(obstacle: TerraceObstacle): PointM[] {
  if (obstacle.shape === 'circle') {
    const d = obstacle.diameterM ?? 0;
    const r = d / 2;
    const cx = obstacle.xM + r;
    const cy = obstacle.yM + r;
    return [
      { x: cx, y: cy },
      ...Array.from({ length: 16 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 16;
        return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
      }),
    ];
  }

  const w = obstacle.widthM ?? 0;
  const h = obstacle.heightM ?? 0;
  return [
    { x: obstacle.xM, y: obstacle.yM },
    { x: obstacle.xM + w, y: obstacle.yM },
    { x: obstacle.xM + w, y: obstacle.yM + h },
    { x: obstacle.xM, y: obstacle.yM + h },
    { x: obstacle.xM + w / 2, y: obstacle.yM },
    { x: obstacle.xM + w, y: obstacle.yM + h / 2 },
    { x: obstacle.xM + w / 2, y: obstacle.yM + h },
    { x: obstacle.xM, y: obstacle.yM + h / 2 },
    { x: obstacle.xM + w / 2, y: obstacle.yM + h / 2 },
  ];
}

export function isObstacleInsideBaseDeck(input: ProjectInput, obstacle: TerraceObstacle): boolean {
  return getObstacleSamplePointsM(obstacle).every((point) => isPointInsideBaseDeck(input, point.x, point.y));
}

function rectsOverlap(a: TerraceObstacle, b: TerraceObstacle): boolean {
  const aw = a.widthM ?? 0;
  const ah = a.heightM ?? 0;
  const bw = b.widthM ?? 0;
  const bh = b.heightM ?? 0;
  return a.xM < b.xM + bw - EPS
    && a.xM + aw > b.xM + EPS
    && a.yM < b.yM + bh - EPS
    && a.yM + ah > b.yM + EPS;
}

function circlesOverlap(a: TerraceObstacle, b: TerraceObstacle): boolean {
  const ar = (a.diameterM ?? 0) / 2;
  const br = (b.diameterM ?? 0) / 2;
  const ax = a.xM + ar;
  const ay = a.yM + ar;
  const bx = b.xM + br;
  const by = b.yM + br;
  return Math.hypot(ax - bx, ay - by) < ar + br - EPS;
}

function circleRectOverlap(circle: TerraceObstacle, rect: TerraceObstacle): boolean {
  const r = (circle.diameterM ?? 0) / 2;
  const cx = circle.xM + r;
  const cy = circle.yM + r;
  const rw = rect.widthM ?? 0;
  const rh = rect.heightM ?? 0;
  const nearestX = Math.max(rect.xM, Math.min(cx, rect.xM + rw));
  const nearestY = Math.max(rect.yM, Math.min(cy, rect.yM + rh));
  return Math.hypot(cx - nearestX, cy - nearestY) < r - EPS;
}

export function obstaclesOverlap(a: TerraceObstacle, b: TerraceObstacle): boolean {
  if (a.shape === 'rectangle' && b.shape === 'rectangle') return rectsOverlap(a, b);
  if (a.shape === 'circle' && b.shape === 'circle') return circlesOverlap(a, b);
  return a.shape === 'circle' ? circleRectOverlap(a, b) : circleRectOverlap(b, a);
}

function orientation(a: PointM, b: PointM, c: PointM): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) <= EPS) return 0;
  return value > 0 ? 1 : 2;
}

function segmentsIntersect(a1: PointM, a2: PointM, b1: PointM, b2: PointM): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && pointOnSegment(b1, a1, a2)) return true;
  if (o2 === 0 && pointOnSegment(b2, a1, a2)) return true;
  if (o3 === 0 && pointOnSegment(a1, b1, b2)) return true;
  if (o4 === 0 && pointOnSegment(a2, b1, b2)) return true;
  return false;
}

export function isSimplePolygon(points: TerracePoint[]): boolean {
  if (points.length < 3) return false;
  const mapped = points.map((point) => ({ x: point.xM, y: point.yM }));
  for (let i = 0; i < mapped.length; i += 1) {
    const a1 = mapped[i];
    const a2 = mapped[(i + 1) % mapped.length];
    for (let j = i + 1; j < mapped.length; j += 1) {
      const adjacent = j === i || j === (i + 1) % mapped.length || i === (j + 1) % mapped.length;
      if (adjacent) continue;
      const b1 = mapped[j];
      const b2 = mapped[(j + 1) % mapped.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return polygonArea(mapped) > EPS;
}

function clipPolygon(
  polygon: PointM[],
  inside: (point: PointM) => boolean,
  intersection: (a: PointM, b: PointM) => PointM,
): PointM[] {
  if (!polygon.length) return [];
  const out: PointM[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentInside = inside(current);
    const previousInside = inside(previous);
    if (currentInside) {
      if (!previousInside) out.push(intersection(previous, current));
      out.push(current);
    } else if (previousInside) {
      out.push(intersection(previous, current));
    }
  }
  return out;
}

function clipPolygonToRect(polygon: PointM[], minX: number, maxX: number, minY: number, maxY: number): PointM[] {
  let out = polygon;
  out = clipPolygon(out, (p) => p.x >= minX - EPS, (a, b) => {
    const t = Math.abs(b.x - a.x) <= EPS ? 0 : (minX - a.x) / (b.x - a.x);
    return { x: minX, y: a.y + (b.y - a.y) * t };
  });
  out = clipPolygon(out, (p) => p.x <= maxX + EPS, (a, b) => {
    const t = Math.abs(b.x - a.x) <= EPS ? 0 : (maxX - a.x) / (b.x - a.x);
    return { x: maxX, y: a.y + (b.y - a.y) * t };
  });
  out = clipPolygon(out, (p) => p.y >= minY - EPS, (a, b) => {
    const t = Math.abs(b.y - a.y) <= EPS ? 0 : (minY - a.y) / (b.y - a.y);
    return { x: a.x + (b.x - a.x) * t, y: minY };
  });
  out = clipPolygon(out, (p) => p.y <= maxY + EPS, (a, b) => {
    const t = Math.abs(b.y - a.y) <= EPS ? 0 : (maxY - a.y) / (b.y - a.y);
    return { x: a.x + (b.x - a.x) * t, y: maxY };
  });
  return out;
}

function pointAt(a: PointM, b: PointM, t: number): PointM {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function cross(a: PointM, b: PointM): number {
  return a.x * b.y - a.y * b.x;
}

function dot(a: PointM, b: PointM): number {
  return a.x * b.x + a.y * b.y;
}

function circleSegmentContribution(a: PointM, b: PointM, radius: number): number {
  const d = { x: b.x - a.x, y: b.y - a.y };
  const aa = dot(d, d);
  const bb = 2 * dot(a, d);
  const cc = dot(a, a) - radius * radius;
  const ts = [0, 1];

  if (aa > EPS) {
    const discriminant = bb * bb - 4 * aa * cc;
    if (discriminant > EPS) {
      const root = Math.sqrt(discriminant);
      const t1 = (-bb - root) / (2 * aa);
      const t2 = (-bb + root) / (2 * aa);
      if (t1 > EPS && t1 < 1 - EPS) ts.push(t1);
      if (t2 > EPS && t2 < 1 - EPS) ts.push(t2);
    } else if (Math.abs(discriminant) <= EPS) {
      const t = -bb / (2 * aa);
      if (t > EPS && t < 1 - EPS) ts.push(t);
    }
  }

  ts.sort((x, y) => x - y);
  let total = 0;
  for (let i = 0; i < ts.length - 1; i += 1) {
    const p = pointAt(a, b, ts[i]);
    const q = pointAt(a, b, ts[i + 1]);
    const mid = pointAt(a, b, (ts[i] + ts[i + 1]) / 2);
    if (Math.hypot(mid.x, mid.y) <= radius + EPS) {
      total += cross(p, q) / 2;
    } else {
      total += radius * radius * Math.atan2(cross(p, q), dot(p, q)) / 2;
    }
  }
  return total;
}

function circlePolygonIntersectionArea(polygon: PointM[], centerX: number, centerY: number, radius: number): number {
  if (polygon.length < 3 || radius <= 0) return 0;
  const translated = polygon.map((point) => ({ x: point.x - centerX, y: point.y - centerY }));
  let area = 0;
  for (let i = 0; i < translated.length; i += 1) {
    area += circleSegmentContribution(translated[i], translated[(i + 1) % translated.length], radius);
  }
  return Math.abs(area);
}

function circleCircleIntersectionArea(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): number {
  if (r1 <= 0 || r2 <= 0) return 0;
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d >= r1 + r2 - EPS) return 0;
  if (d <= Math.abs(r1 - r2) + EPS) return Math.PI * Math.min(r1, r2) ** 2;

  const alpha = 2 * Math.acos(Math.max(-1, Math.min(1, (r1 * r1 + d * d - r2 * r2) / (2 * r1 * d))));
  const beta = 2 * Math.acos(Math.max(-1, Math.min(1, (r2 * r2 + d * d - r1 * r1) / (2 * r2 * d))));
  return 0.5 * r1 * r1 * (alpha - Math.sin(alpha))
    + 0.5 * r2 * r2 * (beta - Math.sin(beta));
}

function obstacleRectanglePolygon(obstacle: TerraceObstacle): PointM[] {
  const w = obstacle.widthM ?? 0;
  const h = obstacle.heightM ?? 0;
  return [
    { x: obstacle.xM, y: obstacle.yM },
    { x: obstacle.xM + w, y: obstacle.yM },
    { x: obstacle.xM + w, y: obstacle.yM + h },
    { x: obstacle.xM, y: obstacle.yM + h },
  ];
}

/**
 * Surface réellement retirée par une réservation.
 * Une réservation peut dépasser du contour : seule l'intersection avec la terrasse est comptée.
 */
export function obstacleIntersectionAreaM2(input: ProjectInput, obstacle: TerraceObstacle): number {
  if (input.shape === 'circle') {
    const deckR = input.dimensions.circleDiameterM / 2;
    const deckCx = deckR;
    const deckCy = deckR;
    if (obstacle.shape === 'circle') {
      const obstacleR = (obstacle.diameterM ?? 0) / 2;
      return circleCircleIntersectionArea(
        deckCx,
        deckCy,
        deckR,
        obstacle.xM + obstacleR,
        obstacle.yM + obstacleR,
        obstacleR,
      );
    }
    return circlePolygonIntersectionArea(obstacleRectanglePolygon(obstacle), deckCx, deckCy, deckR);
  }

  const deckPolygon = getDeckPolygonM(input) ?? [];
  if (obstacle.shape === 'circle') {
    const r = (obstacle.diameterM ?? 0) / 2;
    return circlePolygonIntersectionArea(deckPolygon, obstacle.xM + r, obstacle.yM + r, r);
  }

  const clipped = clipPolygonToRect(
    deckPolygon,
    obstacle.xM,
    obstacle.xM + (obstacle.widthM ?? 0),
    obstacle.yM,
    obstacle.yM + (obstacle.heightM ?? 0),
  );
  return polygonArea(clipped);
}

export function obstacleIntersectsBaseDeck(input: ProjectInput, obstacle: TerraceObstacle): boolean {
  return obstacleIntersectionAreaM2(input, obstacle) > 1e-8;
}

export function computeGeometry(input: ProjectInput): GeometryResult {
  let grossAreaM2 = 0;
  let outerPerimeterM = 0;

  if (input.shape === 'circle') {
    const d = input.dimensions.circleDiameterM;
    grossAreaM2 = Math.PI * (d / 2) ** 2;
    outerPerimeterM = Math.PI * d;
  } else {
    const polygon = getDeckPolygonM(input) ?? [];
    grossAreaM2 = polygonArea(polygon);
    outerPerimeterM = polygonPerimeter(polygon);
  }

  const excludedAreaM2 = input.obstacles.reduce((sum, obstacle) => sum + obstacleIntersectionAreaM2(input, obstacle), 0);
  const totalObstaclePerimeterM = input.obstacles.reduce((sum, obstacle) => sum + obstaclePerimeterM(obstacle), 0);

  return {
    areaM2: Math.max(0, grossAreaM2 - excludedAreaM2),
    perimeterM: outerPerimeterM,
    grossAreaM2,
    excludedAreaM2,
    outerPerimeterM,
    obstaclePerimeterM: totalObstaclePerimeterM,
    obstacleCount: input.obstacles.length,
  };
}

export function isPointInsideDeck(input: ProjectInput, xMm: number, yMm: number): boolean {
  const xM = xMm / 1000;
  const yM = yMm / 1000;
  return isPointInsideBaseDeck(input, xM, yM)
    && !input.obstacles.some((obstacle) => isPointInsideObstacle(obstacle, xM, yM));
}

function polygonIntervalsAtMm(input: ProjectInput, transverseMm: number, orientation: BoardOrientation): IntervalMm[] {
  const polygon = getDeckPolygonM(input);
  if (!polygon) return [];

  const points = polygon.map((point) => ({ x: mm(point.x), y: mm(point.y) }));
  const intersections: number[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const at = orientation === 'length' ? a.y : a.x;
    const bt = orientation === 'length' ? b.y : b.x;
    const al = orientation === 'length' ? a.x : a.y;
    const bl = orientation === 'length' ? b.x : b.y;

    if (Math.abs(bt - at) < 0.001) continue;
    const minT = Math.min(at, bt);
    const maxT = Math.max(at, bt);
    if (transverseMm < minT - 0.001 || transverseMm >= maxT - 0.001) continue;
    const ratio = (transverseMm - at) / (bt - at);
    intersections.push(al + ratio * (bl - al));
  }

  intersections.sort((a, b) => a - b);
  const intervals: IntervalMm[] = [];
  for (let i = 0; i + 1 < intersections.length; i += 2) {
    if (intersections[i + 1] - intersections[i] > 0.01) intervals.push([intersections[i], intersections[i + 1]]);
  }
  return intervals;
}

function circleBaseIntervalAtMm(input: ProjectInput, transverseMm: number): IntervalMm[] {
  const dMm = mm(input.dimensions.circleDiameterM);
  const r = dMm / 2;
  const delta = transverseMm - r;
  if (Math.abs(delta) >= r) return [];
  const halfChord = Math.sqrt(Math.max(0, r * r - delta * delta));
  return [[r - halfChord, r + halfChord]];
}

function obstacleIntervalAtMm(
  obstacle: TerraceObstacle,
  transverseMm: number,
  orientation: BoardOrientation,
  boardHalfWidthMm: number,
): IntervalMm | null {
  const transverseStart = mm(orientation === 'length' ? obstacle.yM : obstacle.xM);
  const longitudinalStart = mm(orientation === 'length' ? obstacle.xM : obstacle.yM);

  if (obstacle.shape === 'rectangle') {
    const transverseSize = mm(orientation === 'length' ? (obstacle.heightM ?? 0) : (obstacle.widthM ?? 0));
    const longitudinalSize = mm(orientation === 'length' ? (obstacle.widthM ?? 0) : (obstacle.heightM ?? 0));
    if (transverseMm + boardHalfWidthMm <= transverseStart + 0.001) return null;
    if (transverseMm - boardHalfWidthMm >= transverseStart + transverseSize - 0.001) return null;
    return [longitudinalStart, longitudinalStart + longitudinalSize];
  }

  const d = mm(obstacle.diameterM ?? 0);
  const r = d / 2;
  const centerT = transverseStart + r;
  const centerL = longitudinalStart + r;
  const effectiveR = r + boardHalfWidthMm;
  const delta = transverseMm - centerT;
  if (Math.abs(delta) >= effectiveR) return null;
  const halfChord = Math.sqrt(Math.max(0, effectiveR * effectiveR - delta * delta));
  return [centerL - halfChord, centerL + halfChord];
}

function subtractInterval(source: IntervalMm[], cut: IntervalMm): IntervalMm[] {
  const next: IntervalMm[] = [];
  for (const [start, end] of source) {
    if (cut[1] <= start + 0.001 || cut[0] >= end - 0.001) {
      next.push([start, end]);
      continue;
    }
    if (cut[0] > start + 0.001) next.push([start, Math.min(end, cut[0])]);
    if (cut[1] < end - 0.001) next.push([Math.max(start, cut[1]), end]);
  }
  return next.filter(([start, end]) => end - start > 1);
}

export function getDeckIntervalsAtMm(
  input: ProjectInput,
  transverseMm: number,
  orientation: BoardOrientation,
  boardHalfWidthMm = 0,
): IntervalMm[] {
  let intervals = input.shape === 'circle'
    ? circleBaseIntervalAtMm(input, transverseMm)
    : polygonIntervalsAtMm(input, transverseMm, orientation);

  for (const obstacle of input.obstacles) {
    const cut = obstacleIntervalAtMm(obstacle, transverseMm, orientation, boardHalfWidthMm);
    if (cut) intervals = subtractInterval(intervals, cut);
  }

  return intervals;
}

function lineCircleIntersectionTs(a: PointM, b: PointM, cx: number, cy: number, radius: number): number[] {
  const ax = a.x - cx;
  const ay = a.y - cy;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const aa = dx * dx + dy * dy;
  if (aa <= EPS) return [];
  const bb = 2 * (ax * dx + ay * dy);
  const cc = ax * ax + ay * ay - radius * radius;
  const disc = bb * bb - 4 * aa * cc;
  if (disc < -EPS) return [];
  if (Math.abs(disc) <= EPS) {
    const t = -bb / (2 * aa);
    return t > EPS && t < 1 - EPS ? [t] : [];
  }
  const root = Math.sqrt(Math.max(0, disc));
  return [(-bb - root) / (2 * aa), (-bb + root) / (2 * aa)]
    .filter((t) => t > EPS && t < 1 - EPS);
}

function lineLineIntersectionT(a: PointM, b: PointM, c: PointM, d: PointM): number | undefined {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) <= EPS) return undefined;
  const q = { x: c.x - a.x, y: c.y - a.y };
  const t = (q.x * s.y - q.y * s.x) / denom;
  const u = (q.x * r.y - q.y * r.x) / denom;
  if (t > EPS && t < 1 - EPS && u >= -EPS && u <= 1 + EPS) return t;
  return undefined;
}

function segmentObstacleBoundaryTs(a: PointM, b: PointM, obstacle: TerraceObstacle): number[] {
  if (obstacle.shape === 'circle') {
    const r = (obstacle.diameterM ?? 0) / 2;
    return lineCircleIntersectionTs(a, b, obstacle.xM + r, obstacle.yM + r, r);
  }
  const p = obstacleRectanglePolygon(obstacle);
  const out: number[] = [];
  for (let i = 0; i < p.length; i += 1) {
    const t = lineLineIntersectionT(a, b, p[i], p[(i + 1) % p.length]);
    if (t != null) out.push(t);
  }
  return out;
}

function segmentDeckBoundaryTs(input: ProjectInput, a: PointM, b: PointM): number[] {
  if (input.shape === 'circle') {
    const r = input.dimensions.circleDiameterM / 2;
    return lineCircleIntersectionTs(a, b, r, r, r);
  }
  const polygon = getDeckPolygonM(input) ?? [];
  const out: number[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const t = lineLineIntersectionT(a, b, polygon[i], polygon[(i + 1) % polygon.length]);
    if (t != null) out.push(t);
  }
  return out;
}

function splitSegment(
  a: PointM,
  b: PointM,
  extraTs: number[],
  keep: (mid: PointM) => boolean,
  role: BoundarySegmentM['role'],
  curved = false,
): BoundarySegmentM[] {
  const ts = [...new Set([0, 1, ...extraTs].map((value) => Math.round(value * 1e9) / 1e9))].sort((x, y) => x - y);
  const out: BoundarySegmentM[] = [];
  for (let i = 0; i < ts.length - 1; i += 1) {
    const t1 = ts[i];
    const t2 = ts[i + 1];
    if (t2 - t1 <= EPS) continue;
    const p = pointAt(a, b, t1);
    const q = pointAt(a, b, t2);
    const mid = pointAt(a, b, (t1 + t2) / 2);
    if (!keep(mid)) continue;
    if (Math.hypot(q.x - p.x, q.y - p.y) <= 0.001) continue;
    out.push({ x1M: p.x, y1M: p.y, x2M: q.x, y2M: q.y, role, curved });
  }
  return out;
}

/**
 * Contour utile de la terrasse après réservations.
 * Sert à implanter les lambourdes périphériques sans traverser une réservation qui mord le bord.
 */
export function getEffectiveBoundarySegmentsM(input: ProjectInput): BoundarySegmentM[] {
  const out: BoundarySegmentM[] = [];
  const deckOutline = getDeckOutlinePointsM(input, input.shape === 'circle' ? 180 : 48);

  for (let i = 0; i < deckOutline.length; i += 1) {
    const a = deckOutline[i];
    const b = deckOutline[(i + 1) % deckOutline.length];
    const cuts = input.obstacles.flatMap((obstacle) => segmentObstacleBoundaryTs(a, b, obstacle));
    out.push(...splitSegment(
      a,
      b,
      cuts,
      (mid) => !input.obstacles.some((obstacle) => isPointInsideObstacle(obstacle, mid.x, mid.y)),
      'outer',
      input.shape === 'circle',
    ));
  }

  for (const obstacle of input.obstacles) {
    if (obstacle.shape === 'rectangle') {
      const boundary = obstacleRectanglePolygon(obstacle);
      for (let i = 0; i < boundary.length; i += 1) {
        const a = boundary[i];
        const b = boundary[(i + 1) % boundary.length];
        out.push(...splitSegment(
          a,
          b,
          segmentDeckBoundaryTs(input, a, b),
          (mid) => isPointInsideBaseDeck(input, mid.x, mid.y),
          'obstacle',
        ));
      }
      continue;
    }

    const r = (obstacle.diameterM ?? 0) / 2;
    if (r <= 0) continue;
    const cx = obstacle.xM + r;
    const cy = obstacle.yM + r;
    const segments = 180;
    for (let i = 0; i < segments; i += 1) {
      const a1 = (Math.PI * 2 * i) / segments;
      const a2 = (Math.PI * 2 * (i + 1)) / segments;
      const a = { x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r };
      const b = { x: cx + Math.cos(a2) * r, y: cy + Math.sin(a2) * r };
      out.push(...splitSegment(
        a,
        b,
        segmentDeckBoundaryTs(input, a, b),
        (mid) => isPointInsideBaseDeck(input, mid.x, mid.y),
        'obstacle',
        true,
      ));
    }
  }

  return out;
}