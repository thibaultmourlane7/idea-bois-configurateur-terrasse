import type { ProjectInput, StructureResult } from '../domain/types';
import { NF_DTU_51_4_2018 } from '../referentials/nf-dtu-51-4-2018';
import { isPointInsideDeck } from './geometry';

const mm = (m: number) => m * 1000;

function lineLengthMm(input: ProjectInput, axisPositionMm: number): number {
  const L = mm(input.dimensions.lengthM);
  const W = mm(input.dimensions.widthM);
  if (input.shape === 'rectangle') return input.orientation === 'length' ? W : L;

  const notchStartX = mm(input.dimensions.lengthM - input.dimensions.notchLengthM);
  const notchStartY = mm(input.dimensions.widthM - input.dimensions.notchWidthM);

  if (input.orientation === 'length') {
    // Lames suivant X, lambourdes verticales suivant Y.
    return axisPositionMm <= notchStartX + 0.001 ? W : notchStartY;
  }
  // Lames suivant Y, lambourdes horizontales suivant X.
  return axisPositionMm <= notchStartY + 0.001 ? L : notchStartX;
}

function boardRowCenters(input: ProjectInput): number[] {
  const transverseMm = (input.orientation === 'length' ? input.dimensions.widthM : input.dimensions.lengthM) * 1000;
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
  const alongBoardMm = (input.orientation === 'length' ? input.dimensions.lengthM : input.dimensions.widthM) * 1000;
  const intervalCount = Math.max(1, Math.ceil(alongBoardMm / boardMaxSupportSpacingMm));
  const actualSpacing = alongBoardMm / intervalCount;

  const joistLines = Array.from({ length: intervalCount + 1 }, (_, i) => {
    const axisPositionMm = i * actualSpacing;
    const lengthMm = lineLengthMm(input, axisPositionMm);
    const supportIntervals = Math.max(1, Math.ceil(lengthMm / joistMaxSupportSpacingMm));
    return {
      index: i,
      axisPositionMm,
      lengthMm,
      supportCount: supportIntervals + 1,
    };
  });

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
