import { describe, expect, it } from 'vitest';
import { demoBoards, demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { optimizeCuts } from '../engine/cuts';

const base: ProjectInput = {
  projectName: 'Test particulier',
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
  board: demoBoards[0],
  joist: demoJoist,
  usage: 'residential',
};

describe('Configurateur terrasse V0.9', () => {
  it('conserve le scénario normatif de régression V0.6', () => {
    const result = runConfigurator(base);
    expect(result.valid).toBe(true);
    expect(result.geometry?.areaM2).toBe(24);
    expect(result.geometry?.perimeterM).toBe(20);
    expect(result.structure?.joistMaxSpacingMm).toBe(670);
  });

  it('calcule la surface d’une forme en L', () => {
    const result = runConfigurator({ ...base, shape: 'l-shape' });
    expect(result.geometry?.areaM2).toBe(22);
  });

  it('charge le catalogue réel IDEA Bois regroupé', () => {
    expect(ideaBoisBoards.length).toBe(38);
    expect(ideaBoisBoards.every((board) => board.isDemo === false)).toBe(true);
  });

  it('produit un panier matériel complet pour le Pin du Nord 145x27 sur plots compatibles', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;
    const result = runConfigurator({ ...base, board });
    expect(result.layout).toBeDefined();
    expect(result.basket?.status).toBe('complete');
    expect(result.basket?.totalTtc).toBeGreaterThan(0);

    const joists = result.basket?.lines.find((line) => line.id === 'joists');
    const supports = result.basket?.lines.filter((line) => line.family === 'supports' && line.status === 'exact') ?? [];
    const fixings = result.basket?.lines.find((line) => line.id === 'fixings');
    const protection = result.basket?.lines.find((line) => line.id === 'protection');

    expect(joists?.quantity).toBe(28);
    expect(supports.reduce((sum, line) => sum + (line.quantity ?? 0), 0)).toBe(98);
    expect(fixings?.quantity).toBe(5);
    expect(protection?.quantity).toBe(3);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-GAP-001')).toBe(false);
  });

  it('conserve le panier commercial même si la validation normative finale bloque', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;
    const result = runConfigurator({ ...base, board });
    expect(result.valid).toBe(false);
    expect(result.basket?.status).toBe('complete');
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-LAME-010')).toBe(true);
  });

  it('affiche les familles manquantes au lieu de les masquer pour une lame sans jeu validé', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G001')!;
    const result = runConfigurator({ ...base, board });
    expect(result.basket?.lines.some((line) => line.family === 'joists')).toBe(true);
    expect(result.basket?.lines.some((line) => line.family === 'supports')).toBe(true);
    expect(result.basket?.lines.some((line) => line.family === 'fixings')).toBe(true);
    expect(result.basket?.status).toBe('partial');
  });

  it('applique le jeu et les clips publiés à la gamme SILVADEC Atmosphère', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G038')!;
    const result = runConfigurator({ ...base, board });
    expect(board.gapMm).toBe(5);
    const clips = result.basket?.lines.find((line) => line.id === 'fixings');
    expect(clips?.status).toBe('exact');
    expect(clips?.quantity).toBe(Math.ceil((24 * 18) / 30));
    expect(result.basket?.status).toBe('partial');
  });

  it('ajoute exactement le géotextile demandé sur sol stabilisé', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;
    const result = runConfigurator({
      ...base,
      board,
      supportType: 'stabilized-ground',
      includeGeotextile: true,
    });
    const geotextile = result.basket?.lines.find((line) => line.id === 'geotextile');
    expect(geotextile?.status).toBe('exact');
    expect(geotextile?.quantity).toBe(2);
    expect(geotextile?.totalTtc).toBeCloseTo(69, 2);
  });

  it('ajoute la jupe SILVADEC comme finition informative quand tout le pourtour est demandé', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G038')!;
    const result = runConfigurator({
      ...base,
      board,
      edgeFinishMode: 'full-perimeter',
    });
    const finish = result.basket?.lines.find((line) => line.id === 'edge-finish');
    const finishScrews = result.basket?.lines.find((line) => line.id === 'edge-finish-screws');
    expect(finish?.status).toBe('informative');
    expect(finish?.quantity).toBe(10);
    expect(finishScrews?.status).toBe('informative');
    expect(result.basket?.status).toBe('partial');
  });

  it('utilise la même lame pour l’habillage bois et ajoute les lambourdes verticales', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;
    const result = runConfigurator({
      ...base,
      board,
      edgeFinishMode: 'full-perimeter',
      edgeCladdingHeightCm: 20,
    });
    const finish = result.basket?.lines.find((line) => line.id === 'edge-finish');
    const vertical = result.basket?.lines.find((line) => line.id === 'edge-vertical-joists');
    expect(finish?.status).toBe('exact');
    expect(finish?.productRef).toBe(board.catalog?.internalCodes.join(', '));
    expect(finish?.totalTtc).toBeGreaterThan(0);
    expect(vertical?.status).toBe('exact');
    expect(vertical?.quantity).toBeGreaterThan(0);
  });

  it('optimise sur plusieurs longueurs commerciales autorisées', () => {
    const boards = optimizeCuts([
      { id: 'A', rowIndex: 0, lengthMm: 4100 },
      { id: 'B', rowIndex: 1, lengthMm: 3000 },
    ], [3000, 4200, 5400]);
    expect(boards.some((board) => board.stockLengthMm === 4200)).toBe(true);
    expect(boards.every((board) => [3000, 4200, 5400].includes(board.stockLengthMm))).toBe(true);
  });

  it('bloque un produit composite démo sans règles fabricant', () => {
    const result = runConfigurator({ ...base, board: demoBoards[1] });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.tag === 'SA-TERR-SYSTEM-001' && d.severity === 'blocking')).toBe(true);
  });

  it('n’expose aucun calcul de main-d’œuvre', () => {
    const result = runConfigurator(base) as unknown as Record<string, unknown>;
    expect('labor' in result).toBe(false);
    expect('hours' in result).toBe(false);
    expect('laborCost' in result).toBe(false);
  });
});
