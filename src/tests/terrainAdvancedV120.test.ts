import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import { runConfigurator } from '../engine/configurator';
import { buildProfessional3DScene } from '../engine/scene3d';
import { computeTerrainModel, supportSurfaceDeltaMm, targetFinishedDeltaMm } from '../engine/terrain';
import { buildSiteDossierModel } from '../pdf/siteDossierModel';

const pin = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint H terrain avancé',
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
  layingZones: [],
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

function raisedProject(overrides: Partial<NonNullable<ProjectInput['layingZones']>[number]> = {}): ProjectInput {
  return {
    ...base,
    layingZones: [{
      id: 'PLATFORM-HIGH',
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
      finishedLevelOffsetMm: 150,
      supportLevelOffsetMm: 50,
      ...overrides,
    }],
  };
}

describe('Sprint H V1.2 — terrain avancé', () => {
  it('crée une relation réelle entre la plateforme principale et une plateforme haute', () => {
    const project = raisedProject();
    const terrain = computeTerrainModel(project);

    expect(terrain.platforms).toHaveLength(2);
    expect(terrain.relations).toHaveLength(1);
    expect(terrain.transitionCount).toBe(1);

    const relation = terrain.relations[0];
    expect(relation.aPlatformId).toBe('main');
    expect(relation.bPlatformId).toBe('PLATFORM-HIGH');
    expect(relation.sharedBoundaryLengthM).toBeCloseTo(4, 5);
    expect(relation.finishedDeltaMinMm).toBeCloseTo(150, 5);
    expect(relation.finishedDeltaMaxMm).toBeCloseTo(150, 5);
    expect(relation.supportDeltaMinMm).toBeCloseTo(50, 5);
    expect(relation.transitionRequired).toBe(true);
  });

  it('recalcule les hauteurs de plots selon le niveau fini ET le niveau du support de la plateforme', () => {
    const project = raisedProject();
    const result = runConfigurator(project);

    expect(result.supportPlan).toBeDefined();
    const mainPoints = result.supportPlan!.supportPoints.filter((point) => point.zoneId === 'main');
    const highPoints = result.supportPlan!.supportPoints.filter((point) => point.zoneId === 'PLATFORM-HIGH');

    expect(mainPoints.length).toBeGreaterThan(0);
    expect(highPoints.length).toBeGreaterThan(0);

    const mainHeight = mainPoints[0].requiredPlotHeightMm;
    const highHeight = highPoints[0].requiredPlotHeightMm;
    expect(highHeight - mainHeight).toBeCloseTo(100, 5);

    expect(targetFinishedDeltaMm(project, 4, 2, 'PLATFORM-HIGH')).toBeCloseTo(150, 5);
    expect(supportSurfaceDeltaMm(project, 4, 2, 'PLATFORM-HIGH')).toBeCloseTo(50, 5);
  });

  it('applique une pente locale propre à la plateforme en 3D sans modifier la plateforme principale', () => {
    const project = raisedProject({
      targetSlopeXPercent: 2,
      targetSlopeYPercent: 0,
    });
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);

    const highBoard = scene.boards.find((item) => item.zoneId === 'PLATFORM-HIGH');
    const mainBoard = scene.boards.find((item) => item.zoneId === 'main');
    expect(highBoard).toBeDefined();
    expect(mainBoard).toBeDefined();

    expect(Math.abs(highBoard!.top[3].zM - highBoard!.top[0].zM)).toBeGreaterThan(.005);
    expect(Math.abs(mainBoard!.top[3].zM - mainBoard!.top[0].zM)).toBeLessThan(.0001);
    expect(scene.terrain.transitionCount).toBeGreaterThan(0);
  });

  it('sépare réellement le calepinage et la structure à la frontière de plateforme', () => {
    const project = raisedProject();
    const result = runConfigurator(project);

    expect(result.layout?.zones.map((zone) => zone.id)).toEqual(expect.arrayContaining(['main', 'PLATFORM-HIGH']));
    expect(result.layout?.boardSegments.some((segment) => segment.zoneId === 'main')).toBe(true);
    expect(result.layout?.boardSegments.some((segment) => segment.zoneId === 'PLATFORM-HIGH')).toBe(true);
    expect(result.supportPlan?.joistSegments.some((segment) => segment.role === 'zone-boundary' && segment.zoneId === 'PLATFORM-HIGH')).toBe(true);
  });

  it('signale la transition de niveau sans inventer un escalier ou une rampe', () => {
    const result = runConfigurator(raisedProject());

    const warning = result.diagnostics.find((item) => item.tag === 'SA-TERR-TERRAIN-TRANSITION-120');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('warning');
    expect(warning?.message).toContain('150');
    expect(warning?.technicalMessage).toContain('Aucune marche');
    expect(result.valid).toBe(true);
  });

  it('conserve les niveaux complexes dans le lien de partage V11', () => {
    const project = raisedProject({
      targetSlopeXPercent: 1.2,
      targetSlopeYPercent: -0.4,
    });
    const restored = projectFromShareToken(projectToShareToken(project), base);
    const zone = restored.layingZones?.[0];

    expect(zone?.finishedLevelOffsetMm).toBe(150);
    expect(zone?.supportLevelOffsetMm).toBe(50);
    expect(zone?.targetSlopeXPercent).toBe(1.2);
    expect(zone?.targetSlopeYPercent).toBe(-0.4);
  });

  it('inclut plateformes et relations dans le dossier chantier', () => {
    const project = raisedProject();
    const result = runConfigurator(project);
    const dossier = buildSiteDossierModel(project, result, 'IB-TERR-VERSION-1.2.0', '23/09/2026');

    expect(dossier.terrain.platforms).toHaveLength(2);
    expect(dossier.terrain.transitionCount).toBe(1);
    expect(dossier.terrain.relations[0]).toMatchObject({
      aLabel: 'Plateforme principale',
      bLabel: 'Plateforme haute',
      transitionRequired: true,
    });
    expect(dossier.clientSummary.levelSummary).toContain('2 plateformes');
  });

  it('ne crée aucune fausse transition lorsque la zone reste au même niveau', () => {
    const project = raisedProject({
      finishedLevelOffsetMm: 0,
      supportLevelOffsetMm: 0,
    });
    const terrain = computeTerrainModel(project);
    expect(terrain.transitionCount).toBe(0);
    expect(terrain.relations[0].transitionRequired).toBe(false);
    expect(runConfigurator(project).diagnostics.some((item) => item.tag === 'SA-TERR-TERRAIN-TRANSITION-120')).toBe(false);
  });
});
