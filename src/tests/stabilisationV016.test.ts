import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { validateProject } from '../domain/validation';
import { resizeFreeformEdge, resizeOrthogonalFreeformEdge } from '../editor/interactiveGeometry';
import { computeGeometry, getEffectiveBoundarySegmentsM, isSimplePolygon } from '../engine/geometry';
import { computeLayout } from '../engine/layout';
import { computeSupportPlan } from '../engine/supportPlan';

const pin = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Stabilisation V0.16',
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
  supportLevelProfile: {
    mode: 'flat',
    topLeftDeltaMm: 0,
    topRightDeltaMm: 0,
    bottomRightDeltaMm: 0,
    bottomLeftDeltaMm: 0,
    targetSlopeXPercent: 0,
    targetSlopeYPercent: 0,
  },
  doubleJoistsAtButtJoints: false,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

describe('Stabilisation V0.16 — réservations débordantes', () => {
  it('ne retire que la partie réellement en intersection avec la terrasse', () => {
    const project: ProjectInput = {
      ...base,
      obstacles: [{ id: 'POOL', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: 5, yM: 1, widthM: 2, heightM: 2 }],
    };
    const geometry = computeGeometry(project);
    expect(geometry.grossAreaM2).toBeCloseTo(24, 6);
    expect(geometry.excludedAreaM2).toBeCloseTo(2, 6);
    expect(geometry.areaM2).toBeCloseTo(22, 6);
    expect(validateProject(project).some((item) => item.severity === 'blocking')).toBe(false);
  });

  it('autorise une réservation avec coordonnées négatives et ignore une réservation totalement extérieure', () => {
    const straddling: ProjectInput = {
      ...base,
      obstacles: [{ id: 'LEFT', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: -1, yM: 1, widthM: 2, heightM: 2 }],
    };
    expect(computeGeometry(straddling).excludedAreaM2).toBeCloseTo(2, 6);
    expect(validateProject(straddling).some((item) => item.severity === 'blocking')).toBe(false);

    const outside: ProjectInput = {
      ...base,
      obstacles: [{ id: 'OUT', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: -3, yM: 1, widthM: 1, heightM: 1 }],
    };
    expect(computeGeometry(outside).excludedAreaM2).toBeCloseTo(0, 6);
    expect(validateProject(outside).some((item) => item.tag === 'SA-TERR-GEO-OBS-004' && item.severity === 'info')).toBe(true);
  });

  it('calcule le demi-disque réellement présent quand un cercle mord le bord', () => {
    const project: ProjectInput = {
      ...base,
      obstacles: [{ id: 'TREE', kind: 'tree', label: 'Arbre', shape: 'circle', xM: -1, yM: 1, diameterM: 2 }],
    };
    expect(computeGeometry(project).excludedAreaM2).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('Stabilisation V0.16 — forme libre cotée', () => {
  it('modifie réellement AB en gardant A fixe et la direction du segment', () => {
    const points = [
      { xM: 0, yM: 0 },
      { xM: 4, yM: 0 },
      { xM: 4, yM: 3 },
      { xM: 0, yM: 3 },
    ];
    const resized = resizeFreeformEdge(points, 0, 5);
    expect(resized[0]).toEqual({ xM: 0, yM: 0 });
    expect(resized[1].xM).toBeCloseTo(5, 8);
    expect(resized[1].yM).toBeCloseTo(0, 8);
    expect(isSimplePolygon(resized)).toBe(true);
  });

  it('conserve les angles droits quand la cote est modifiée en mode orthogonal', () => {
    const points = [
      { xM: 0, yM: 0 },
      { xM: 4, yM: 0 },
      { xM: 4, yM: 3 },
      { xM: 0, yM: 3 },
    ];
    const resized = resizeOrthogonalFreeformEdge(points, 0, 5);
    expect(resized[1]).toEqual({ xM: 5, yM: 0 });
    expect(resized[2]).toEqual({ xM: 5, yM: 3 });
    expect(isSimplePolygon(resized)).toBe(true);
  });
});

describe('Stabilisation V0.16 — raccords et contour structurel', () => {
  it('conserve les raccords rangée par rangée pour le rendu 2D', () => {
    const layout = computeLayout(base);
    expect(layout.hasButtJoints).toBe(true);
    expect(layout.buttJoints.length).toBeGreaterThan(0);
    expect(layout.boardSegments.length).toBeGreaterThan(layout.rowCount);
    expect(new Set(layout.buttJoints.map((joint) => joint.rowIndex)).size).toBeGreaterThan(1);
  });

  it('ajoute des segments de lambourdes de contour au plan structurel', () => {
    const layout = computeLayout(base);
    const plan = computeSupportPlan(base, layout);
    expect(plan.joistSegments.some((segment) => segment.role === 'perimeter')).toBe(true);
    expect(plan.joistSegments.some((segment) => segment.role === 'butt-joint')).toBe(true);
    expect(plan.joistLinearM).toBeGreaterThan(56);
  });

  it('suit l’ouverture créée par une réservation qui mord le bord', () => {
    const project: ProjectInput = {
      ...base,
      obstacles: [{ id: 'POOL', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: 5, yM: 1, widthM: 2, heightM: 2 }],
    };
    const boundary = getEffectiveBoundarySegmentsM(project);
    expect(boundary.some((segment) => segment.role === 'obstacle')).toBe(true);
    const plan = computeSupportPlan(project, computeLayout(project));
    expect(plan.joistSegments.some((segment) => segment.role === 'perimeter' && segment.x1M >= 4.99)).toBe(true);
  });
});