import type { BasketResult, ProjectInput } from '../domain/types';
import { getCommercialConstructionRule, type CommercialConstructionRule } from './constructionRules';
import { computeEdgeCladding, type EdgeCladdingCalculation } from './edgeCladding';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from './geometry';

export interface VisualLineSegment {
  id: string;
  x1M: number;
  y1M: number;
  x2M: number;
  y2M: number;
}

export interface VisualPoint {
  id: string;
  xM: number;
  yM: number;
}

export interface ConstructionVisualModel {
  rule?: CommercialConstructionRule;
  joists: VisualLineSegment[];
  plots: VisualPoint[];
  plotsStatus: 'none' | 'commercial-distribution' | 'pending';
  cladding: EdgeCladdingCalculation;
  verticalJoists: VisualPoint[];
}

function joistSegments(input: ProjectInput, rule: CommercialConstructionRule): VisualLineSegment[] {
  const bounds = getDeckBoundingSizeM(input);
  const axisLengthM = input.orientation === 'length' ? bounds.lengthM : bounds.widthM;
  const joistOrientation = input.orientation === 'length' ? 'width' : 'length';
  const spacingM = rule.joistSpacingMm / 1000;
  const positions: number[] = [];

  for (let position = 0; position < axisLengthM - 0.001; position += spacingM) positions.push(position);
  if (!positions.length || Math.abs(positions[positions.length - 1] - axisLengthM) > 0.001) positions.push(axisLengthM);

  const segments: VisualLineSegment[] = [];
  let id = 1;
  for (const positionM of positions) {
    const intervals = getDeckIntervalsAtMm(input, positionM * 1000, joistOrientation, 0);
    for (const [startMm, endMm] of intervals) {
      if (input.orientation === 'length') {
        segments.push({
          id: `J${id++}`,
          x1M: positionM,
          y1M: startMm / 1000,
          x2M: positionM,
          y2M: endMm / 1000,
        });
      } else {
        segments.push({
          id: `J${id++}`,
          x1M: startMm / 1000,
          y1M: positionM,
          x2M: endMm / 1000,
          y2M: positionM,
        });
      }
    }
  }

  return segments;
}

function distributePlots(segments: VisualLineSegment[], target: number): VisualPoint[] {
  if (!segments.length || target <= 0) return [];
  const lengths = segments.map((segment) => Math.hypot(segment.x2M - segment.x1M, segment.y2M - segment.y1M));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  const raw = lengths.map((length) => (length / total) * target);
  const counts = raw.map((value) => Math.floor(value));
  let assigned = counts.reduce((sum, value) => sum + value, 0);
  const remainders = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  let cursor = 0;
  while (assigned < target) {
    counts[remainders[cursor % remainders.length].index] += 1;
    assigned += 1;
    cursor += 1;
  }

  const points: VisualPoint[] = [];
  let id = 1;
  segments.forEach((segment, segmentIndex) => {
    const count = counts[segmentIndex];
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      points.push({
        id: `P${id++}`,
        xM: segment.x1M + (segment.x2M - segment.x1M) * t,
        yM: segment.y1M + (segment.y2M - segment.y1M) * t,
      });
    }
  });
  return points;
}

function edgeSupportPoints(input: ProjectInput, spacingMm: number): VisualPoint[] {
  if (input.edgeFinishMode !== 'full-perimeter' || input.shape === 'circle') return [];
  const points = getDeckOutlinePointsM(input);
  const out: VisualPoint[] = [];
  let id = 1;

  points.forEach((start, edgeIndex) => {
    const end = points[(edgeIndex + 1) % points.length];
    const lengthM = Math.hypot(end.x - start.x, end.y - start.y);
    const intervals = Math.max(1, Math.ceil((lengthM * 1000) / spacingMm));
    for (let i = 0; i <= intervals; i += 1) {
      const t = i / intervals;
      out.push({
        id: `VJ${id++}`,
        xM: start.x + (end.x - start.x) * t,
        yM: start.y + (end.y - start.y) * t,
      });
    }
  });

  return out;
}

export function buildConstructionVisual(input: ProjectInput, basket?: BasketResult): ConstructionVisualModel {
  const rule = getCommercialConstructionRule(input);
  const joists = rule ? joistSegments(input, rule) : [];
  const supportLine = basket?.lines.find((line) => line.id === 'supports');
  const exactPlotCount = supportLine?.status === 'exact' ? supportLine.quantity ?? 0 : 0;
  const plots = input.supportSystem === 'adjustable-pedestals' && exactPlotCount > 0
    ? distributePlots(joists, exactPlotCount)
    : [];

  const cladding = computeEdgeCladding(input);
  const verticalJoists = rule && cladding.mode === 'same-decking' && input.edgeFinishMode === 'full-perimeter'
    ? edgeSupportPoints(input, rule.joistSpacingMm)
    : [];

  return {
    rule,
    joists,
    plots,
    plotsStatus: input.supportSystem !== 'adjustable-pedestals'
      ? 'none'
      : exactPlotCount > 0
        ? 'commercial-distribution'
        : 'pending',
    cladding,
    verticalJoists,
  };
}
