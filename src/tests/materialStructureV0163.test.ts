import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { computeLayout } from '../engine/layout';
import { computeSupportPlan } from '../engine/supportPlan';
import { getCommercialConstructionRule, getCommercialJoistOptions } from '../engine/constructionRules';

const pin = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Matériaux V0.16.3',
  shape: 'rectangle',
  dimensions: { lengthM: 6, widthM: 4, notchLengthM: 2, notchWidthM: 1, circleDiameterM: 5, tStemWidthM: 2.5, tBarDepthM: 1.5, uOpeningWidthM: 2, uOpeningDepthM: 2 },
  obstacles: [],
  heightCm: 20,
  supportLevelProfile: { mode: 'flat', topLeftDeltaMm: 0, topRightDeltaMm: 0, bottomRightDeltaMm: 0, bottomLeftDeltaMm: 0, targetSlopeXPercent: 0, targetSlopeYPercent: 0 },
  doubleJoistsAtButtJoints: false,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingPattern: 'straight',
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

function board(id: string) {
  const value = ideaBoisBoards.find((item) => item.id === id);
  if (!value) throw new Error('Board missing: ' + id);
  return value;
}

describe('Extension structure matériaux V0.16.3', () => {
  it('active Cumaru à 450 mm avec lambourde exotique', () => {
    const project = { ...base, board: board('IDEA-TERR-G005') };
    const rule = getCommercialConstructionRule(project)!;
    const plan = computeSupportPlan(project, computeLayout(project));
    expect(rule.status).toBe('validated');
    expect(rule.joistSpacingMm).toBe(450);
    expect(rule.joistProductRef).toBe('LEX395065042');
    expect(plan.status).toBe('exact');
    expect(rule.joistStockLengthsMm).toEqual([1850, 2450, 3950]);
    expect(plan.joistStockBoards.every((item) => [1850, 2450, 3950].includes(item.stockLengthMm))).toBe(true);
  });

  it('active Ipé à 400 mm avec jeu catalogue de 5 mm dans la plage 4–5 mm', () => {
    const project = { ...base, board: board('IDEA-TERR-G011') };
    const rule = getCommercialConstructionRule(project)!;
    expect(project.board.gapMm).toBe(5);
    expect(project.board.gapRangeMm).toEqual([4, 5]);
    expect(rule.joistSpacingMm).toBe(400);
    expect(computeSupportPlan(project, computeLayout(project)).status).toBe('exact');
  });

  it('calcule Garapa et Padouk avec le jeu projet validé à 5 mm tout en exigeant le choix de lambourde', () => {
    for (const id of ['IDEA-TERR-G008', 'IDEA-TERR-G015']) {
      const project = { ...base, board: board(id) };
      const rule = getCommercialConstructionRule(project)!;
      const layout = computeLayout(project);
      const plan = computeSupportPlan(project, layout);
      expect(project.board.gapMm).toBe(5);
      expect(layout.boardSegments.length).toBeGreaterThan(0);
      expect(rule.status).toBe('partial');
      expect(rule.joistChoiceRequired).toBe(true);
      expect(plan.status).toBe('unavailable');
      expect(plan.joistSegments).toHaveLength(0);
      expect(plan.note).toContain('choisir');
    }
  });

  it('applique le choix Pin Classe 4 ou exotique sans substitution silencieuse', () => {
    for (const id of ['IDEA-TERR-G008', 'IDEA-TERR-G015']) {
      const pinRule = getCommercialConstructionRule({ ...base, board: board(id), structureJoistChoice: 'pin-class4' })!;
      expect(pinRule.status).toBe('validated');
      expect(pinRule.joistLabel).toContain('pin Classe 4');
      expect(pinRule.joistStockLengthsMm).toEqual([2400, 3000]);

      const exoticRule = getCommercialConstructionRule({ ...base, board: board(id), structureJoistChoice: 'exotic' })!;
      expect(exoticRule.status).toBe('validated');
      expect(exoticRule.joistLabel).toContain('exotique');
      expect(exoticRule.joistStockLengthsMm).toEqual([1850, 2450, 3950]);
    }
  });

  it('propose Réversil en priorité pour SILVADEC et conserve une alternative compatible sans l’inventer', () => {
    const project = { ...base, board: board('IDEA-TERR-G037') };
    const options = getCommercialJoistOptions(project);
    expect(options[0].id).toBe('manufacturer-recommended');
    expect(options[0].recommended).toBe(true);
    expect(options[1].id).toBe('other-compatible');

    const rule = getCommercialConstructionRule(project)!;
    const plan = computeSupportPlan(project, computeLayout(project));
    expect(rule.status).toBe('validated');
    expect(rule.joistProductRef).toBe('SILAMB2102');
    expect(rule.joistSpacingMm).toBe(400);
    expect(rule.plotSpacingMm).toBe(600);
    expect(rule.plotCatalogueValidated).toBe(false);
    expect(plan.status).toBe('partial');
    expect(plan.supportPoints.length).toBeGreaterThan(0);
    expect(plan.joistStockBoards.every((item) => item.stockLengthMm === 3600)).toBe(true);

    const alternative = getCommercialConstructionRule({ ...project, structureJoistChoice: 'other-compatible' })!;
    expect(alternative.status).toBe('partial');
    expect(alternative.joistSpacingMm).toBe(0);
    expect(alternative.sourceNote).toContain('ne doivent pas être utilisées sur plots');
  });

  it('calcule MOSO avec le système bambou recommandé et laisse une alternative à confirmer', () => {
    const project = { ...base, board: board('IDEA-TERR-G002') };
    const options = getCommercialJoistOptions(project);
    expect(options[0].id).toBe('manufacturer-recommended');
    expect(options[0].label).toContain('MOSO');

    const rule = getCommercialConstructionRule(project)!;
    const plan = computeSupportPlan(project, computeLayout(project));
    expect(project.board.gapMm).toBe(5);
    expect(project.board.gapRangeMm).toEqual([5, 6]);
    expect(rule.status).toBe('validated');
    expect(rule.joistProductRef).toBe('BO-SB155');
    expect(rule.joistSpacingMm).toBe(462.5);
    expect(rule.joistStockLengthsMm).toEqual([2440]);
    expect(plan.status).toBe('partial');
    expect(plan.joistStockBoards.every((item) => item.stockLengthMm === 2440)).toBe(true);

    const alternative = getCommercialConstructionRule({ ...project, structureJoistChoice: 'other-compatible' })!;
    expect(alternative.status).toBe('partial');
    expect(alternative.joistChoiceRequired).toBe(true);
  });

  it('garde DASSO préconisé mais partiel tant que son plan d’appuis n’est pas documenté', () => {
    const project = { ...base, board: board('IDEA-TERR-G001') };
    const rule = getCommercialConstructionRule(project)!;
    expect(project.board.gapMm).toBe(5);
    expect(project.board.gapRangeMm).toEqual([5, 6]);
    expect(rule.status).toBe('partial');
    expect(rule.joistProductRef).toBe('XJ30-48-UAC');
    expect(rule.joistSpacingMm).toBe(435);
    expect(computeSupportPlan(project, computeLayout(project)).status).toBe('unavailable');
  });

  it('rattache G026 et G029 à la recette Pin standard et garde PROLIN séparé', () => {
    for (const id of ['IDEA-TERR-G026', 'IDEA-TERR-G029']) {
      const project = { ...base, board: board(id) };
      const rule = getCommercialConstructionRule(project)!;
      expect(project.board.commercialRecipeId).toBe('idea-pin-nord-145x27');
      expect(project.board.gapMm).toBe(5);
      expect(rule.status).toBe('validated');
    }

    const prolin = board('IDEA-TERR-G025');
    const prolinRule = getCommercialConstructionRule({ ...base, board: prolin })!;
    expect(prolin.commercialRecipeId).toBe('idea-prolin-pin-nord-120x28');
    expect(prolinRule.status).toBe('partial');
    expect(prolinRule.sourceNote).toContain('clips invisibles');
  });
});
