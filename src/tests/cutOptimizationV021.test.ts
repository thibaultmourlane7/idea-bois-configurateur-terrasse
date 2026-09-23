import { describe, expect, it } from 'vitest';
import { optimizeCuts, optimizeCutsDetailed } from '../engine/cuts';

describe('Sprint B V0.21 — optimisation des chutes traçable', () => {
  it('trace lame → pièce → chute → réemploi → reste final', () => {
    const result = optimizeCutsDetailed([
      { id: 'P017', rowIndex: 0, lengthMm: 2650 },
      { id: 'P042', rowIndex: 1, lengthMm: 1180 },
    ], [4000]);

    expect(result.boards).toHaveLength(1);
    expect(result.boards[0].id).toBe('B001');
    expect(result.boards[0].cuts).toHaveLength(2);
    const first = result.boards[0].cuts[0];
    const second = result.boards[0].cuts[1];
    expect(first).toMatchObject({ id: 'CUT001', sourceType: 'stock-board', sourceId: 'B001', resultingOffcutId: 'C001', remainingAfterMm: 1350 });
    expect(second).toMatchObject({ id: 'CUT002', sourceType: 'offcut', sourceId: 'C001', resultingOffcutId: 'C002', remainingAfterMm: 170 });
    expect(result.offcuts.find((item) => item.id === 'C001')).toMatchObject({ status: 'reused', reusedByCutId: 'CUT002', lengthMm: 1350 });
    expect(result.offcuts.find((item) => item.id === 'C002')).toMatchObject({ status: 'remaining', lengthMm: 170 });
    expect(result.reusedOffcutCount).toBe(1);
    expect(result.finalRemainingMm).toBe(170);
  });

  it('conserve des identifiants uniques sur plusieurs lames commerciales', () => {
    const result = optimizeCutsDetailed([
      { id: 'A', rowIndex: 0, lengthMm: 3900 },
      { id: 'B', rowIndex: 1, lengthMm: 3900 },
      { id: 'C', rowIndex: 2, lengthMm: 100 },
    ], [4000]);
    expect(result.boards.map((board) => board.id)).toEqual(['B001', 'B002']);
    expect(new Set(result.offcuts.map((item) => item.id)).size).toBe(result.offcuts.length);
    const cuts = result.boards.flatMap((board) => board.cuts.map((cut) => cut.id));
    expect(new Set(cuts).size).toBe(cuts.length);
  });

  it('n’invente aucune longueur minimale de réemploi ni trait de scie', () => {
    const result = optimizeCutsDetailed([{ id: 'A', rowIndex: 0, lengthMm: 1200 }], [3000]);
    expect(result.rules.status).toBe('pending-manufacturer-validation');
    expect(result.rules.minimumReusableLengthMm).toBeUndefined();
    expect(result.rules.minimumJointDistanceMm).toBeUndefined();
    expect(result.rules.kerfMm).toBeUndefined();
    expect(result.rules.note).toContain('Aucun seuil');
  });

  it('conserve optimizeCuts pour les moteurs existants', () => {
    const boards = optimizeCuts([
      { id: 'A', rowIndex: 0, lengthMm: 4100 },
      { id: 'B', rowIndex: 1, lengthMm: 3000 },
    ], [3000, 4200, 5400]);
    expect(boards.some((board) => board.stockLengthMm === 4200)).toBe(true);
    expect(boards.every((board) => board.id.startsWith('B'))).toBe(true);
    expect(boards.every((board) => Number.isFinite(board.remainingMm))).toBe(true);
  });
});
