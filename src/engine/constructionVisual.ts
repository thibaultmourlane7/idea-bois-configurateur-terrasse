import type { BasketResult, PlannedJoistRole, ProjectInput, SupportPlanResult } from '../domain/types';
import { getCommercialConstructionRule, type CommercialConstructionRule } from './constructionRules';
import { computeEdgeCladding, type EdgeCladdingCalculation } from './edgeCladding';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm } from './geometry';
import { edgesForTreatment } from './edges';

export interface VisualLineSegment {
  id: string;
  x1M: number;
  y1M: number;
  x2M: number;
  y2M: number;
  multiplicity?: number;
  buttJointSupport?: boolean;
  role?: PlannedJoistRole;
}

export interface VisualPoint {
  id: string;
  xM: number;
  yM: number;
  multiplicity?: number;
  requiredHeightMm?: number;
  status?: 'exact' | 'unsupported';
}

export interface ConstructionVisualModel {
  rule?: CommercialConstructionRule;
  joists: VisualLineSegment[];
  plots: VisualPoint[];
  plotsStatus: 'none' | 'commercial-distribution' | 'height-plan' | 'pending';
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
    const queryPositionM = positionM >= axisLengthM - 0.000001 ? Math.max(0, axisLengthM - 0.001) : positionM;
    const intervals = getDeckIntervalsAtMm(input, queryPositionM * 1000, joistOrientation, 0);
    for (const [startMm, endMm] of intervals) {
      if (input.orientation === 'length') {
        segments.push({
          id: `J${id++}`,
          x1M: positionM,
          y1M: startMm / 1000,
          x2M: positionM,
          y2M: endMm / 1000,
          role: 'field',
        });
      } else {
        segments.push({
          id: `J${id++}`,
          x1M: startMm / 1000,
          y1M: positionM,
          x2M: endMm / 1000,
          y2M: positionM,
          role: 'field',
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
  const edges = edgesForTreatment(input, 'cladding').filter((edge) => !edge.curved);
  const out: VisualPoint[] = [];
  let id = 1;

  edges.forEach((edge) => {
    const intervals = Math.max(1, Math.ceil((edge.lengthM * 1000) / spacingMm));
    for (let i = 0; i <= intervals; i += 1) {
      const t = i / intervals;
      out.push({
        id: `VJ${id++}`,
        xM: edge.start.xM + (edge.end.xM - edge.start.xM) * t,
        yM: edge.start.yM + (edge.end.yM - edge.start.yM) * t,
      });
    }
  });

  return out;
}

export function buildConstructionVisual(input: ProjectInput, basket?: BasketResult, supportPlan?: SupportPlanResult): ConstructionVisualModel {
  const rule = getCommercialConstructionRule(input);
  const planned = supportPlan && supportPlan.status !== 'unavailable' && supportPlan.joistSegments.length > 0;
  const validatedFallbackRule = rule?.status === 'validated' && rule.joistSpacingMm > 0 ? rule : undefined;
  const joists = planned
    ? supportPlan.joistSegments.map((segment) => ({
        id: segment.id,
        x1M: segment.x1M,
        y1M: segment.y1M,
        x2M: segment.x2M,
        y2M: segment.y2M,
        multiplicity: segment.multiplicity,
        buttJointSupport: segment.buttJointSupport,
        role: segment.role,
      }))
    : validatedFallbackRule ? joistSegments(input, validatedFallbackRule) : [];

  const supportLine = basket?.lines.find((line) => line.id === 'supports');
  const exactPlotCount = supportLine?.status === 'exact' ? supportLine.quantity ?? 0 : 0;
  const plots = planned
    ? supportPlan.supportPoints.map((point) => ({
        id: point.id,
        xM: point.xM,
        yM: point.yM,
        multiplicity: point.multiplicity,
        requiredHeightMm: point.requiredPlotHeightMm,
        status: point.status,
      }))
    : input.supportSystem === 'adjustable-pedestals' && exactPlotCount > 0
      ? distributePlots(joists, exactPlotCount)
      : [];

  const cladding = computeEdgeCladding(input);
  const verticalJoists = validatedFallbackRule && cladding.mode === 'same-decking' && cladding.status !== 'none'
    ? edgeSupportPoints(input, validatedFallbackRule.joistSpacingMm)
    : [];

  return {
    rule,
    joists,
    plots,
    plotsStatus: input.supportSystem !== 'adjustable-pedestals'
      ? 'none'
      : planned
        ? 'height-plan'
        : exactPlotCount > 0
          ? 'commercial-distribution'
          : 'pending',
    cladding,
    verticalJoists,
  };
}