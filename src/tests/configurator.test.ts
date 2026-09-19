import { describe, expect, it } from 'vitest';
import { demoBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';

const base: ProjectInput = {
  projectName: 'Test', shape: 'rectangle',
  dimensions: { lengthM: 6, widthM: 4, notchLengthM: 2, notchWidthM: 1 },
  orientation: 'length',
  board: { ...demoBoards[0], widthMm: 145, lengthMm: 3000, gapMm: 5 },
};

describe('configurateur terrasse', () => {
  it('calcule exactement la surface d’un rectangle', () => {
    const r = runConfigurator(base);
    expect(r.valid).toBe(true); expect(r.geometry?.areaM2).toBe(24); expect(r.geometry?.perimeterM).toBe(20);
  });
  it('calcule la surface d’une forme en L', () => {
    const r = runConfigurator({ ...base, shape: 'l-shape' }); expect(r.geometry?.areaM2).toBe(22);
  });
  it('bloque les dimensions invalides', () => {
    const r = runConfigurator({ ...base, dimensions: { ...base.dimensions, lengthM: 0 } });
    expect(r.valid).toBe(false); expect(r.diagnostics.some((d) => d.severity === 'blocking')).toBe(true);
  });
  it('n’expose aucun champ de main-d’œuvre', () => {
    const r = runConfigurator(base) as unknown as Record<string, unknown>;
    expect('labor' in r).toBe(false); expect('hours' in r).toBe(false); expect('laborCost' in r).toBe(false);
  });
  it('chiffre uniquement les fournitures quand un prix est fourni', () => {
    const r = runConfigurator({ ...base, board: { ...base.board, priceTtcPerM2: 50, isDemo: false } });
    expect(r.pricing?.materialTtc).toBeGreaterThan(0); expect(r.pricing?.unitPriceTtcPerM2).toBe(50);
  });
});
