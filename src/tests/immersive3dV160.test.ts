import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildProfessional3DScene } from '../engine/scene3d';
import { computeImmersiveCameraFrame, immersiveSceneSummary } from '../visual/immersive3d';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint G2 3D immersive',
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
  stairs: [],
  guardrails: [],
  board,
  joist: demoJoist,
  usage: 'residential',
};

function expectSceneStable(project: ProjectInput) {
  const result = runConfigurator(project);
  expect(result.valid).toBe(true);
  expect(result.layout).toBeDefined();

  const businessBefore = JSON.stringify({
    geometry: result.geometry,
    pricing: result.pricing,
    basket: result.basket,
    productSummaries: result.layout?.productSummaries,
  });

  const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);
  const summary = immersiveSceneSummary(scene);
  const frame = computeImmersiveCameraFrame(scene);

  expect(summary.boards).toBeGreaterThan(0);
  expect(Number.isFinite(frame.radiusM)).toBe(true);
  expect(frame.radiusM).toBeGreaterThan(0);
  expect(frame.targetXM).toBeGreaterThanOrEqual(scene.bounds.minXM);
  expect(frame.targetXM).toBeLessThanOrEqual(scene.bounds.maxXM);
  expect(frame.targetYM).toBeGreaterThanOrEqual(scene.bounds.minYM);
  expect(frame.targetYM).toBeLessThanOrEqual(scene.bounds.maxYM);

  const businessAfter = JSON.stringify({
    geometry: result.geometry,
    pricing: result.pricing,
    basket: result.basket,
    productSummaries: result.layout?.productSummaries,
  });
  expect(businessAfter).toBe(businessBefore);

  return { result, scene, summary };
}

describe('Sprint G2 V1.6 — 3D immersive', () => {
  it('cadre une terrasse rectangle sans modifier aucun résultat métier', () => {
    const { result, summary } = expectSceneStable(base);
    expect(summary.boards).toBe(result.layout?.boardSegments.length);
  });

  it('conserve les formes L et U dans la même scène métier', () => {
    const lShape: ProjectInput = { ...base, shape: 'l-shape' };
    const uShape: ProjectInput = { ...base, shape: 'u-shape' };

    const l = expectSceneStable(lShape);
    const u = expectSceneStable(uShape);

    expect(l.scene.deckOutline.length).toBeGreaterThan(4);
    expect(u.scene.deckOutline.length).toBeGreaterThan(4);
  });

  it('conserve réellement le calepinage diagonal', () => {
    const diagonal: ProjectInput = {
      ...base,
      layingDirection: 'diagonal-45',
    };
    const { scene } = expectSceneStable(diagonal);

    const segment = scene.boards.find((item) => {
      const a = item.top[0];
      const b = item.top[3];
      return Math.abs(b.xM - a.xM) > .05 && Math.abs(b.yM - a.yM) > .05;
    });
    expect(segment).toBeDefined();
  });

  it('encadre plusieurs niveaux sans perdre les hauteurs réelles', () => {
    const multiLevel: ProjectInput = {
      ...base,
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
        finishedLevelOffsetMm: 180,
        supportLevelOffsetMm: 40,
      }],
    };

    const { scene } = expectSceneStable(multiLevel);
    expect(scene.terrain.platforms).toHaveLength(2);
    expect(scene.bounds.maxZM - scene.bounds.minZM).toBeGreaterThan(.15);
  });

  it('intègre escalier et garde-corps dans le cadrage immersif', () => {
    const project: ProjectInput = {
      ...base,
      stairs: [{
        id: 'ESC-EXT',
        label: 'Accès jardin',
        mode: 'external-edge',
        edgeIndex: 0,
        boundarySegmentIndex: 0,
        landingLevelOffsetMm: 0,
        boundaryOffsetM: 1,
        widthM: 1.2,
        treadDepthMm: 300,
        stepCount: 2,
        structureLineCount: 2,
      }],
      guardrails: [{
        id: 'GC-ESC',
        label: 'Garde-corps escalier',
        targetType: 'stair-side',
        stairId: 'ESC-EXT',
        stairSide: 'left',
        heightMm: 900,
        postCount: 3,
        postSectionWidthMm: 60,
        postSectionDepthMm: 60,
        postReference: 'POST-60',
        sectionReference: 'SEC-STAIR',
        fixingReference: 'FIX-STAIR',
      }],
    };

    const { scene, summary } = expectSceneStable(project);
    expect(summary.stairs).toBe(1);
    expect(summary.stairTreads).toBe(2);
    expect(summary.guardrails).toBe(1);
    expect(summary.guardrailPosts).toBe(3);
    expect(scene.bounds.minYM).toBeLessThan(0);
    expect(scene.bounds.maxZM).toBeGreaterThan(1);
  });

  it('supporte un produit à plusieurs longueurs commerciales sans changer le moteur de débit', () => {
    const multiLength = ideaBoisBoards.find((item) =>
      (item.availableLengthsMm?.length ?? 0) > 1
      && item.gapMm != null
      && item.commercialRecipeId
    );
    expect(multiLength).toBeDefined();

    const project: ProjectInput = { ...base, board: multiLength! };
    const { result, scene } = expectSceneStable(project);

    expect(result.layout?.productSummaries[0]?.stockBoards.length).toBeGreaterThan(0);
    expect(scene.boards.length).toBeGreaterThan(0);
  });
});
