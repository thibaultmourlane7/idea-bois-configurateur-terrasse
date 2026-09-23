import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { LayingZone, ProjectInput } from '../domain/types';
import { validateProject } from '../domain/validation';
import { computeLayout } from '../engine/layout';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint A',
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
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'straight',
  board,
  joist: demoJoist,
  usage: 'residential',
};

describe('Sprint A V0.20 — calepinage avancé', () => {
  it('inverse réellement le départ du calepinage entre gauche et droite', () => {
    const left = computeLayout({ ...base, layingStart: 'left' });
    const right = computeLayout({ ...base, layingStart: 'right' });
    const leftXs = left.buttJoints.map((joint) => joint.xM ?? 0);
    const rightXs = right.buttJoints.map((joint) => joint.xM ?? 0);
    expect(Math.max(...leftXs)).toBeCloseTo(5.4, 3);
    expect(Math.min(...rightXs)).toBeCloseTo(0.6, 3);
  });

  it('calcule une pose diagonale +45° avec des segments réellement inclinés', () => {
    const layout = computeLayout({ ...base, layingDirection: 'diagonal-45' });
    expect(layout.boardSegments.length).toBeGreaterThan(0);
    expect(layout.zones[0].direction).toBe('diagonal-45');
    const segment = layout.boardSegments.find((item) => (item.lengthMm ?? 0) > 500)!;
    expect(segment.x1M).toBeDefined();
    expect(segment.y1M).toBeDefined();
    expect(Math.abs((segment.x2M ?? 0) - (segment.x1M ?? 0))).toBeCloseTo(
      Math.abs((segment.y2M ?? 0) - (segment.y1M ?? 0)),
      3,
    );
  });

  it('calcule une pose diagonale -45° avec une réservation sans faire traverser la réservation', () => {
    const layout = computeLayout({
      ...base,
      layingDirection: 'diagonal--45',
      obstacles: [{ id: 'POOL', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: 2, yM: 1, widthM: 2, heightM: 1.5 }],
    });
    for (const segment of layout.boardSegments) {
      const mx = ((segment.x1M ?? 0) + (segment.x2M ?? 0)) / 2;
      const my = ((segment.y1M ?? 0) + (segment.y2M ?? 0)) / 2;
      expect(mx > 2 && mx < 4 && my > 1 && my < 2.5).toBe(false);
    }
  });

  it('applique une zone locale avec une direction différente et retire cette surface de la zone principale', () => {
    const zone: LayingZone = {
      id: 'ZONE-B',
      label: 'Zone B',
      points: [
        { xM: 2, yM: 1 },
        { xM: 4, yM: 1 },
        { xM: 4, yM: 3 },
        { xM: 2, yM: 3 },
      ],
      direction: 'width',
      pattern: 'half',
      start: 'top',
    };
    const layout = computeLayout({ ...base, layingZones: [zone] });
    expect(layout.zones.map((item) => item.id)).toEqual(['main', 'ZONE-B']);
    expect(layout.boardSegments.some((item) => item.zoneId === 'ZONE-B' && item.direction === 'width')).toBe(true);
    const mainInsideZone = layout.boardSegments
      .filter((item) => item.zoneId === 'main')
      .some((segment) => {
        const mx = ((segment.x1M ?? 0) + (segment.x2M ?? 0)) / 2;
        const my = ((segment.y1M ?? 0) + (segment.y2M ?? 0)) / 2;
        return mx > 2 && mx < 4 && my > 1 && my < 3;
      });
    expect(mainInsideZone).toBe(false);
  });

  it('conserve la dernière rangée coupée en rive comme le moteur historique', () => {
    const layout = computeLayout(base);
    expect(layout.rowCount).toBe(27);
    expect(layout.boardSegments.some((segment) => segment.transverseCenterMm > 3900)).toBe(true);
  });

  it('le départ haut/bas inverse réellement l’ordre du cycle 1/2', () => {
    const top = computeLayout({ ...base, layingPattern: 'half', layingStart: 'top' });
    const bottom = computeLayout({ ...base, layingPattern: 'half', layingStart: 'bottom' });
    const topFirst = top.boardSegments.filter((segment) => segment.zoneId === 'main').sort((a, b) => a.rowIndex - b.rowIndex)[0];
    const bottomFirst = bottom.boardSegments.filter((segment) => segment.zoneId === 'main').sort((a, b) => a.rowIndex - b.rowIndex)[0];
    expect(topFirst.y1M ?? 0).toBeLessThan(bottomFirst.y1M ?? 0);
  });

  it('autorise deux zones adjacentes qui partagent seulement une frontière', () => {
    const a: LayingZone = {
      id: 'A1', label: 'A1',
      points: [{ xM: 1, yM: 1 }, { xM: 2, yM: 1 }, { xM: 2, yM: 2 }, { xM: 1, yM: 2 }],
      direction: 'length', pattern: 'straight', start: 'left',
    };
    const b: LayingZone = {
      id: 'B1', label: 'B1',
      points: [{ xM: 2, yM: 1 }, { xM: 3, yM: 1 }, { xM: 3, yM: 2 }, { xM: 2, yM: 2 }],
      direction: 'width', pattern: 'straight', start: 'top',
    };
    expect(validateProject({ ...base, layingZones: [a, b] }).some((item) => item.tag === 'SA-TERR-ZONE-006')).toBe(false);
  });

  it('le départ sur une rive choisie utilise réellement la rive droite', () => {
    const byRight = computeLayout({ ...base, layingStart: 'right' });
    const byEdge = computeLayout({ ...base, layingStart: 'edge', layingStartEdgeIndex: 1 });
    expect(byEdge.buttJoints.map((joint) => Number((joint.xM ?? 0).toFixed(3))))
      .toEqual(byRight.buttJoints.map((joint) => Number((joint.xM ?? 0).toFixed(3))));
  });

  it('conserve la diagonale sur une forme libre avec une réservation débordante', () => {
    const project: ProjectInput = {
      ...base,
      shape: 'freeform',
      layingDirection: 'diagonal-45',
      freeformPoints: [
        { xM: 0, yM: 0 },
        { xM: 6, yM: 0 },
        { xM: 5.4, yM: 4 },
        { xM: 0, yM: 4 },
      ],
      obstacles: [{
        id: 'POOL-OVER',
        kind: 'pool',
        label: 'Piscine débordante',
        shape: 'rectangle',
        xM: -0.8,
        yM: 1,
        widthM: 2,
        heightM: 1.6,
      }],
    };
    expect(validateProject(project).some((item) => item.severity === 'blocking')).toBe(false);
    const layout = computeLayout(project);
    expect(layout.boardSegments.length).toBeGreaterThan(0);

    for (const segment of layout.boardSegments) {
      const samples = Array.from({ length: 9 }, (_, index) => {
        const t = index / 8;
        return {
          x: (segment.x1M ?? 0) + ((segment.x2M ?? 0) - (segment.x1M ?? 0)) * t,
          y: (segment.y1M ?? 0) + ((segment.y2M ?? 0) - (segment.y1M ?? 0)) * t,
        };
      });
      expect(samples.some((point) =>
        point.x > -0.8 && point.x < 1.2 && point.y > 1 && point.y < 2.6
      )).toBe(false);
    }
  });

  it('calcule aussi une zone polygonale non rectangulaire', () => {
    const polygonZone: LayingZone = {
      id: 'POLY',
      label: 'Zone polygonale',
      points: [
        { xM: 1, yM: 0.8 },
        { xM: 3.2, yM: 0.8 },
        { xM: 3.8, yM: 2 },
        { xM: 2.5, yM: 3.1 },
        { xM: 1.1, yM: 2.4 },
      ],
      direction: 'diagonal--45',
      pattern: 'third',
      start: 'edge',
      startEdgeIndex: 2,
    };
    const project = { ...base, layingZones: [polygonZone] };
    expect(validateProject(project).some((item) => item.severity === 'blocking')).toBe(false);
    const layout = computeLayout(project);
    expect(layout.zones.find((zone) => zone.id === 'POLY')?.direction).toBe('diagonal--45');
    expect(layout.boardSegments.some((segment) => segment.zoneId === 'POLY')).toBe(true);
  });

  it('bloque une zone dont les sommets sont dedans mais dont un côté traverse le décroché d’un L', () => {
    const lProject: ProjectInput = {
      ...base,
      shape: 'l-shape',
      layingZones: [{
        id: 'CROSS-NOTCH',
        label: 'Traverse décroché',
        points: [
          { xM: 5.5, yM: 2.8 },
          { xM: 3.5, yM: 3.8 },
          { xM: 3, yM: 2.5 },
        ],
        direction: 'length',
        pattern: 'straight',
        start: 'left',
      }],
    };
    expect(validateProject(lProject).some((item) => item.tag === 'SA-TERR-ZONE-004' && item.severity === 'blocking')).toBe(true);
  });

  it('bloque deux zones qui se chevauchent', () => {
    const a: LayingZone = {
      id: 'A', label: 'A',
      points: [{ xM: 0.5, yM: 0.5 }, { xM: 3, yM: 0.5 }, { xM: 3, yM: 2 }, { xM: 0.5, yM: 2 }],
      direction: 'length', pattern: 'straight', start: 'left',
    };
    const b: LayingZone = {
      id: 'B', label: 'B',
      points: [{ xM: 2, yM: 1 }, { xM: 5, yM: 1 }, { xM: 5, yM: 3 }, { xM: 2, yM: 3 }],
      direction: 'width', pattern: 'straight', start: 'top',
    };
    expect(validateProject({ ...base, layingZones: [a, b] }).some((item) => item.tag === 'SA-TERR-ZONE-006' && item.severity === 'blocking')).toBe(true);
  });
});
