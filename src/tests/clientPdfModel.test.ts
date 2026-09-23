import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildClientPdfModel } from '../pdf/clientPdfModel';

const project: ProjectInput = {
  projectName: 'Terrasse famille',
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

describe('PDF client V0.10', () => {
  it('reprend le meme panier que le configurateur', () => {
    const result = runConfigurator(project);
    const model = buildClientPdfModel(project, result, 'IB-TERR-VERSION-010', '21/09/2026');

    expect(model.projectName).toBe('Terrasse famille');
    expect(model.surface).toContain('24');
    expect(model.lines.length).toBe(result.basket?.lines.length);
    expect(model.budgetValue).toContain('EUR');
    expect(model.generatedAt).toBe('21/09/2026');
    expect(model.layingPattern).toBe('Pose entiere / droite');
    expect(model.edgeDimensions).toContain('AB : 6 m');
    expect(model.boardLayout).toContain('rangees');
    expect(model.structureSummary).toContain('lambourdes');
    expect(model.plotSummary).toContain('appuis');
    expect(model.sources.length).toBeGreaterThan(0);
    const deckingLine = model.lines.find((line) => line.family === 'Lames');
    expect(deckingLine?.detail).toContain('Longueurs a commander');
    expect(deckingLine?.detail).toMatch(/TSL|SKU/);
    expect(model.stockSummary).toContain('lames commerciales');
  });

  it('décrit les diagonales et les zones de pose dans le dossier technique', () => {
    const zoned: ProjectInput = {
      ...project,
      layingDirection: 'diagonal-45',
      layingStart: 'right',
      layingZones: [{
        id: 'Z-PDF',
        label: 'Zone PDF',
        points: [{ xM: 1, yM: 1 }, { xM: 2.5, yM: 1 }, { xM: 2.5, yM: 2.5 }, { xM: 1, yM: 2.5 }],
        direction: 'width',
        pattern: 'half',
        start: 'top',
      }],
    };
    const result = runConfigurator(zoned);
    const model = buildClientPdfModel(zoned, result, 'IB-TERR-VERSION-020.0', '23/09/2026');
    expect(model.orientation).toBe('Diagonale +45 deg');
    expect(model.boardLayout).toContain('2 zone(s) de pose');
    expect(model.structureSummary).toContain('separation(s) de zone');
  });

  it('signale les lignes a confirmer sans les transformer en prix', () => {
    const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G001')!;
    const result = runConfigurator({ ...project, board, edgeFinishMode: 'full-perimeter' });
    const model = buildClientPdfModel({ ...project, board, edgeFinishMode: 'full-perimeter' }, result, 'IB-TERR-VERSION-010', '21/09/2026');

    expect(model.basketStatus).toBe('partial');
    expect(model.lines.some((line) => line.status === 'a-confirmer')).toBe(true);
    expect(model.clientNote.toLowerCase()).toContain('confirmer');
  });

  it('ne contient aucune rubrique de main-d oeuvre ou de duree', () => {
    const result = runConfigurator(project);
    const model = buildClientPdfModel(project, result, 'IB-TERR-VERSION-010', '21/09/2026');
    const payload = JSON.stringify(model).toLowerCase();

    expect(payload).not.toContain('main-d oeuvre');
    expect(payload).not.toContain('heures');
    expect(payload).not.toContain('duree de chantier');
    expect(payload).not.toContain('labor');
  });
});
