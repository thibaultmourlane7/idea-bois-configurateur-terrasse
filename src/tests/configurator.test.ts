import { describe, expect, it } from 'vitest';
import { demoBoards, demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { optimizeCuts } from '../engine/cuts';

const base: ProjectInput = {
  projectName: 'Test particulier',
  shape: 'rectangle',
  dimensions: { lengthM: 6, widthM: 4, notchLengthM: 2, notchWidthM: 1 },
  heightCm: 20,
  supportType: 'existing-concrete-slab',
  drainage: 'yes',
  orientation: 'length',
  board: demoBoards[0],
  joist: demoJoist,
  usage: 'residential',
};

describe('Configurateur terrasse V0.7', () => {
  it('conserve le scénario normatif de régression V0.6', () => {
    const result = runConfigurator(base);
    expect(result.valid).toBe(true);
    expect(result.geometry?.areaM2).toBe(24);
    expect(result.geometry?.perimeterM).toBe(20);
    expect(result.structure?.joistMaxSpacingMm).toBe(670);
  });

  it('calcule la surface d’une forme en L', () => {
    const result = runConfigurator({ ...base, shape: 'l-shape' });
    expect(result.geometry?.areaM2).toBe(22);
  });

  it('charge le catalogue réel IDEA Bois regroupé', () => {
    expect(ideaBoisBoards.length).toBe(38);
    expect(ideaBoisBoards.every((board) => board.isDemo === false)).toBe(true);
    expect(ideaBoisBoards.some((board) => (board.availableLengthsMm?.length ?? 0) > 1)).toBe(true);
  });

  it('affiche un prix commercial sans inventer la règle technique', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;
    const result = runConfigurator({ ...base, board });
    expect(result.valid).toBe(false);
    expect(result.pricing?.surfaceNetTtc).toBeCloseTo(24 * 25.92, 2);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-GAP-001' && d.severity === 'blocking')).toBe(true);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-LAME-010' && d.severity === 'blocking')).toBe(true);
  });

  it('optimise sur plusieurs longueurs commerciales autorisées', () => {
    const boards = optimizeCuts([
      { id: 'A', rowIndex: 0, lengthMm: 4100 },
      { id: 'B', rowIndex: 1, lengthMm: 3000 },
    ], [3000, 4200, 5400]);
    expect(boards.some((board) => board.stockLengthMm === 4200)).toBe(true);
    expect(boards.every((board) => [3000, 4200, 5400].includes(board.stockLengthMm))).toBe(true);
  });

  it('bloque un produit composite sans règles fabricant', () => {
    const result = runConfigurator({ ...base, board: demoBoards[1] });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-SYSTEM-001' && d.severity === 'blocking')).toBe(true);
  });

  it('bloque une hauteur hors domaine courant du NF DTU 51.4', () => {
    const result = runConfigurator({ ...base, heightCm: 120 });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-DTU-003')).toBe(true);
  });

  it('bloque une dalle déclarée sans évacuation d’eau', () => {
    const result = runConfigurator({ ...base, drainage: 'no' });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-WATER-001')).toBe(true);
  });

  it('n’expose aucun calcul de main-d’œuvre', () => {
    const result = runConfigurator(base) as unknown as Record<string, unknown>;
    expect('labor' in result).toBe(false);
    expect('hours' in result).toBe(false);
    expect('laborCost' in result).toBe(false);
  });
});
