import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { runConfigurator } from '../engine/configurator';

const pin = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;
const bamboo = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G002')!;

const base: ProjectInput = {
  projectName: '3D V0.19',
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
  layingPattern: 'half',
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

describe('Construction visuelle 3D V0.19', () => {
  it('reprend la structure réelle sur une forme libre avec réservation', () => {
    const project: ProjectInput = {
      ...base,
      shape: 'freeform',
      freeformPoints: [
        { xM: 0, yM: 0 },
        { xM: 6, yM: 0 },
        { xM: 5, yM: 4 },
        { xM: 0, yM: 4 },
      ],
      obstacles: [{ id: 'POOL', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: 2, yM: 1, widthM: 2.5, heightM: 1.5 }],
    };
    const result = runConfigurator(project);
    const visual = buildConstructionVisual(project, result.basket, result.supportPlan);
    expect(visual.joists.length).toBe(result.supportPlan?.joistSegments.length);
    expect(visual.plots.length).toBe(result.supportPlan?.supportPoints.length);
    expect(visual.joists.some((segment) => segment.role === 'perimeter')).toBe(true);
  });

  it('ne crée aucune trame fictive pour le Bambou dont la structure reste à confirmer', () => {
    const project: ProjectInput = { ...base, board: bamboo };
    const result = runConfigurator(project);
    const visual = buildConstructionVisual(project, result.basket, result.supportPlan);
    expect(result.supportPlan?.status).toBe('unavailable');
    expect(visual.joists).toHaveLength(0);
    expect(visual.plots).toHaveLength(0);
  });

  it('conserve le double lambourdage réel dans le modèle visuel', () => {
    const project: ProjectInput = { ...base, doubleJoistsAtButtJoints: true };
    const result = runConfigurator(project);
    const visual = buildConstructionVisual(project, result.basket, result.supportPlan);
    expect(visual.joists.some((segment) => segment.multiplicity === 2)).toBe(true);
  });
});
