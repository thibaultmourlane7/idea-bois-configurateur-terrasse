import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { computeLayout } from '../engine/layout';
import { computeSupportPlan } from '../engine/supportPlan';
import { computeStructure } from '../engine/structure';

const pin = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint A structure',
  shape: 'rectangle',
  dimensions: { lengthM: 6, widthM: 4, notchLengthM: 2, notchWidthM: 1, circleDiameterM: 5, tStemWidthM: 2.5, tBarDepthM: 1.5, uOpeningWidthM: 2, uOpeningDepthM: 2 },
  obstacles: [],
  heightCm: 20,
  supportLevelProfile: { mode: 'flat', topLeftDeltaMm: 0, topRightDeltaMm: 0, bottomRightDeltaMm: 0, bottomLeftDeltaMm: 0, targetSlopeXPercent: 0, targetSlopeYPercent: 0 },
  doubleJoistsAtButtJoints: true,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingDirection: 'diagonal-45',
  layingStart: 'left',
  layingPattern: 'half',
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

describe('Sprint A V0.20 — structure liée au calepinage', () => {
  it('génère des lambourdes perpendiculaires aux lames diagonales et des plots réels', () => {
    const layout = computeLayout(base);
    const plan = computeSupportPlan(base, layout);
    expect(plan.status).toBe('exact');
    const field = plan.joistSegments.find((segment) => segment.role === 'field' || segment.role === 'butt-joint')!;
    expect(field).toBeDefined();
    const dx = field.x2M - field.x1M;
    const dy = field.y2M - field.y1M;
    expect(Math.abs(Math.abs(dx) - Math.abs(dy))).toBeLessThan(0.01);
    expect(dx * dy).toBeLessThanOrEqual(0);
    expect(plan.supportPoints.length).toBeGreaterThan(0);
  });

  it('ajoute une structure de séparation quand une zone locale change de sens', () => {
    const project: ProjectInput = {
      ...base,
      layingDirection: 'length',
      layingPattern: 'straight',
      doubleJoistsAtButtJoints: false,
      layingZones: [{
        id: 'Z2',
        label: 'Zone centrale',
        points: [{ xM: 2, yM: 1 }, { xM: 4, yM: 1 }, { xM: 4, yM: 3 }, { xM: 2, yM: 3 }],
        direction: 'width',
        pattern: 'straight',
        start: 'top',
      }],
    };
    const layout = computeLayout(project);
    const plan = computeSupportPlan(project, layout);
    expect(plan.joistSegments.some((segment) => segment.role === 'zone-boundary' && segment.zoneId === 'Z2')).toBe(true);
    expect(plan.joistSegments.some((segment) => segment.zoneId === 'main' && segment.role === 'field')).toBe(true);
    expect(plan.joistSegments.some((segment) => segment.zoneId === 'Z2' && segment.role === 'field')).toBe(true);
  });

  it('calcule la structure normative à partir des mêmes zones de calepinage', () => {
    const layout = computeLayout(base);
    const structure = computeStructure(base, 500, 700, layout);
    expect(structure.joistLines.length).toBeGreaterThan(0);
    expect(structure.joistActualSpacingMm).toBeLessThanOrEqual(500.001);
    expect(structure.fixingCount).toBeGreaterThan(0);
  });
});
