import type { ProjectInput, StructureResult } from '../domain/types';
import { NF_DTU_51_4_2018 } from '../referentials/nf-dtu-51-4-2018';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, isPointInsideDeck } from './geometry';

function boardRowCenters(input: ProjectInput): number[] {
  if (input.board.gapMm == null) throw new Error('SA-TERR-GAP-001: jeu entre lames non validé.');
  const bounds = getDeckBoundingSizeM(input);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const pitch = input.board.widthMm + input.board.gapMm;
  const centers: number[] = [];
  for (let pos = input.board.widthMm / 2; pos <= transverseMm + 0.001; pos += pitch) centers.push(pos);
  return centers;
}

export function computeStructure(
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
      const segmentLength = end - start;
      if (segmentLength <= 1) return sum;
      const supportIntervals = Math.max(1, Math.ceil(segmentLength / joistMaxSupportSpacingMm));
      return sum + supportIntervals + 1;
    }, 0);
    return { index: i, axisPositionMm, lengthMm, supportCount };
  }).filter((line) => line.lengthMm > 1);

  const joistLinearM = joistLines.reduce((sum, line) => sum + line.lengthMm, 0) / 1000;
  const supportPointCount = joistLines.reduce((sum, line) => sum + line.supportCount, 0);

  const rowCenters = boardRowCenters(input);
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
    joistLinearM,
    supportPointCount,
    fixingCount: crossings * screwsPerCrossing,
    fixingStatus: 'exact',
  };
}
