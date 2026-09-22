import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import { buildVariantComparison, getProductReadiness } from '../catalog/readiness';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';

const project: ProjectInput = {
  projectName: 'Comparatif V0.12',
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
  board: ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!,
  joist: demoJoist,
  usage: 'residential',
};

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

describe('Catalogue et comparateur V0.12', () => {
  it('étend la recette Pin du Nord aux variantes documentées', () => {
    for (const id of ['IDEA-TERR-G027','IDEA-TERR-G028','IDEA-TERR-G030','IDEA-TERR-G031']) {
      expect(board(id).commercialRecipeId).toBe('idea-pin-nord-145x27');
      expect(board(id).gapMm).toBe(5);
      expect(getProductReadiness(board(id)).level).toBe('complete');
    }
  });

  it('rend le Cumaru 145x21 calculable avec jeu 5 mm et vis bois dur', () => {
    const cumaru = board('IDEA-TERR-G005');
    expect(cumaru.commercialRecipeId).toBe('idea-cumaru-145x21');
    expect(cumaru.gapMm).toBe(5);
    expect(getProductReadiness(cumaru).level).toBe('complete');

    const result = runConfigurator({ ...project, board: cumaru });
    expect(result.layout).toBeDefined();
    expect(result.basket?.status).toBe('complete');
    expect(result.basket?.lines.find((line) => line.id === 'fixings')?.productRef).toBe('5410439474320');
  });

  it('conserve le Garapa en calcul partiel avec plage fabricant 8 à 10 mm', () => {
    const garapa = board('IDEA-TERR-G008');
    expect(garapa.commercialRecipeId).toBe('idea-garapa-145x21');
    expect(garapa.gapMm).toBeUndefined();
    expect(garapa.gapRangeMm).toEqual([8, 10]);
    expect(getProductReadiness(garapa).level).toBe('partial');

    const result = runConfigurator({ ...project, board: garapa });
    expect(result.layout).toBeUndefined();
    expect(result.basket?.status).toBe('partial');
  });

  it('garde Padouk partiel mais active le jeu documenté de l’Ipé', () => {
    expect(board('IDEA-TERR-G015').commercialRecipeId).toBe('idea-padouk-120x21');
    expect(board('IDEA-TERR-G015').gapMm).toBeUndefined();
    expect(getProductReadiness(board('IDEA-TERR-G015')).level).toBe('partial');

    expect(board('IDEA-TERR-G011').commercialRecipeId).toBe('idea-ipe-140x20');
    expect(board('IDEA-TERR-G011').gapMm).toBe(5);
    expect(board('IDEA-TERR-G011').gapRangeMm).toEqual([4, 5]);
    expect(getProductReadiness(board('IDEA-TERR-G011')).level).toBe('complete');
  });

  it('ne donne plus une structure générique aux produits sans recette validée', () => {
    const bamboo = board('IDEA-TERR-G001');
    const result = runConfigurator({ ...project, board: bamboo });
    expect(getProductReadiness(bamboo).level).toBe('partial');
    expect(result.basket?.lines.find((line) => line.id === 'joists')?.status).toBe('pending');
  });

  it('compare plusieurs variantes sur exactement la même géométrie', () => {
    const variants = buildVariantComparison(project, [
      board('IDEA-TERR-G027'),
      board('IDEA-TERR-G005'),
      board('IDEA-TERR-G008'),
    ]);
    expect(variants).toHaveLength(3);
    expect(variants[0].readiness.level).toBe('complete');
    expect(variants[1].readiness.level).toBe('complete');
    expect(variants[2].readiness.level).toBe('partial');
    expect(variants.every((variant) => variant.budgetValue != null || variant.budgetMin != null)).toBe(true);
  });
});
