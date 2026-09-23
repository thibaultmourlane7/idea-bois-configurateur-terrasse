import type { ProjectInput, ReferencePlanTransform, TerracePoint } from './types';
import { imagePixelToModel } from './referencePlan';

export const REFERENCE_DETECTION_TAG = 'SA-TERR-IMPORT-150';

export interface RasterPixelSource {
  widthPx: number;
  heightPx: number;
  data: ArrayLike<number>;
}

export interface DetectedReferenceLine {
  axis: 'vertical' | 'horizontal';
  positionPx: number;
  strength: number;
}

export interface DetectedContourProposal {
  pointsPx: [
    { xPx: number; yPx: number },
    { xPx: number; yPx: number },
    { xPx: number; yPx: number },
    { xPx: number; yPx: number },
  ];
  widthPx: number;
  heightPx: number;
  confidence: number;
}

export interface ReferenceDetectionResult {
  tag: typeof REFERENCE_DETECTION_TAG;
  verticalLines: DetectedReferenceLine[];
  horizontalLines: DetectedReferenceLine[];
  contour?: DetectedContourProposal;
  note: string;
}

export interface ModelContourProposal {
  points: [TerracePoint, TerracePoint, TerracePoint, TerracePoint];
  widthM: number;
  heightM: number;
  confidence: number;
}

function grayscaleAt(source: RasterPixelSource, x: number, y: number): number {
  const index = (y * source.widthPx + x) * 4;
  const r = Number(source.data[index] ?? 255);
  const g = Number(source.data[index + 1] ?? 255);
  const b = Number(source.data[index + 2] ?? 255);
  const a = Number(source.data[index + 3] ?? 255) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) * a + 255 * (1 - a);
}

function groupedLinePositions(values: Array<{ positionPx: number; strength: number }>, mergeDistancePx: number): Array<{ positionPx: number; strength: number }> {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a.positionPx - b.positionPx);
  const groups: Array<Array<{ positionPx: number; strength: number }>> = [];
  for (const value of sorted) {
    const current = groups[groups.length - 1];
    if (!current || value.positionPx - current[current.length - 1].positionPx > mergeDistancePx) groups.push([value]);
    else current.push(value);
  }
  return groups.map((group) => {
    const weight = group.reduce((sum, item) => sum + item.strength, 0) || 1;
    return {
      positionPx: group.reduce((sum, item) => sum + item.positionPx * item.strength, 0) / weight,
      strength: Math.max(...group.map((item) => item.strength)),
    };
  });
}

function detectAxisLines(
  source: RasterPixelSource,
  axis: 'vertical' | 'horizontal',
): DetectedReferenceLine[] {
  const dimension = axis === 'vertical' ? source.widthPx : source.heightPx;
  const crossDimension = axis === 'vertical' ? source.heightPx : source.widthPx;
  if (dimension < 8 || crossDimension < 8) return [];

  const step = Math.max(1, Math.floor(crossDimension / 700));
  const samples = Math.ceil(crossDimension / step);
  const candidates: Array<{ positionPx: number; strength: number }> = [];

  for (let position = 1; position < dimension - 1; position += 1) {
    let dark = 0;
    for (let cross = 0; cross < crossDimension; cross += step) {
      const x = axis === 'vertical' ? position : cross;
      const y = axis === 'vertical' ? cross : position;
      if (grayscaleAt(source, x, y) < 150) dark += 1;
    }
    const strength = dark / Math.max(1, samples);
    if (strength >= 0.20) candidates.push({ positionPx: position, strength });
  }

  return groupedLinePositions(candidates, Math.max(2, Math.round(dimension / 350)))
    .filter((line) => line.strength >= 0.20)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 14)
    .map((line) => ({ ...line, axis }));
}

function bestSeparatedPair(
  lines: DetectedReferenceLine[],
  dimensionPx: number,
): [DetectedReferenceLine, DetectedReferenceLine] | undefined {
  let best: { score: number; pair: [DetectedReferenceLine, DetectedReferenceLine] } | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const a = lines[i];
      const b = lines[j];
      const distance = Math.abs(b.positionPx - a.positionPx);
      if (distance < dimensionPx * 0.12) continue;
      const separationScore = Math.min(1, distance / Math.max(1, dimensionPx * 0.65));
      const strengthScore = (a.strength + b.strength) / 2;
      const score = strengthScore * 0.68 + separationScore * 0.32;
      if (!best || score > best.score) {
        best = {
          score,
          pair: a.positionPx <= b.positionPx ? [a, b] : [b, a],
        };
      }
    }
  }
  return best?.pair;
}

export function detectReferenceGeometry(source: RasterPixelSource): ReferenceDetectionResult {
  const verticalLines = detectAxisLines(source, 'vertical');
  const horizontalLines = detectAxisLines(source, 'horizontal');
  const verticalPair = bestSeparatedPair(verticalLines, source.widthPx);
  const horizontalPair = bestSeparatedPair(horizontalLines, source.heightPx);

  let contour: DetectedContourProposal | undefined;
  if (verticalPair && horizontalPair) {
    const [left, right] = verticalPair;
    const [top, bottom] = horizontalPair;
    const confidence = Math.max(0, Math.min(1,
      (left.strength + right.strength + top.strength + bottom.strength) / 4,
    ));
    contour = {
      pointsPx: [
        { xPx: left.positionPx, yPx: top.positionPx },
        { xPx: right.positionPx, yPx: top.positionPx },
        { xPx: right.positionPx, yPx: bottom.positionPx },
        { xPx: left.positionPx, yPx: bottom.positionPx },
      ],
      widthPx: Math.abs(right.positionPx - left.positionPx),
      heightPx: Math.abs(bottom.positionPx - top.positionPx),
      confidence,
    };
  }

  return {
    tag: REFERENCE_DETECTION_TAG,
    verticalLines,
    horizontalLines,
    contour,
    note: contour
      ? 'Proposition géométrique issue des lignes sombres dominantes. Elle n’est jamais appliquée sans validation humaine.'
      : 'Aucun contour orthogonal assez net n’a été proposé automatiquement. Le dessin manuel reste disponible.',
  };
}

export function detectionToModelContour(
  detection: ReferenceDetectionResult,
  transform?: ReferencePlanTransform,
): ModelContourProposal | undefined {
  if (!detection.contour || !transform?.calibrated) return undefined;
  const points = detection.contour.pointsPx.map((point) => imagePixelToModel(transform, point.xPx, point.yPx)) as ModelContourProposal['points'];
  const widthM = Math.hypot(points[1].xM - points[0].xM, points[1].yM - points[0].yM);
  const heightM = Math.hypot(points[3].xM - points[0].xM, points[3].yM - points[0].yM);
  return { points, widthM, heightM, confidence: detection.contour.confidence };
}

export function applyDetectedContourAfterHumanValidation(
  project: ProjectInput,
  proposal: ModelContourProposal | undefined,
  confirmed: boolean,
  validatedAtIso?: string,
): ProjectInput {
  if (!confirmed || !proposal) return project;
  return {
    ...project,
    shape: 'freeform',
    freeformPoints: proposal.points.map((point) => ({ ...point })),
    referencePlan: project.referencePlan ? {
      ...project.referencePlan,
      humanValidatedAt: validatedAtIso,
    } : project.referencePlan,
  };
}
