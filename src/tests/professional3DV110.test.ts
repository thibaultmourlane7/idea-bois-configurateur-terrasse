import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildProfessional3DScene } from '../engine/scene3d';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

const base: ProjectInput = {
  projectName: 'Sprint G 3D professionnelle',
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
  heightCm: 22,
  supportLevelProfile: {
    mode: 'flat',
    topLeftDeltaMm: 0,
    topRightDeltaMm: 0,
    bottomRightDeltaMm: 0,
    bottomLeftDeltaMm: 0,
    targetSlopeXPercent: 0,
    targetSlopeYPercent: 0,
  },
  doubleJoistsAtButtJoints: true,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeConfigs: [],
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'half',
  layingZones: [],
  board: board('IDEA-TERR-G027'),
  joist: demoJoist,
  usage: 'residential',
};

describe('Sprint G V1.1 — 3D professionnelle', () => {
  it('crée exactement un objet 3D par segment réel du calepinage', () => {
    const result = runConfigurator(base);
    const scene = buildProfessional3DScene(base, result.layout, result.supportPlan);

    expect(result.layout).toBeDefined();
    expect(scene.boards).toHaveLength(result.layout!.boardSegments.length);
    expect(new Set(scene.boards.map((item) => item.sourceSegmentId)).size).toBe(scene.boards.length);

    const first = scene.boards[0];
    const width = Math.hypot(
      first.top[1].xM - first.top[0].xM,
      first.top[1].yM - first.top[0].yM,
    );
    expect(width).toBeCloseTo(first.widthM, 5);
    expect(first.lengthM).toBeCloseTo(
      result.layout!.boardSegments.find((item) => item.id === first.sourceSegmentId)!.lengthMm / 1000,
      5,
    );
  });

  it('conserve le produit et la zone de chaque segment en multi-zone', () => {
    const project: ProjectInput = {
      ...base,
      layingZones: [{
        id: 'ZONE-B',
        label: 'Zone B',
        points: [
          { xM: 3, yM: 1 },
          { xM: 5, yM: 1 },
          { xM: 5, yM: 3 },
          { xM: 3, yM: 3 },
        ],
        direction: 'width',
        pattern: 'straight',
        start: 'right',
        boardId: 'IDEA-TERR-G028',
      }],
    };
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);

    expect(scene.boards.some((item) => item.zoneId === 'ZONE-B' && item.boardId === 'IDEA-TERR-G028')).toBe(true);
    expect(scene.boards.some((item) => item.zoneId === 'main' && item.boardId === 'IDEA-TERR-G027')).toBe(true);
  });

  it('représente la pente finie dans la hauteur réelle des objets lames', () => {
    const project: ProjectInput = {
      ...base,
      supportLevelProfile: {
        mode: 'four-corners',
        topLeftDeltaMm: 0,
        topRightDeltaMm: 20,
        bottomRightDeltaMm: 30,
        bottomLeftDeltaMm: 10,
        targetSlopeXPercent: 1.5,
        targetSlopeYPercent: .5,
      },
      heightCm: 30,
    };
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);
    const sloped = scene.boards.find((item) => Math.abs(item.top[0].xM - item.top[3].xM) > 1);

    expect(sloped).toBeDefined();
    expect(sloped!.top[0].zM).not.toBeCloseTo(sloped!.top[3].zM, 5);
    expect(scene.bounds.maxZM).toBeGreaterThan(scene.bounds.minZM);
  });

  it('reprend les lambourdes et les appuis réellement calculés, sans trame fictive', () => {
    const result = runConfigurator(base);
    const scene = buildProfessional3DScene(base, result.layout, result.supportPlan);

    expect(scene.joists).toHaveLength(result.supportPlan!.joistSegments.length);
    expect(scene.supports).toHaveLength(result.supportPlan!.supportPoints.length);
    expect(scene.joists.some((item) => item.role === 'butt-joint' || item.multiplicity === 2)).toBe(true);
  });

  it('reprend les réservations et les traitements de rive', () => {
    const project: ProjectInput = {
      ...base,
      obstacles: [
        { id: 'POOL', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: 1, yM: 1, widthM: 2, heightM: 1.2 },
        { id: 'TREE', kind: 'tree', label: 'Arbre', shape: 'circle', xM: 4, yM: 2, diameterM: .7 },
      ],
      edgeFinishMode: 'per-edge',
      edgeConfigs: [
        { edgeIndex: 0, context: 'wall', treatment: 'profile' },
        { edgeIndex: 1, context: 'facade', treatment: 'cladding' },
      ],
    };
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);

    expect(scene.obstacles.map((item) => item.kind)).toEqual(expect.arrayContaining(['pool', 'tree']));
    expect(scene.edges.find((item) => item.label === 'AB')?.treatment).toBe('profile');
    expect(scene.edges.find((item) => item.label === 'BC')?.treatment).toBe('cladding');
  });

  it('n’invente aucune lame 3D lorsque le calepinage est bloqué', () => {
    const project: ProjectInput = { ...base, board: board('IDEA-TERR-G008') };
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);

    expect(result.layout).toBeUndefined();
    expect(scene.boards).toHaveLength(0);
    expect(scene.diagnostics.some((message) => message.includes('Calepinage indisponible'))).toBe(true);
  });
});
