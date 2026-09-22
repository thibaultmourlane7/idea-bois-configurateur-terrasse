import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import type { ProjectInput, TerraceObstacle, TerracePoint } from '../domain/types';
import { validateProject } from '../domain/validation';
import {
  addVertexOnLongestEdge,
  defaultFreeformPoints,
  moveObstacle,
  moveVertex,
  polygonEdgeLengths,
  removeVertex,
  resizeObstacle,
} from '../editor/interactiveGeometry';
import { computeGeometry } from '../engine/geometry';
import { computeLayout } from '../engine/layout';
import { runConfigurator } from '../engine/configurator';
import { buildClientPdfModel } from '../pdf/clientPdfModel';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Editeur V0.15',
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

const freeform: TerracePoint[] = [
  { xM: 0, yM: 0 },
  { xM: 6, yM: 0 },
  { xM: 5, yM: 4 },
  { xM: 0, yM: 4 },
];

describe('Editeur visuel V0.15', () => {
  it('initialise une forme libre à partir de l’emprise courante', () => {
    const points = defaultFreeformPoints(base);
    expect(points).toEqual([
      { xM: 0, yM: 0 },
      { xM: 6, yM: 0 },
      { xM: 6, yM: 4 },
      { xM: 0, yM: 4 },
    ]);
  });

  it('ajoute un sommet sur la plus longue arête sans modifier la surface', () => {
    const points = defaultFreeformPoints(base);
    const withVertex = addVertexOnLongestEdge(points);
    expect(withVertex).toHaveLength(5);
    expect(withVertex[1]).toEqual({ xM: 3, yM: 0 });

    const before = computeGeometry({ ...base, shape: 'freeform', freeformPoints: points }).areaM2;
    const after = computeGeometry({ ...base, shape: 'freeform', freeformPoints: withVertex }).areaM2;
    expect(after).toBeCloseTo(before, 6);
  });

  it('déplace et supprime les sommets de manière déterministe', () => {
    const moved = moveVertex(defaultFreeformPoints(base), 2, 5, 4);
    expect(moved[2]).toEqual({ xM: 5, yM: 4 });
    expect(computeGeometry({ ...base, shape: 'freeform', freeformPoints: moved }).areaM2).toBeCloseTo(22, 6);

    const five = addVertexOnLongestEdge(moved);
    expect(removeVertex(five, 1)).toHaveLength(4);
    expect(removeVertex(moved, 1)).toHaveLength(3);
    expect(removeVertex(removeVertex(moved, 1), 1)).toHaveLength(3);
  });

  it('calcule surface, périmètre et calepinage sur une forme libre', () => {
    const project: ProjectInput = { ...base, shape: 'freeform', freeformPoints: freeform };
    const geometry = computeGeometry(project);
    expect(geometry.areaM2).toBeCloseTo(22, 6);
    expect(geometry.perimeterM).toBeCloseTo(19.1231056, 5);

    const layout = computeLayout(project);
    expect(layout.rowCount).toBeGreaterThan(0);
    expect(layout.totalRequiredLinearM).toBeGreaterThan(0);
  });

  it('bloque une forme libre auto-croisée', () => {
    const crossed: TerracePoint[] = [
      { xM: 0, yM: 0 },
      { xM: 4, yM: 4 },
      { xM: 0, yM: 4 },
      { xM: 4, yM: 0 },
    ];
    const diagnostics = validateProject({ ...base, shape: 'freeform', freeformPoints: crossed });
    expect(diagnostics.some((item) => item.tag === 'SA-TERR-GEO-FREE-003' && item.severity === 'blocking')).toBe(true);
  });

  it('déplace et redimensionne les réservations avec des fonctions métier pures', () => {
    const obstacle: TerraceObstacle = {
      id: 'POOL',
      kind: 'pool',
      label: 'Piscine',
      shape: 'rectangle',
      xM: 1,
      yM: 1,
      widthM: 2,
      heightM: 1,
    };
    expect(moveObstacle(obstacle, 2.2, 1.4)).toMatchObject({ xM: 2.2, yM: 1.4 });
    expect(resizeObstacle(obstacle, 4.5, 3)).toMatchObject({ widthM: 3.5, heightM: 2 });

    const circle: TerraceObstacle = { ...obstacle, shape: 'circle', diameterM: 1, widthM: undefined, heightM: undefined };
    expect(resizeObstacle(circle, 2.8, 9).diameterM).toBeCloseTo(1.8, 6);
  });

  it('calcule les cotations d’arêtes de la forme libre', () => {
    const lengths = polygonEdgeLengths(freeform);
    expect(lengths).toHaveLength(4);
    expect(lengths[0]).toBe(6);
    expect(lengths[1]).toBeCloseTo(Math.sqrt(17), 6);
    expect(lengths[2]).toBe(5);
    expect(lengths[3]).toBe(4);
  });

  it('conserve la forme libre et ses sommets dans le lien partagé', () => {
    const project: ProjectInput = { ...base, shape: 'freeform', freeformPoints: freeform };
    const token = projectToShareToken(project);
    const restored = projectFromShareToken(token, base);
    expect(restored.shape).toBe('freeform');
    expect(restored.freeformPoints).toEqual(freeform);
  });

  it('reprend la forme libre dans le PDF client', () => {
    const project: ProjectInput = { ...base, shape: 'freeform', freeformPoints: freeform };
    const result = runConfigurator(project);
    const model = buildClientPdfModel(project, result, 'IB-TERR-VERSION-015', '22/09/2026');
    expect(model.shape).toBe('Forme libre');
    expect(model.dimensions).toContain('4 sommets');
    expect(model.surface).toContain('22');
  });
});
