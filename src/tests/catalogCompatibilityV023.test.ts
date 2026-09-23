import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import {
  canUseBoardInZone,
  compatibilityMatrix,
  compatibleZoneBoards,
  getProductCompatibility,
} from '../catalog/compatibility';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;
const pin = board('IDEA-TERR-G027');

const base: ProjectInput = {
  projectName: 'Sprint D compatibilités',
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
  edgeConfigs: [],
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'straight',
  layingZones: [],
  board: pin,
  joist: demoJoist,
  usage: 'residential',
};

describe('Sprint D V0.23 — catalogue métier et compatibilités', () => {
  it('couvre les 38 références sans masquer les données manquantes', () => {
    const matrix = compatibilityMatrix();
    expect(matrix).toHaveLength(38);
    expect(new Set(matrix.map((item) => item.boardId)).size).toBe(38);

    const pinProfile = getProductCompatibility(pin);
    expect(pinProfile.layout.state).toBe('validated');
    expect(pinProfile.structure.state).toBe('validated');
    expect(pinProfile.fixings.state).toBe('validated');
    expect(pinProfile.supports.state).toBe('validated');

    const silvadec = getProductCompatibility(board('IDEA-TERR-G037'));
    expect(silvadec.layout.state).toBe('validated');
    expect(silvadec.supports.state).toBe('partial');

    const bamboo = getProductCompatibility(board('IDEA-TERR-G001'));
    expect(bamboo.layout.state).toBe('missing');
    expect(bamboo.structure.state).toBe('partial');

    const merbau = getProductCompatibility(board('IDEA-TERR-G012'));
    expect(merbau.structure.state).toBe('missing');
    expect(merbau.fixings.state).toBe('missing');
  });

  it('autorise uniquement une variante du même système constructif dans une zone', () => {
    const pinStrie = board('IDEA-TERR-G028');
    const cumaru = board('IDEA-TERR-G005');

    expect(canUseBoardInZone(pin, pinStrie).allowed).toBe(true);
    expect(canUseBoardInZone(pin, cumaru).allowed).toBe(false);
    expect(compatibleZoneBoards(pin).map((item) => item.id)).toEqual(expect.arrayContaining([
      'IDEA-TERR-G027',
      'IDEA-TERR-G028',
      'IDEA-TERR-G030',
      'IDEA-TERR-G031',
    ]));
    expect(compatibleZoneBoards(pin).map((item) => item.id)).not.toContain('IDEA-TERR-G005');
  });

  it('calcule séparément les achats de deux lames compatibles utilisées par zone', () => {
    const pinStrie = board('IDEA-TERR-G028');
    const project: ProjectInput = {
      ...base,
      layingZones: [{
        id: 'ZONE-B',
        label: 'Zone B',
        points: [
          { xM: 3, yM: 1 },
          { xM: 5, yM: 1 },
          { xM: 5, yM: 3 },
          { xM: 3, yM: 3 },
        ],
        direction: 'width',
        pattern: 'straight',
        start: 'left',
        boardId: pinStrie.id,
      }],
    };

    const result = runConfigurator(project);
    expect(result.valid).toBe(true);
    expect(result.layout?.productSummaries).toHaveLength(2);
    expect(result.layout?.zones.find((zone) => zone.id === 'ZONE-B')?.boardId).toBe(pinStrie.id);

    const ids = result.layout?.productSummaries.map((summary) => summary.boardId) ?? [];
    expect(ids).toEqual(expect.arrayContaining([pin.id, pinStrie.id]));

    for (const summary of result.layout?.productSummaries ?? []) {
      const product = board(summary.boardId);
      expect(summary.stockBoards.every((stock) => product.availableLengthsMm?.includes(stock.stockLengthMm))).toBe(true);
    }

    const deckingLines = result.basket?.lines.filter((line) => line.family === 'decking') ?? [];
    expect(deckingLines).toHaveLength(2);
    expect(deckingLines.every((line) => line.status === 'exact')).toBe(true);
    expect(result.basket?.totalTtc).toBeGreaterThan(0);
  });

  it('bloque un changement de famille produit non validé entre zones', () => {
    const project: ProjectInput = {
      ...base,
      layingZones: [{
        id: 'ZONE-CUMARU',
        label: 'Zone Cumaru',
        points: [
          { xM: 3, yM: 1 },
          { xM: 5, yM: 1 },
          { xM: 5, yM: 3 },
          { xM: 3, yM: 3 },
        ],
        direction: 'width',
        pattern: 'straight',
        start: 'left',
        boardId: 'IDEA-TERR-G005',
      }],
    };

    const result = runConfigurator(project);
    expect(result.valid).toBe(false);
    expect(result.layout).toBeUndefined();
    expect(result.diagnostics.some((item) => item.tag === 'SA-TERR-COMPAT-ZONE-002' && item.severity === 'blocking')).toBe(true);
  });

  it('ne mélange jamais l’optimisation des chutes entre deux références', () => {
    const project: ProjectInput = {
      ...base,
      layingZones: [{
        id: 'ZONE-B',
        label: 'Zone B',
        points: [
          { xM: 2.5, yM: 1 },
          { xM: 5.5, yM: 1 },
          { xM: 5.5, yM: 3 },
          { xM: 2.5, yM: 3 },
        ],
        direction: 'length',
        pattern: 'half',
        start: 'left',
        boardId: 'IDEA-TERR-G028',
      }],
    };

    const result = runConfigurator(project);
    const summaries = result.layout?.productSummaries ?? [];
    expect(summaries).toHaveLength(2);
    expect(summaries.every((summary) =>
      summary.cutOptimization.totalStockMm === summary.stockBoards.reduce((sum, stock) => sum + stock.stockLengthMm, 0)
    )).toBe(true);
    expect(new Set(result.layout?.stockBoards.map((stock) => stock.id)).size).toBe(result.layout?.stockBoards.length);
  });
});
