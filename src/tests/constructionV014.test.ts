import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { computeEdgeCladding } from '../engine/edgeCladding';
import { runConfigurator } from '../engine/configurator';
import { validateProject } from '../domain/validation';
import { layersForStep } from '../visual/layers';
import type { ProjectInput } from '../domain/types';

const pinStrie = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G028')!;

const base: ProjectInput = {
  projectName: 'Construction V0.14',
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
  board: pinStrie,
  joist: demoJoist,
  usage: 'residential',
};

describe('Construction visuelle et habillage V0.14', () => {
  it('construit progressivement les couches par étape', () => {
    expect(layersForStep(1).joists).toBe(false);
    expect(layersForStep(2).joists).toBe(true);
    expect(layersForStep(2).plots).toBe(false);
    expect(layersForStep(3).plots).toBe(true);
    expect(layersForStep(4).verticalJoists).toBe(true);
    expect(layersForStep(5).decking).toBe(true);
    expect(layersForStep(5).joists).toBe(false);
  });

  it('calcule les lambourdes visibles à partir de l’entraxe documenté', () => {
    const result = runConfigurator(base);
    const visual = buildConstructionVisual(base, result.basket);
    expect(visual.rule?.joistSpacingMm).toBe(500);
    expect(visual.joists).toHaveLength(13);
    expect(visual.plots).toHaveLength(96);
    expect(visual.plotsStatus).toBe('commercial-distribution');
  });

  it('calcule un habillage bois de 50 cm avec la même lame et des supports verticaux de 50 cm', () => {
    const project: ProjectInput = {
      ...base,
      heightCm: 50,
      edgeFinishMode: 'full-perimeter',
      edgeCladdingHeightCm: 50,
    };
    const cladding = computeEdgeCladding(project);
    expect(cladding.status).toBe('exact');
    expect(cladding.mode).toBe('same-decking');
    expect(cladding.rowCount).toBe(4);
    expect(cladding.verticalJoistSpacingMm).toBe(500);
    expect(cladding.verticalSupportCount).toBe(44);
    expect(cladding.verticalJoistRequiredLinearM).toBeCloseTo(22, 6);
    expect(cladding.verticalJoistStockBoards).toHaveLength(11);

    const result = runConfigurator(project);
    const finish = result.basket?.lines.find((line) => line.id === 'edge-finish');
    const vertical = result.basket?.lines.find((line) => line.id === 'edge-vertical-joists');
    expect(finish?.productRef).toBe(pinStrie.catalog?.internalCodes.join(', '));
    expect(finish?.status).toBe('exact');
    expect(vertical?.quantity).toBe(11);
    expect(vertical?.note).toContain('44 support');
    expect(vertical?.note).toContain('50 cm');
  });

  it('optimise différemment les lambourdes verticales quand la hauteur change', () => {
    const twenty = computeEdgeCladding({ ...base, edgeFinishMode: 'full-perimeter', edgeCladdingHeightCm: 20 });
    const fifty = computeEdgeCladding({ ...base, heightCm: 50, edgeFinishMode: 'full-perimeter', edgeCladdingHeightCm: 50 });
    expect(twenty.verticalSupportCount).toBe(fifty.verticalSupportCount);
    expect(twenty.verticalJoistStockBoards).toHaveLength(4);
    expect(fifty.verticalJoistStockBoards).toHaveLength(11);
  });

  it('bloque une hauteur d’habillage supérieure à la hauteur finie', () => {
    const diagnostics = validateProject({ ...base, edgeFinishMode: 'full-perimeter', edgeCladdingHeightCm: 30 });
    expect(diagnostics.some((item) => item.tag === 'SA-TERR-EDGE-HEIGHT-002' && item.severity === 'blocking')).toBe(true);
  });

  it('associe une vraie image produit vérifiée au Padouk et garde un fallback catalogué pour les autres', () => {
    const padouk = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G015')!;
    expect(padouk.visual?.imageStatus).toBe('verified-media');
    expect(padouk.visual?.imageUrl).toContain('idea-bois.com/media/cache/');
    expect(pinStrie.visual?.imageStatus).toBe('catalog-described');
    expect(pinStrie.visual?.baseColor).toBeTruthy();
  });
});
