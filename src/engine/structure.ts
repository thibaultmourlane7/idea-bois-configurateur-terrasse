import type { JoistLine, LayoutResult, ProjectInput, StructureResult } from '../domain/types';
import { NF_DTU_51_4_2018 } from '../referentials/nf-dtu-51-4-2018';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, isPointInsideDeck } from './geometry';
import { intervalsForRegionAtV, type LayingBasis } from './layingGeometry';

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b);
}

function axesForZone(minU: number, maxU: number, maxSpacingMm: number, mandatory: number[]): number[] {
  const anchors = uniqueSorted([minU, ...mandatory.filter((x) => x > minU + 0.001 && x < maxU - 0.001), maxU]);
  const positions: number[] = [];
  for (let i = 0; i + 1 < anchors.length; i += 1) {
    const start = anchors[i];
    const end = anchors[i + 1];
    const count = Math.max(1, Math.ceil((end - start) / maxSpacingMm));
    for (let n = 0; n <= count; n += 1) positions.push(start + ((end - start) * n) / count);
  }
  return uniqueSorted(positions);
}

function legacyStructure(
  input: ProjectInput,
  boardMaxSupportSpacingMm: number,
  joistMaxSupportSpacingMm: number,
): StructureResult {
  const bounds = getDeckBoundingSizeM(input);
  const alongBoardMm = (input.orientation === 'length' ? bounds.lengthM : bounds.widthM) * 1000;
  const intervalCount = Math.max(1, Math.ceil(alongBoardMm / boardMaxSupportSpacingMm));
  const actualSpacing = alongBoardMm / intervalCount;
  const joistOrientation = input.orientation === 'length' ? 'width' : 'length';

  const joistLines = Array.from({ length: intervalCount + 1 }, (_, i) => {
    const axisPositionMm = i * actualSpacing;
    const segments = getDeckIntervalsAtMm(input, axisPositionMm, joistOrientation, 0);
    const lengthMm = segments.reduce((sum, [start, end]) => sum + (end - start), 0);
    const supportCount = segments.reduce((sum, [start, end]) => {
      const length = end - start;
      if (length <= 1) return sum;
      return sum + Math.max(1, Math.ceil(length / joistMaxSupportSpacingMm)) + 1;
    }, 0);
    return { index: i, axisPositionMm, lengthMm, supportCount };
  }).filter((line) => line.lengthMm > 1);

  const rowCenters: number[] = [];
  if (input.board.gapMm == null) throw new Error('SA-TERR-GAP-001: jeu entre lames non validé.');
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const pitch = input.board.widthMm + input.board.gapMm;
  for (let pos = input.board.widthMm / 2; pos <= transverseMm + 0.001; pos += pitch) rowCenters.push(pos);

  let crossings = 0;
  for (const joist of joistLines) {
    for (const rowCenter of rowCenters) {
      const x = input.orientation === 'length' ? joist.axisPositionMm : rowCenter;
      const y = input.orientation === 'length' ? rowCenter : joist.axisPositionMm;
      if (isPointInsideDeck(input, x, y)) crossings += 1;
    }
  }

  const screwsPerCrossing = input.board.widthMm >= NF_DTU_51_4_2018.fixing.twoScrewsFromBoardWidthMm ? 2 : 1;
  return {
    joistMaxSpacingMm: boardMaxSupportSpacingMm,
    joistActualSpacingMm: actualSpacing,
    joistSupportMaxSpacingMm: joistMaxSupportSpacingMm,
    joistLines,
    joistLinearM: joistLines.reduce((sum, line) => sum + line.lengthMm, 0) / 1000,
    supportPointCount: joistLines.reduce((sum, line) => sum + line.supportCount, 0),
    fixingCount: crossings * screwsPerCrossing,
    fixingStatus: 'exact',
  };
}

export function computeStructure(
  input: ProjectInput,
  boardMaxSupportSpacingMm: number,
  joistMaxSupportSpacingMm: number,
  layout?: LayoutResult,
): StructureResult {
  if (!layout?.zones?.length) return legacyStructure(input, boardMaxSupportSpacingMm, joistMaxSupportSpacingMm);

  const joistLines: JoistLine[] = [];
  const axesByZone = new Map<string, number[]>();
  const spacings: number[] = [];
  let index = 0;

  for (const zone of layout.zones) {
    const axes = axesForZone(zone.minUMm, zone.maxUMm, boardMaxSupportSpacingMm, zone.buttJointAxisPositionsMm);
    axesByZone.set(zone.id, axes);
    for (let i = 0; i + 1 < axes.length; i += 1) spacings.push(axes[i + 1] - axes[i]);

    const explicitZone = zone.id === 'main' ? undefined : (input.layingZones ?? []).find((item) => item.id === zone.id);
    const excludedZones = zone.id === 'main' ? (input.layingZones ?? []) : [];
    const basis: LayingBasis = {
      dirX: zone.normalX,
      dirY: zone.normalY,
      normalX: zone.dirX,
      normalY: zone.dirY,
    };

    for (const axis of axes) {
      const queryAxis = axis <= zone.minUMm + 0.0001
        ? Math.min(zone.maxUMm, zone.minUMm + 1)
        : axis >= zone.maxUMm - 0.0001
          ? Math.max(zone.minUMm, zone.maxUMm - 1)
          : axis;
      const intervals = intervalsForRegionAtV(input, basis, queryAxis, 0, explicitZone, excludedZones);
      const lengthMm = intervals.reduce((sum, [start, end]) => sum + (end - start), 0);
      if (lengthMm <= 1) continue;
      const supportCount = intervals.reduce((sum, [start, end]) => {
        const length = end - start;
        return length <= 1 ? sum : sum + Math.max(1, Math.ceil(length / joistMaxSupportSpacingMm)) + 1;
      }, 0);
      joistLines.push({ index: index++, axisPositionMm: axis, lengthMm, supportCount });
    }
  }

  let crossings = 0;
  for (const segment of layout.boardSegments) {
    const axes = axesByZone.get(segment.zoneId ?? 'main') ?? [];
    const lo = Math.min(segment.startMm, segment.endMm);
    const hi = Math.max(segment.startMm, segment.endMm);
    crossings += axes.filter((axis) => axis >= lo - 0.5 && axis <= hi + 0.5).length;
  }

  const screwsPerCrossing = input.board.widthMm >= NF_DTU_51_4_2018.fixing.twoScrewsFromBoardWidthMm ? 2 : 1;
  return {
    joistMaxSpacingMm: boardMaxSupportSpacingMm,
    joistActualSpacingMm: spacings.length ? Math.max(...spacings) : 0,
    joistSupportMaxSpacingMm: joistMaxSupportSpacingMm,
    joistLines,
    joistLinearM: joistLines.reduce((sum, line) => sum + line.lengthMm, 0) / 1000,
    supportPointCount: joistLines.reduce((sum, line) => sum + line.supportCount, 0),
    fixingCount: crossings * screwsPerCrossing,
    fixingStatus: 'exact',
  };
}
