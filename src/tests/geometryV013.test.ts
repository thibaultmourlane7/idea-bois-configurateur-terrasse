import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import type { ProjectInput, TerraceObstacle } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { computeGeometry } from '../engine/geometry';
import { computeLayout } from '../engine/layout';
import { validateProject } from '../domain/validation';
import { buildClientPdfModel } from '../pdf/clientPdfModel';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Géométrie V0.13',
  shape: 'rectangle',
  dimensions: {
    lengthM: 6,
    widthM: 4,
    notchLengthM: 2,
    notchWidthM: 1,
    circleDiameterM: 5,
    tStemWidthM: 2.5,
    tBarDepthM: 1.5,
    uOpeningWidthM: 2,
    uOpeningDepthM: 2,
  },
  obstacles: [],
  heightCm: 20,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  board,
  joist: demoJoist,
  usage: 'residential',
};

const pool: TerraceObstacle = {
  id: 'POOL-1',
  kind: 'pool',
  label: 'Piscine',
  shape: 'rectangle',
  xM: 2,
  yM: 1,
  widthM: 2,
  heightM: 1,
};

describe('Géométrie avancée V0.13', () => {
  it('calcule les formes T, U et cercle', () => {
    expect(computeGeometry({ ...base, shape: 't-shape' }).areaM2).toBeCloseTo(15.25, 4);
    expect(computeGeometry({ ...base, shape: 'u-shape' }).areaM2).toBeCloseTo(20, 4);
    expect(computeGeometry({ ...base, shape: 'circle' }).areaM2).toBeCloseTo(Math.PI * 2.5 * 2.5, 4);
  });

  it('retire réellement la surface d’une piscine', () => {
    const geometry = computeGeometry({ ...base, obstacles: [pool] });
    expect(geometry.grossAreaM2).toBe(24);
    expect(geometry.excludedAreaM2).toBe(2);
    expect(geometry.areaM2).toBe(22);
    expect(geometry.obstacleCount).toBe(1);
    expect(geometry.obstaclePerimeterM).toBe(6);
  });

  it('coupe les rangées de lames autour d’une réservation', () => {
    const withoutObstacle = computeLayout(base);
    const withObstacle = computeLayout({ ...base, obstacles: [pool] });

    const rowsWithMultipleSegments = new Map<number, number>();
    for (const piece of withObstacle.requiredPieces) {
      rowsWithMultipleSegments.set(piece.rowIndex, (rowsWithMultipleSegments.get(piece.rowIndex) ?? 0) + 1);
    }

    expect([...rowsWithMultipleSegments.values()].some((count) => count > 1)).toBe(true);
    expect(withObstacle.totalRequiredLinearM).toBeLessThan(withoutObstacle.totalRequiredLinearM);
  });

  it('gère une réservation circulaire pour un arbre', () => {
    const tree: TerraceObstacle = {
      id: 'TREE-1',
      kind: 'tree',
      label: 'Arbre',
      shape: 'circle',
      xM: 2.5,
      yM: 1.5,
      diameterM: 1,
    };
    const geometry = computeGeometry({ ...base, obstacles: [tree] });
    expect(geometry.excludedAreaM2).toBeCloseTo(Math.PI * 0.5 * 0.5, 4);
    expect(computeLayout({ ...base, obstacles: [tree] }).requiredPieces.length).toBeGreaterThan(0);
  });

  it('bloque une réservation qui sort de la terrasse', () => {
    const invalid: TerraceObstacle = { ...pool, xM: 5.2, yM: 3.2 };
    const diagnostics = validateProject({ ...base, obstacles: [invalid] });
    expect(diagnostics.some((item) => item.tag === 'SA-TERR-GEO-OBS-002' && item.severity === 'blocking')).toBe(true);
  });

  it('bloque deux réservations qui se chevauchent', () => {
    const second: TerraceObstacle = { ...pool, id: 'POOL-2', label: 'Spa', xM: 3, yM: 1.4, widthM: 1.5, heightM: 1 };
    const diagnostics = validateProject({ ...base, obstacles: [pool, second] });
    expect(diagnostics.some((item) => item.tag === 'SA-TERR-GEO-OBS-003')).toBe(true);
  });

  it('répercute les réservations sur le panier matériel', () => {
    const full = runConfigurator(base);
    const reduced = runConfigurator({ ...base, obstacles: [pool] });
    expect(reduced.geometry?.areaM2).toBe(22);
    expect(reduced.basket?.knownSubtotalTtc).toBeLessThan(full.basket?.knownSubtotalTtc ?? Number.POSITIVE_INFINITY);
  });

  it('conserve formes et réservations dans le lien partagé', () => {
    const project: ProjectInput = { ...base, shape: 'u-shape', obstacles: [pool] };
    const token = projectToShareToken(project);
    const restored = projectFromShareToken(token, base);
    expect(restored.shape).toBe('u-shape');
    expect(restored.obstacles).toHaveLength(1);
    expect(restored.obstacles[0].label).toBe('Piscine');
    expect(restored.dimensions.uOpeningWidthM).toBe(2);
  });

  it('reprend la surface exclue et les réservations dans le modèle PDF', () => {
    const project: ProjectInput = { ...base, obstacles: [pool] };
    const result = runConfigurator(project);
    const model = buildClientPdfModel(project, result, 'IB-TERR-VERSION-013', '21/09/2026');
    expect(model.excludedSurface).toContain('2');
    expect(model.obstacles).toContain('Piscine');
    expect(model.surface).toContain('22');
  });
});
