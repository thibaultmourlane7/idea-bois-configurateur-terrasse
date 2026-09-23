import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import { runConfigurator } from '../engine/configurator';
import { computeLayout } from '../engine/layout';
import { buildProfessional3DScene } from '../engine/scene3d';
import { computeStairs } from '../engine/stairs';
import { buildSiteDossierModel } from '../pdf/siteDossierModel';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint I escaliers',
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
  layingPattern: 'straight',
  layingZones: [{
    id: 'HIGH',
    label: 'Plateforme haute',
    points: [
      { xM: 3, yM: 0 },
      { xM: 6, yM: 0 },
      { xM: 6, yM: 4 },
      { xM: 3, yM: 4 },
    ],
    direction: 'length',
    pattern: 'straight',
    start: 'left',
    finishedLevelOffsetMm: 450,
    supportLevelOffsetMm: 0,
  }],
  stairs: [],
  board,
  joist: demoJoist,
  usage: 'residential',
};

function withStair(overrides: Partial<NonNullable<ProjectInput['stairs']>[number]> = {}): ProjectInput {
  return {
    ...base,
    stairs: [{
      id: 'ESC-1',
      label: 'Escalier principal',
      relationId: 'REL-main-HIGH',
      boundarySegmentIndex: 0,
      boundaryOffsetM: 1,
      widthM: 1.2,
      treadDepthMm: 300,
      stepCount: 3,
      structureLineCount: 2,
      ...overrides,
    }],
  };
}

