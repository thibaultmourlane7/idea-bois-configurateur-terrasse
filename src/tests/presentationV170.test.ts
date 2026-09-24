import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildProfessional3DScene } from '../engine/scene3d';
import { resolveBoardRenderColors, resolveBoardTexture } from '../visual/resolveBoardTexture';

const pinVert = ideaBoisBoards.find((board) => board.id === 'IDEA-TERR-G027')!;
const pinMarron = ideaBoisBoards.find((board) => board.id === 'IDEA-TERR-G029')!;
const ipe = ideaBoisBoards.find((board) => board.id === 'IDEA-TERR-G011')!;
const unmapped = ideaBoisBoards.find((board) => board.id === 'IDEA-TERR-G012')!;

const base: ProjectInput = {
  projectName: 'Présentation IDEA Bois',
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
  board: pinVert,
  joist: demoJoist,
  usage: 'residential',
};

describe('V1.7 — présentation IDEA Bois et couleurs 3D produit', () => {
  it('utilise la teinte référencée du Pin du Nord vert au lieu du gris neutre historique', () => {
    const texture = resolveBoardTexture(pinVert);
    const colors = resolveBoardRenderColors(pinVert);

    expect(texture.status).not.toBe('neutral');
    expect(texture.tintColor).toBeDefined();
    expect(colors.source).toBe('product-texture');
    expect(colors.baseColor).toBe(texture.tintColor);
    expect(colors.baseColor).not.toBe(pinVert.visual?.baseColor);
  });

  it('différencie réellement plusieurs familles de couleurs produit', () => {
    const green = resolveBoardRenderColors(pinVert);
    const brown = resolveBoardRenderColors(pinMarron);
    const dark = resolveBoardRenderColors(ipe);

    expect(green.baseColor).not.toBe(brown.baseColor);
    expect(brown.baseColor).not.toBe(dark.baseColor);
    expect(green.grainColor).not.toBe(green.baseColor);
  });

  it('n’invente aucune couleur lorsqu’aucune texture fiable n’est mappée', () => {
    const texture = resolveBoardTexture(unmapped);
    const colors = resolveBoardRenderColors(unmapped);

    expect(texture.status).toBe('neutral');
    expect(colors.source).toBe('board-visual');
    expect(colors.baseColor).toBe(unmapped.visual?.baseColor);
    expect(colors.grainColor).toBe(unmapped.visual?.grainColor);
  });

  it('injecte la couleur produit dans chaque lame de la scène 3D réelle', () => {
    const project = { ...base, board: pinVert };
    const result = runConfigurator(project);
    expect(result.valid).toBe(true);

    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);
    const expected = resolveBoardRenderColors(pinVert);

    expect(scene.boards.length).toBeGreaterThan(0);
    expect(scene.boards.every((board) => board.baseColor === expected.baseColor)).toBe(true);
    expect(scene.boards.every((board) => board.grainColor === expected.grainColor)).toBe(true);
  });
});
