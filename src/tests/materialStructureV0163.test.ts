import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { computeLayout } from '../engine/layout';
import { computeSupportPlan } from '../engine/supportPlan';
import { getCommercialConstructionRule } from '../engine/constructionRules';

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
    expect(plan.joistStockBoards.every((item) => item.stockLengthMm === 3950)).toBe(true);
  });

  it('active Ipé à 400 mm avec jeu catalogue de 5 mm dans la plage 4–5 mm', () => {
    const project = { ...base, board: board('IDEA-TERR-G011') };
    const rule = getCommercialConstructionRule(project)!;
    expect(project.board.gapMm).toBe(5);
    expect(project.board.gapRangeMm).toEqual([4, 5]);
    expect(rule.joistSpacingMm).toBe(400);
    expect(computeSupportPlan(project, computeLayout(project)).status).toBe('exact');
  });

  it('calcule la structure Garapa et Padouk sans inventer leur jeu final', () => {
    for (const id of ['IDEA-TERR-G008', 'IDEA-TERR-G015']) {
      const project = { ...base, board: board(id) };
      const rule = getCommercialConstructionRule(project)!;
      const plan = computeSupportPlan(project);
      expect(rule.status).toBe('validated');
      expect(plan.status).toBe('exact');
      expect(plan.joistSegments.length).toBeGreaterThan(0);
    }
    expect(board('IDEA-TERR-G008').gapRangeMm).toEqual([8, 10]);
    expect(board('IDEA-TERR-G008').gapMm).toBeUndefined();
    expect(board('IDEA-TERR-G015').gapMm).toBeUndefined();
  });

  it('calcule SILVADEC sur Réversil sans inventer le modèle de plot', () => {
    const project = { ...base, board: board('IDEA-TERR-G037') };
    const rule = getCommercialConstructionRule(project)!;
    const plan = computeSupportPlan(project, computeLayout(project));
    expect(rule.joistSpacingMm).toBe(400);
    expect(rule.plotSpacingMm).toBe(600);
    expect(rule.plotCatalogueValidated).toBe(false);
    expect(plan.status).toBe('partial');
    expect(plan.supportPoints.length).toBeGreaterThan(0);
    expect(plan.unsupportedPointCount).toBeGreaterThan(0);
    expect(plan.joistStockBoards.every((item) => item.stockLengthMm === 3600)).toBe(true);
  });

  it('maintient le Bambou en structure à confirmer', () => {
    const project = { ...base, board: board('IDEA-TERR-G002') };
    const rule = getCommercialConstructionRule(project)!;
    const plan = computeSupportPlan(project);
    expect(rule.status).toBe('partial');
    expect(plan.status).toBe('unavailable');
    expect(plan.note).toContain('entraxe');
  });
});
