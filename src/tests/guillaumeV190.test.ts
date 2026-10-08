import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput, StructureJoistChoice } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import { searchAngelTerraceKnowledge } from '../knowledge/angelTerraceKnowledge';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

const base: ProjectInput = {
  projectName: 'Sprint Guillaume V1.9',
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
  boardSelectionConfirmed: true,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeConfigs: [],
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'unknown',
  orientation: 'length',
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'straight',
  layingZones: [],
  stairs: [],
  guardrails: [],
  board: board('IDEA-TERR-G027'),
  joist: demoJoist,
  usage: 'residential',
};

describe('V1.9 — corrections Guillaume', () => {
  it('bloque le calcul lorsqu’une lame a été explicitement désélectionnée', () => {
    const result = runConfigurator({ ...base, boardSelectionConfirmed: false });

    expect(result.valid).toBe(false);
    expect(result.layout).toBeUndefined();
    expect(result.basket).toBeUndefined();
    expect(result.diagnostics.some((item) => item.tag === 'SA-TERR-BOARD-SELECT-001')).toBe(true);
  });

  it('ne remplace jamais silencieusement plusieurs essences par le Pin du Nord', () => {
    const scenarios: Array<{ id: string; structureJoistChoice?: StructureJoistChoice }> = [
      { id: 'IDEA-TERR-G027' },
      { id: 'IDEA-TERR-G005' },
      { id: 'IDEA-TERR-G008', structureJoistChoice: 'pin-class4' },
      { id: 'IDEA-TERR-G011' },
      { id: 'IDEA-TERR-G015', structureJoistChoice: 'pin-class4' },
      { id: 'IDEA-TERR-G002', structureJoistChoice: 'manufacturer-recommended' },
      { id: 'IDEA-TERR-G038', structureJoistChoice: 'manufacturer-recommended' },
    ];

    for (const scenario of scenarios) {
      const selected = board(scenario.id);
      const result = runConfigurator({
        ...base,
        board: selected,
        structureJoistChoice: scenario.structureJoistChoice,
      });

      expect(result.layout, selected.label).toBeDefined();
      expect(result.layout?.productSummaries[0]?.boardId, selected.label).toBe(selected.id);
      expect(result.basket?.lines.find((line) => line.id === 'decking')?.label, selected.label).toContain(selected.label);
    }
  });

  it('oriente réellement le point de départ des lambourdes sans modifier leur quantité', () => {
    const top = runConfigurator({ ...base, joistEntrySide: 'top' });
    const bottom = runConfigurator({ ...base, joistEntrySide: 'bottom' });

    const topField = top.supportPlan?.joistSegments.find((segment) => segment.role === 'field' || segment.role === 'butt-joint');
    const bottomField = bottom.supportPlan?.joistSegments.find((segment) => segment.role === 'field' || segment.role === 'butt-joint');

    expect(topField).toBeDefined();
    expect(bottomField).toBeDefined();
    expect(topField!.y1M).toBeLessThanOrEqual(topField!.y2M);
    expect(bottomField!.y1M).toBeGreaterThanOrEqual(bottomField!.y2M);
    expect(top.supportPlan?.joistStockBoards.length).toBe(bottom.supportPlan?.joistStockBoards.length);
    expect(top.supportPlan?.supportPoints.length).toBe(bottom.supportPlan?.supportPoints.length);
  });

  it('conserve le prix des éléments calculés lorsqu’une rive courbe reste à confirmer', () => {
    const circle: ProjectInput = {
      ...base,
      shape: 'circle',
      dimensions: { ...base.dimensions, circleDiameterM: 5 },
    };
    const result = runConfigurator(circle);

    expect(result.supportPlan?.pendingCurvedPerimeter).toBe(true);

    const joists = result.basket?.lines.find((line) => line.id === 'joists');
    const protection = result.basket?.lines.find((line) => line.id === 'protection');
    const exactSupports = result.basket?.lines.filter((line) => line.family === 'supports' && line.status === 'exact') ?? [];

    expect(joists?.status).toBe('exact');
    expect(joists?.totalTtc).toBeGreaterThan(0);
    expect(protection?.status).toBe('exact');
    expect(protection?.totalTtc).toBeGreaterThan(0);
    expect(exactSupports.length).toBeGreaterThan(0);

    expect(result.basket?.lines.find((line) => line.id === 'joists-curved-perimeter')?.status).toBe('pending');
    expect(result.basket?.lines.find((line) => line.id === 'protection-curved-perimeter')?.status).toBe('pending');
    expect(result.basket?.lines.find((line) => line.id === 'supports-curved-perimeter')?.status).toBe('pending');
    expect(result.basket?.status).toBe('partial');
    expect(result.basket?.knownSubtotalTtc).toBeGreaterThan(0);
  });

  it('conserve sélection, structure fabricant et départ des lambourdes dans un lien partagé', () => {
    const source: ProjectInput = {
      ...base,
      board: board('IDEA-TERR-G038'),
      boardSelectionConfirmed: true,
      structureJoistChoice: 'manufacturer-recommended',
      joistEntrySide: 'left',
    };

    const restored = projectFromShareToken(projectToShareToken(source), base);
    expect(restored.board.id).toBe('IDEA-TERR-G038');
    expect(restored.boardSelectionConfirmed).toBe(true);
    expect(restored.structureJoistChoice).toBe('manufacturer-recommended');
    expect(restored.joistEntrySide).toBe('left');
  });

  it('met à jour la base Ángel avec les corrections Guillaume', () => {
    expect(searchAngelTerraceKnowledge('rive courbe lambourde panier').some((entry) => entry.id === 'curved-structure-partial-v190')).toBe(true);
    expect(searchAngelTerraceKnowledge('désélection lame').some((entry) => entry.id === 'board-selection-v190')).toBe(true);
  });
});
