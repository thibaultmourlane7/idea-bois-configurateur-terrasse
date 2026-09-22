import type { ProjectInput, TerraceObstacle, TerracePoint } from '../domain/types';

const MIN_SIZE_M = 0.05;
const EPS = 1e-9;

export function defaultFreeformPoints(project: ProjectInput): TerracePoint[] {
  if (project.freeformPoints && project.freeformPoints.length >= 3) {
    return project.freeformPoints.map((point) => ({ ...point }));
  }
  const lengthM = project.shape === 'circle' ? project.dimensions.circleDiameterM : project.dimensions.lengthM;
  const widthM = project.shape === 'circle' ? project.dimensions.circleDiameterM : project.dimensions.widthM;
  return [
    { xM: 0, yM: 0 },
    { xM: lengthM, yM: 0 },
    { xM: lengthM, yM: widthM },
    { xM: 0, yM: widthM },
  ];
}

export function addVertexOnLongestEdge(points: TerracePoint[]): TerracePoint[] {
  if (points.length < 2) return points;
  let bestIndex = 0;
  let bestLength = -1;

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const length = Math.hypot(b.xM - a.xM, b.yM - a.yM);
    if (length > bestLength) {
      bestLength = length;
      bestIndex = i;
    }
  }

  const a = points[bestIndex];
  const b = points[(bestIndex + 1) % points.length];
  const midpoint = {
    xM: (a.xM + b.xM) / 2,
    yM: (a.yM + b.yM) / 2,
  };

  return [
    ...points.slice(0, bestIndex + 1),
    midpoint,
    ...points.slice(bestIndex + 1),
  ];
}

export function moveVertex(points: TerracePoint[], index: number, xM: number, yM: number): TerracePoint[] {
  return points.map((point, currentIndex) => currentIndex === index
    ? { xM: Math.max(0, xM), yM: Math.max(0, yM) }
    : point);
}

export function removeVertex(points: TerracePoint[], index: number): TerracePoint[] {
  if (points.length <= 3) return points;
  return points.filter((_, currentIndex) => currentIndex !== index);
}

/**
 * Une réservation peut dépasser du contour de la terrasse. On ne borne donc pas x/y à zéro.
 */
export function moveObstacle(obstacle: TerraceObstacle, xM: number, yM: number): TerraceObstacle {
  return {
    ...obstacle,
    xM,
    yM,
  };
}

export function resizeObstacle(obstacle: TerraceObstacle, pointerXM: number, pointerYM: number): TerraceObstacle {
  if (obstacle.shape === 'circle') {
    const diameterM = Math.max(MIN_SIZE_M, pointerXM - obstacle.xM);
    return { ...obstacle, diameterM };
  }

  return {
    ...obstacle,
    widthM: Math.max(MIN_SIZE_M, pointerXM - obstacle.xM),
    heightM: Math.max(MIN_SIZE_M, pointerYM - obstacle.yM),
  };
}


export function isOrthogonalPolygon(points: TerracePoint[], tolerance = 1e-7): boolean {
  if (points.length < 3) return false;
  return points.every((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.abs(next.xM - point.xM) <= tolerance || Math.abs(next.yM - point.yM) <= tolerance;
  });
}

export function polygonEdgeLengths(points: TerracePoint[]): number[] {
  if (points.length < 2) return [];
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.xM - point.xM, next.yM - point.yM);
  });
}

/**
 * Modifie la longueur du côté index -> index+1.
 * Le premier sommet reste fixe et le second se déplace dans la direction actuelle du côté.
 * Aucun angle n'est inventé.
 */
export function resizeFreeformEdge(points: TerracePoint[], edgeIndex: number, targetLengthM: number): TerracePoint[] {
  if (!Number.isFinite(targetLengthM) || targetLengthM < MIN_SIZE_M || points.length < 3) return points;
  const startIndex = ((edgeIndex % points.length) + points.length) % points.length;
  const endIndex = (startIndex + 1) % points.length;
  const start = points[startIndex];
  const end = points[endIndex];
  const dx = end.xM - start.xM;
  const dy = end.yM - start.yM;
  const currentLength = Math.hypot(dx, dy);
  if (currentLength <= EPS) return points;

  const ratio = targetLengthM / currentLength;
  const nextEnd = {
    xM: start.xM + dx * ratio,
    yM: start.yM + dy * ratio,
  };
  if (nextEnd.xM < 0 || nextEnd.yM < 0) return points;

  return points.map((point, index) => index === endIndex ? nextEnd : point);
}


/**
 * Variante pour un contour orthogonal : le premier sommet du côté reste fixe,
 * le second et le sommet suivant sont translatés sur l'axe du côté.
 * Cela conserve les angles droits sans inventer d'angle.
 */
export function resizeOrthogonalFreeformEdge(points: TerracePoint[], edgeIndex: number, targetLengthM: number): TerracePoint[] {
  if (!Number.isFinite(targetLengthM) || targetLengthM < MIN_SIZE_M || points.length < 4 || !isOrthogonalPolygon(points)) return points;
  const startIndex = ((edgeIndex % points.length) + points.length) % points.length;
  const endIndex = (startIndex + 1) % points.length;
  const nextIndex = (endIndex + 1) % points.length;
  const start = points[startIndex];
  const end = points[endIndex];
  const horizontal = Math.abs(end.yM - start.yM) <= 1e-7;
  const vertical = Math.abs(end.xM - start.xM) <= 1e-7;
  if (!horizontal && !vertical) return points;

  const currentLength = Math.hypot(end.xM - start.xM, end.yM - start.yM);
  if (currentLength <= EPS) return points;
  const sign = horizontal
    ? Math.sign(end.xM - start.xM) || 1
    : Math.sign(end.yM - start.yM) || 1;
  const targetEnd = horizontal
    ? { xM: start.xM + sign * targetLengthM, yM: start.yM }
    : { xM: start.xM, yM: start.yM + sign * targetLengthM };
  const deltaX = targetEnd.xM - end.xM;
  const deltaY = targetEnd.yM - end.yM;

  const next = points.map((point) => ({ ...point }));
  next[endIndex] = targetEnd;
  next[nextIndex] = {
    xM: next[nextIndex].xM + deltaX,
    yM: next[nextIndex].yM + deltaY,
  };
  if (next.some((point) => point.xM < -EPS || point.yM < -EPS)) return points;
  return next;
}

export function vertexLabel(index: number): string {
  // A..Z puis A1..Z1 pour rester lisible sans dépendre d'une donnée implicite.
  const letter = String.fromCharCode(65 + (index % 26));
  const cycle = Math.floor(index / 26);
  return cycle === 0 ? letter : `${letter}${cycle}`;
}
