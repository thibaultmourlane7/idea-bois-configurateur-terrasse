import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import type { ProjectInput } from '../domain/types';
import { computeLayout } from '../engine/layout';
import { computeSupportPlan } from '../engine/supportPlan';
import { runConfigurator } from '../engine/configurator';

const pin = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Structure V0.16',
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
  doubleJoistsAtButtJoints: false,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

describe('Structure technique avancée V0.16', () => {
  it('implante les plots à 70 cm maximum et repère les jonctions sans les doubler par défaut', () => {
    const plan = computeSupportPlan(base, computeLayout(base));

    expect(plan.status).toBe('exact');
    expect(plan.joistSpacingMm).toBe(500);
    expect(plan.plotSpacingMm).toBe(700);
    expect(plan.buttJointAxisPositionsMm).toEqual([5400]);
    expect(plan.joistSegments).toHaveLength(14);
    expect(plan.joistSegments.filter((segment) => segment.buttJointSupport)).toHaveLength(1);
    expect(plan.joistSegments.filter((segment) => segment.multiplicity === 2)).toHaveLength(0);
    expect(plan.supportPoints).toHaveLength(98);
    expect(plan.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0)).toBe(98);
  });

  it('calcule 133 mm de plot sur le projet de référence horizontal', () => {
    const plan = computeSupportPlan(base, computeLayout(base));
    expect(plan.minRequiredPlotHeightMm).toBeCloseTo(133, 6);
    expect(plan.maxRequiredPlotHeightMm).toBeCloseTo(133, 6);
    expect(plan.plotGroups).toHaveLength(1);
    expect(plan.plotGroups[0].productRef).toBe('P80140');
    expect(plan.plotGroups[0].quantity).toBe(98);
  });

  it('calcule la structure de base avec une seule lambourde sur la jonction', () => {
    const plan = computeSupportPlan(base, computeLayout(base));
    expect(plan.joistLinearM).toBeCloseTo(56, 6);
    expect(plan.doubleJoistLinearM).toBe(0);
    expect(plan.joistStockBoards).toHaveLength(28);
  });

  it('double les lambourdes et les appuis de jonction uniquement quand l’option est activée', () => {
    const project: ProjectInput = { ...base, doubleJoistsAtButtJoints: true };
    const plan = computeSupportPlan(project, computeLayout(project));

    expect(plan.buttJointAxisPositionsMm).toEqual([5400]);
    expect(plan.joistSegments.filter((segment) => segment.multiplicity === 2)).toHaveLength(1);
    expect(plan.joistLinearM).toBeCloseTo(60, 6);
    expect(plan.doubleJoistLinearM).toBeCloseTo(4, 6);
    expect(plan.joistStockBoards).toHaveLength(30);
    expect(plan.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0)).toBe(105);
  });

  it('utilise plusieurs gammes de plots quand le support présente 80 mm d’écart de niveau', () => {
    const project: ProjectInput = {
      ...base,
      supportLevelProfile: {
        ...base.supportLevelProfile!,
        mode: 'four-corners',
        topRightDeltaMm: 80,
        bottomRightDeltaMm: 80,
      },
    };
    const plan = computeSupportPlan(project, computeLayout(project));

    expect(plan.status).toBe('exact');
    expect(plan.minRequiredPlotHeightMm).toBeCloseTo(53, 5);
    expect(plan.maxRequiredPlotHeightMm).toBeCloseTo(133, 5);
    expect(plan.plotGroups.length).toBeGreaterThanOrEqual(3);
    expect(plan.plotGroups.some((group) => group.productRef === 'P40060')).toBe(true);
    expect(plan.plotGroups.some((group) => group.productRef === 'P80140')).toBe(true);
    expect(plan.plotGroups.some((group) => group.productRef === 'YEE060090')).toBe(true);
  });

  it('signale les hauteurs hors gamme au lieu d’inventer un plot', () => {
    const project: ProjectInput = {
      ...base,
      supportLevelProfile: {
        ...base.supportLevelProfile!,
        targetSlopeXPercent: 3,
      },
    };
    const plan = computeSupportPlan(project, computeLayout(project));

    expect(plan.minRequiredPlotHeightMm).toBeCloseTo(133, 5);
    expect(plan.maxRequiredPlotHeightMm).toBeCloseTo(313, 5);
    expect(plan.status).toBe('partial');
    expect(plan.unsupportedPointCount).toBeGreaterThan(0);
  });

  it('ajoute des appuis autour d’une réservation qui coupe des lambourdes', () => {
    const withPool: ProjectInput = {
      ...base,
      obstacles: [{
        id: 'POOL',
        kind: 'pool',
        label: 'Piscine',
        shape: 'rectangle',
        xM: 2,
        yM: 1,
        widthM: 1,
        heightM: 1,
      }],
    };
    const basePlan = computeSupportPlan(base, computeLayout(base));
    const poolPlan = computeSupportPlan(withPool, computeLayout(withPool));

    expect(poolPlan.joistSegments.length).toBeGreaterThan(basePlan.joistSegments.length);
    expect(poolPlan.supportPoints.some((point) =>
      point.xM > 2 && point.xM < 3 && point.yM > 1 && point.yM < 2
    )).toBe(false);
  });

  it('injecte les quantités structurelles de base dans le panier sans double lambourdage', () => {
    const result = runConfigurator(base);
    const joists = result.basket?.lines.find((line) => line.id === 'joists');
    const plotLines = result.basket?.lines.filter((line) => line.family === 'supports' && line.status === 'exact') ?? [];

    expect(result.supportPlan?.status).toBe('exact');
    expect(joists?.quantity).toBe(28);
    expect(joists?.note).toContain('double lambourdage désactivé');
    expect(plotLines.reduce((sum, line) => sum + (line.quantity ?? 0), 0)).toBe(98);
    expect(result.basket?.status).toBe('complete');
  });

  it('recalcule le panier lorsque le double lambourdage est activé', () => {
    const project: ProjectInput = { ...base, doubleJoistsAtButtJoints: true };
    const result = runConfigurator(project);
    const joists = result.basket?.lines.find((line) => line.id === 'joists');
    const plotLines = result.basket?.lines.filter((line) => line.family === 'supports' && line.status === 'exact') ?? [];

    expect(joists?.quantity).toBe(30);
    expect(joists?.note).toContain('double lambourdage activé');
    expect(plotLines.reduce((sum, line) => sum + (line.quantity ?? 0), 0)).toBe(105);
  });

  it('conserve les niveaux et l’option double lambourdage dans le partage V0.16', () => {
    const project: ProjectInput = {
      ...base,
      doubleJoistsAtButtJoints: true,
      supportLevelProfile: {
        mode: 'four-corners',
        topLeftDeltaMm: 0,
        topRightDeltaMm: 12,
        bottomRightDeltaMm: 26,
        bottomLeftDeltaMm: 8,
        targetSlopeXPercent: 0.5,
        targetSlopeYPercent: -0.2,
      },
    };
    const token = projectToShareToken(project);
    const restored = projectFromShareToken(token, base);
    expect(restored.supportLevelProfile).toEqual(project.supportLevelProfile);
    expect(restored.doubleJoistsAtButtJoints).toBe(true);
  });

  it('n’active pas le plan précis pour une gamme dont la structure compatible reste à valider', () => {
    const cumaru = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G005')!;
    const project: ProjectInput = { ...base, board: cumaru };
    const plan = computeSupportPlan(project, computeLayout(project));
    expect(plan.status).toBe('unavailable');
    expect(plan.note).toContain('section de lambourde');
  });
});
