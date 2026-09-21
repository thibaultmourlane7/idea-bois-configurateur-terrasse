import type {
  BoardOrientation,
  GeometryResult,
  ProjectInput,
  TerraceObstacle,
} from '../domain/types';

export const GEOMETRY_TAG = 'SA-TERR-GEO-001';
export const OBSTACLE_TAG = 'SA-TERR-GEO-OBS-001';

export interface PointM {
  x: number;
  y: number;
}

export type IntervalMm = [number, number];

const EPS = 1e-7;
const mm = (m: number) => m * 1000;

function polygonArea(points: PointM[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function polygonPerimeter(points: PointM[]): number {
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

  const excludedAreaM2 = input.obstacles.reduce((sum, obstacle) => sum + obstacleAreaM2(obstacle), 0);
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
