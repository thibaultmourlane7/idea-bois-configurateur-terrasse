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
    const visual = buildConstructionVisual(base, result.basket, result.supportPlan);
    expect(visual.rule?.joistSpacingMm).toBe(500);
    expect(visual.joists.filter((line) => line.role === 'field' || line.role === 'butt-joint')).toHaveLength(14);
    expect(visual.joists.filter((line) => line.role === 'perimeter').length).toBeGreaterThan(0);
    expect(visual.joists.filter((line) => line.buttJointSupport)).toHaveLength(1);
    expect(visual.plots.length).toBe(result.supportPlan?.supportPoints.length);
    expect(visual.plots.reduce((sum, point) => sum + (point.multiplicity ?? 1), 0))
      .toBe(result.supportPlan?.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0));
    expect(visual.plotsStatus).toBe('height-plan');
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
    expect(cladding.verticalJoistStockBoards?.every((item) => [2400, 3000].includes(item.stockLengthMm))).toBe(true);
    expect(cladding.verticalJoistLabel).toContain('pin Classe 4');
    expect(cladding.verticalJoistStockBreakdown?.every((item) => item.productRef != null)).toBe(true);
    expect(cladding.edgeBoardFixingCount).toBe(352);
    expect(cladding.edgeFixingSourceUrl).toContain('product_File/470.pdf');

    const result = runConfigurator(project);
    const finish = result.basket?.lines.find((line) => line.id === 'edge-finish');
    const vertical = result.basket?.lines.find((line) => line.id === 'edge-vertical-joists');
    expect(finish?.productRef).toBe(pinStrie.catalog?.internalCodes.join(', '));
    expect(finish?.status).toBe('exact');
    expect(vertical?.quantity).toBe(11);
    expect(vertical?.label).toContain('pin Classe 4');
    expect(vertical?.stockBreakdown?.every((item) => [2400, 3000].includes(item.lengthMm))).toBe(true);
    expect(vertical?.note).toContain('44 support');
    expect(vertical?.note).toContain('50 cm');
    const fixings = result.basket?.lines.find((line) => line.id === 'fixings');
    expect(fixings?.note).toContain('352 vis d’habillage latéral');
    expect(fixings?.quantityMin).toBe(6);
    expect(fixings?.quantityMax).toBe(7);
  });

  it('utilise une lambourde exotique pour l’habillage d’une terrasse Cumaru', () => {
    const cumaru = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G005')!;
    const project: ProjectInput = {
      ...base,
      board: cumaru,
      edgeFinishMode: 'full-perimeter',
      edgeCladdingHeightCm: 20,
    };

    const cladding = computeEdgeCladding(project);
    expect(cladding.status).toBe('exact');
    expect(cladding.verticalJoistLabel).toContain('exotique');
    expect(cladding.verticalJoistStockBoards?.every((item) => [1850, 2450, 3950].includes(item.stockLengthMm))).toBe(true);
    expect(cladding.verticalJoistTotalTtc).toBeGreaterThan(0);

    const result = runConfigurator(project);
    const vertical = result.basket?.lines.find((line) => line.id === 'edge-vertical-joists');
    expect(vertical?.status).toBe('exact');
    expect(vertical?.label).toContain('exotique');
    expect(vertical?.stockBreakdown?.every((item) => [1850, 2450, 3950].includes(item.lengthMm))).toBe(true);
    expect(vertical?.sourceUrl).toContain('lambourdes-ossatures');
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

  it('n’utilise plus de fausse texture pour les produits sans média direct vérifié', () => {
    const padouk = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G015')!;
    expect(padouk.visual?.imageStatus).toBe('verified-media');
    expect(padouk.visual?.imageUrl).toContain('idea-bois.com/media/cache/');
    expect(pinStrie.visual?.imageStatus).toBe('verified-product-page');
    expect(pinStrie.visual?.imageUrl).toBeUndefined();
    expect(pinStrie.visual?.officialProductCode).toBe('TSS300145027E');
    expect(pinStrie.visual?.baseColor).toBe('#e9eef1');
  });
});


describe('Visuels correctifs V0.14.1', () => {
  it('distingue le pin strié vert du pin strié marron avec deux pages produit officielles différentes', () => {
    const green = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G028')!;
    const brown = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G030')!;
    expect(green.visual?.officialProductCode).toBe('TSS300145027E');
    expect(brown.visual?.officialProductCode).toBe('TSS300145027M');
    expect(green.visual?.imageSourcePageUrl).not.toBe(brown.visual?.imageSourcePageUrl);
    expect(green.visual?.imageUrl).toBeUndefined();
    expect(brown.visual?.imageUrl).toBeUndefined();
  });

  it('mappe les pages produit prioritaires sans inventer de média direct', () => {
    const ids = ['IDEA-TERR-G005','IDEA-TERR-G008','IDEA-TERR-G011','IDEA-TERR-G037','IDEA-TERR-G038'];
    for (const id of ids) {
      const board = ideaBoisBoards.find((item) => item.id === id)!;
      expect(board.visual?.imageStatus).toBe('verified-product-page');
      expect(board.visual?.imageSourcePageUrl).toContain('idea-bois.com');
      expect(board.visual?.imageUrl).toBeUndefined();
    }
  });

  it('n’utilise plus le statut de rendu couleur simulé', () => {
    expect(ideaBoisBoards.every((board) => board.visual?.imageStatus !== ('catalog-described' as never))).toBe(true);
  });
});
