import type { ProjectInput, TerraceObstacle, TerracePoint } from '../domain/types';

const MIN_SIZE_M = 0.05;

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

export function moveObstacle(obstacle: TerraceObstacle, xM: number, yM: number): TerraceObstacle {
  return {
    ...obstacle,
    xM: Math.max(0, xM),
    yM: Math.max(0, yM),
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

export function polygonEdgeLengths(points: TerracePoint[]): number[] {
  if (points.length < 2) return [];
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.xM - point.xM, next.yM - point.yM);
  });
}
