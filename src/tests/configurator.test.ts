import { describe, expect, it } from 'vitest';
import { demoBoards, demoJoist } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';

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

describe('Configurateur terrasse V0.6 particulier', () => {
  it('calcule exactement la surface d’un rectangle', () => {
    const result = runConfigurator(base);
    expect(result.valid).toBe(true);
    expect(result.geometry?.areaM2).toBe(24);
    expect(result.geometry?.perimeterM).toBe(20);
  });

  it('calcule la surface d’une forme en L', () => {
    const result = runConfigurator({ ...base, shape: 'l-shape' });
    expect(result.geometry?.areaM2).toBe(22);
  });

  it('applique la ligne résidentielle validée au produit bois démo', () => {
    const result = runConfigurator(base);
    expect(result.structure?.joistMaxSpacingMm).toBe(670);
    expect(result.structure?.joistActualSpacingMm).toBeLessThanOrEqual(670);
    expect(result.structure?.joistSupportMaxSpacingMm).toBeGreaterThan(0);
    expect(result.structure?.supportPointCount).toBeGreaterThan(0);
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

  it('ne produit pas un quantitatif de fixations définitif si des aboutages restent à calepiner', () => {
    const result = runConfigurator(base);
    expect(result.layout?.hasButtJoints).toBe(true);
    expect(result.structure?.fixingStatus).toBe('pending-joint-layout');
    expect(result.structure?.fixingCount).toBeUndefined();
  });
});