describe('Sprint I V1.3 — escaliers', () => {
  it('calcule marches, hauteurs, développement et quantité de lame depuis une transition réelle', () => {
    const stair = computeStairs(withStair())[0];

    expect(stair.status).toBe('ready');
    expect(stair.lowPlatformId).toBe('main');
    expect(stair.highPlatformId).toBe('HIGH');
    expect(stair.stepCount).toBe(3);
    expect(stair.riseLeftMm).toBeCloseTo(450, 5);
    expect(stair.riseRightMm).toBeCloseTo(450, 5);
    expect(stair.riserHeightLeftMm).toBeCloseTo(150, 5);
    expect(stair.totalRunM).toBeCloseTo(.9, 5);
    expect(stair.treads).toHaveLength(3);
    expect(stair.treadBoardRows).toBeGreaterThan(0);
    expect(stair.requiredPieces.length).toBe((stair.treadBoardRows ?? 0) * 3);
    expect(stair.treadRequiredLinearM).toBeGreaterThan(0);
  });

  it('calcule uniquement une longueur géométrique de structure à partir du nombre de lignes porteuses saisi', () => {
    const stair = computeStairs(withStair())[0];

    expect(stair.structureLineCount).toBe(2);
    expect(stair.structureAxes).toHaveLength(2);
    expect(stair.structureLinearM).toBeGreaterThan(0);
    expect(stair.issues).toHaveLength(0);

    const withoutStructure = computeStairs(withStair({ structureLineCount: undefined }))[0];
    expect(withoutStructure.status).toBe('ready');
    expect(withoutStructure.structureAxes).toHaveLength(0);
    expect(withoutStructure.structureLinearM).toBeUndefined();
    expect(withoutStructure.issues.join(' ')).toContain('limons');
  });

  it('intègre les pièces de marches au même optimiseur matière que la terrasse', () => {
    const project = withStair();
    const stair = computeStairs(project)[0];
    const layout = computeLayout(project);

    const stairPieces = layout.requiredPieces.filter((piece) => piece.zoneId === 'stair:ESC-1');
    expect(stairPieces).toHaveLength(stair.requiredPieces.length);
    expect(layout.productSummaries.some((summary) => summary.zoneIds.includes('stair:ESC-1'))).toBe(true);

    const optimizedPieceIds = new Set(
      layout.productSummaries.flatMap((summary) => summary.stockBoards.flatMap((stock) => stock.cuts.map((cut) => cut.pieceId))),
    );
    for (const piece of stairPieces) expect(optimizedPieceIds.has(piece.id)).toBe(true);
  });

  it('retire l’emprise de l’escalier des lames de la plateforme basse', () => {
    const project = withStair();
    const stair = computeStairs(project)[0];
    const layout = computeLayout(project);
    const footprint = stair.footprint!;

    const minX = Math.min(...footprint.map((point) => point.xM));
    const maxX = Math.max(...footprint.map((point) => point.xM));
    const minY = Math.min(...footprint.map((point) => point.yM));
    const maxY = Math.max(...footprint.map((point) => point.yM));

    const mainSegmentsInside = layout.boardSegments.filter((segment) => {
      if (segment.zoneId !== 'main' || segment.x1M == null || segment.x2M == null || segment.y1M == null || segment.y2M == null) return false;
      const mx = (segment.x1M + segment.x2M) / 2;
      const my = (segment.y1M + segment.y2M) / 2;
      return mx > minX + .01 && mx < maxX - .01 && my > minY + .01 && my < maxY - .01;
    });
    expect(mainSegmentsInside).toHaveLength(0);
  });

  it('rend les marches et axes structurels dans la scène 3D', () => {
    const project = withStair();
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);

    expect(scene.stairs).toHaveLength(1);
    expect(scene.stairs[0].treads).toHaveLength(3);
    expect(scene.stairs[0].structureAxes).toHaveLength(2);
    expect(scene.bounds.maxZM).toBeGreaterThanOrEqual(.65);
  });

  it('ajoute les lignes structure/fixations escalier au panier sans inventer leur prix', () => {
    const result = runConfigurator(withStair());
    const structure = result.basket?.lines.find((line) => line.id === 'stair-structure-ESC-1');
    const fixings = result.basket?.lines.find((line) => line.id === 'stair-fixings-ESC-1');

    expect(structure?.status).toBe('pending');
    expect(structure?.quantity).toBeGreaterThan(0);
    expect(structure?.totalTtc).toBeUndefined();
    expect(fixings?.status).toBe('pending');
    expect(result.basket?.status).toBe('partial');
  });

  it('bloque un escalier incomplet ou plus large que la longueur commerciale validée', () => {
    const incomplete = runConfigurator(withStair({ widthM: undefined }));
    expect(incomplete.valid).toBe(false);
    expect(incomplete.diagnostics.some((item) => item.tag === 'SA-TERR-STAIR-GEO-001')).toBe(true);

    const tooWide = runConfigurator(withStair({ widthM: 6 }));
    expect(tooWide.valid).toBe(false);
    expect(tooWide.diagnostics.some((item) => item.tag === 'SA-TERR-STAIR-GEO-002' && item.message.includes('longueur commerciale'))).toBe(true);
  });

  it('bloque deux escaliers qui se chevauchent sur la même frontière', () => {
    const project = withStair();
    project.stairs = [
      project.stairs![0],
      {
        ...project.stairs![0],
        id: 'ESC-2',
        label: 'Escalier secondaire',
        boundaryOffsetM: 1.5,
      },
    ];
    const result = runConfigurator(project);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.tag === 'SA-TERR-STAIR-OVERLAP-001')).toBe(true);
  });

  it('conserve les escaliers dans le partage V12', () => {
    const project = withStair();
    const restored = projectFromShareToken(projectToShareToken(project), base);

    expect(restored.stairs).toHaveLength(1);
    expect(restored.stairs?.[0]).toMatchObject({
      id: 'ESC-1',
      relationId: 'REL-main-HIGH',
      widthM: 1.2,
      treadDepthMm: 300,
      stepCount: 3,
      structureLineCount: 2,
    });
  });

  it('ajoute les escaliers au dossier chantier et au résumé client', () => {
    const project = withStair();
    const result = runConfigurator(project);
    const dossier = buildSiteDossierModel(project, result, 'IB-TERR-VERSION-1.3.0', '23/09/2026');

    expect(dossier.stairs).toHaveLength(1);
    expect(dossier.stairs[0]).toMatchObject({
      label: 'Escalier principal',
      status: 'ready',
      stepCount: 3,
      structureLineCount: 2,
    });
    expect(dossier.clientSummary.levelSummary).toContain('1 escalier');
    expect(dossier.clientSummary.levelSummary).toContain('3 marche');
  });
});
