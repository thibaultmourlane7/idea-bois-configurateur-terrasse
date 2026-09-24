import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildProfessional3DScene } from '../engine/scene3d';
import { immersiveButtJointMarkers } from '../visual/immersive3d';
import { resolveBoardRenderColors } from '../visual/resolveBoardTexture';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint V1.8 jonctions 3D',
  shape: 'rectangle',
  dimensions: {
    lengthM: 9.5,
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

describe('V1.8 — jonctions 3D et teinte produit', () => {
  it('génère un marqueur 3D pour chaque vraie jonction de lame', () => {
    const result = runConfigurator(base);
    expect(result.valid).toBe(true);
    expect(result.layout).toBeDefined();
    expect(result.layout!.buttJoints.length).toBeGreaterThan(0);

    const scene = buildProfessional3DScene(base, result.layout, result.supportPlan);
    const markers = immersiveButtJointMarkers(scene, result.layout);

    expect(markers).toHaveLength(result.layout!.buttJoints.length);
    expect(markers.every((marker) => {
      const span = Math.hypot(marker.end.xM - marker.start.xM, marker.end.yM - marker.start.yM);
      return span > board.widthMm / 1000 * .9 && span < board.widthMm / 1000 * 1.05;
    })).toBe(true);
  });

  it('ne crée aucun marqueur 3D lorsque le calepinage ne possède aucun raccord', () => {
    const shortProject: ProjectInput = {
      ...base,
      dimensions: { ...base.dimensions, lengthM: 3 },
    };
    const result = runConfigurator(shortProject);
    expect(result.valid).toBe(true);
    expect(result.layout?.buttJoints).toHaveLength(0);

    const scene = buildProfessional3DScene(shortProject, result.layout, result.supportPlan);
    expect(immersiveButtJointMarkers(scene, result.layout)).toHaveLength(0);
  });

  it('conserve une vraie teinte produit non blanche sur les lames de la scène', () => {
    const result = runConfigurator(base);
    const scene = buildProfessional3DScene(base, result.layout, result.supportPlan);
    const colors = resolveBoardRenderColors(board);

    expect(colors.baseColor.toLowerCase()).not.toBe('#ffffff');
    expect(colors.baseColor.toLowerCase()).not.toBe('#e9eef1');
    expect(scene.boards.length).toBeGreaterThan(0);
    expect(scene.boards.every((item) => item.baseColor === colors.baseColor)).toBe(true);
  });
});
