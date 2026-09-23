import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput, ShapeType } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildClientPdfModel } from '../pdf/clientPdfModel';
import { buildSiteDossierModel } from '../pdf/siteDossierModel';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

const base = (overrides: Partial<ProjectInput> = {}): ProjectInput => ({
  projectName: 'Recette V1',
  shape: 'rectangle',
  dimensions: {
    lengthM: 6,
    widthM: 4,
    notchLengthM: 2,
    notchWidthM: 1.5,
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
  doubleJoistsAtButtJoints: true,
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
  layingZones: [],
  layingPattern: 'straight',
  board: board('IDEA-TERR-G027'),
  joist: demoJoist,
  usage: 'residential',
  ...overrides,
});

function expectCoreCalculated(project: ProjectInput) {
  const result = runConfigurator(project);
  expect(result.geometry).toBeDefined();
  expect(result.geometry!.areaM2).toBeGreaterThan(0);
  expect(result.layout).toBeDefined();
  expect(result.layout!.boardSegments.length).toBeGreaterThan(0);
  expect(result.layout!.stockBoards.length).toBeGreaterThan(0);
  expect(result.supportPlan).toBeDefined();
  expect(result.supportPlan!.joistSegments.length).toBeGreaterThan(0);
  expect(result.basket).toBeDefined();
  expect(result.basket!.lines.some((line) => line.family === 'decking')).toBe(true);
  const dossier = buildSiteDossierModel(project, result, 'IB-TERR-VERSION-1.0.0', '23/09/2026');
  expect(dossier.purchaseList.length).toBeGreaterThan(0);
  expect(dossier.cutList.length).toBeGreaterThan(0);
  expect(dossier.planManifest).toEqual(['general', 'boards', 'structure', 'supports', 'cuts', 'finishes']);
  return { result, dossier };
}

describe('Sprint F — Recette V1.0 professionnelle', () => {
  describe('géométries', () => {
    const cases: Array<[string, ProjectInput]> = [
      ['rectangle simple', base()],
      ['grande terrasse', base({ dimensions: { ...base().dimensions, lengthM: 12, widthM: 8 } })],
      ['forme L', base({ shape: 'l-shape' })],
      ['forme T', base({ shape: 't-shape' })],
      ['forme U', base({ shape: 'u-shape' })],
      ['forme libre', base({
        shape: 'freeform',
        freeformPoints: [
          { xM: 0, yM: 0 },
          { xM: 6, yM: 0 },
          { xM: 6, yM: 4 },
          { xM: 4, yM: 4 },
          { xM: 3, yM: 3 },
          { xM: 0, yM: 4 },
        ],
      })],
      ['cercle', base({ shape: 'circle' })],
    ];

    it.each(cases)('%s calcule toute la chaîne de base', (_name, project) => {
      expectCoreCalculated(project);
    });
  });

  describe('réservations chantier', () => {
    const cases: Array<[string, ProjectInput['obstacles'][number]]> = [
      ['piscine', { id: 'POOL', kind: 'pool', label: 'Piscine', shape: 'rectangle', xM: 1, yM: 1, widthM: 2, heightM: 1.5 }],
      ['arbre', { id: 'TREE', kind: 'tree', label: 'Arbre', shape: 'circle', xM: 2, yM: 1.5, diameterM: .8 }],
      ['poteau', { id: 'POST', kind: 'post', label: 'Poteau', shape: 'rectangle', xM: 2.5, yM: 2, widthM: .25, heightM: .25 }],
      ['réservation débordante', { id: 'OVER', kind: 'other', label: 'Réservation débordante', shape: 'rectangle', xM: -.35, yM: 1, widthM: 1, heightM: 1 }],
    ];

    it.each(cases)('%s impacte ou intersecte la géométrie sans casser le moteur', (_name, obstacle) => {
      const project = base({ obstacles: [obstacle] });
      const { result } = expectCoreCalculated(project);
      expect(result.geometry!.excludedAreaM2).toBeGreaterThan(0);
      expect(result.geometry!.areaM2).toBeLessThan(result.geometry!.grossAreaM2);
    });
  });

  describe('modes de pose', () => {
    it.each([
      ['entière', 'straight'],
      ['décalée 1/2', 'half'],
      ['décalée 1/3', 'third'],
    ] as const)('%s', (_name, pattern) => {
      const { result } = expectCoreCalculated(base({ layingPattern: pattern }));
      expect(result.layout!.zones[0].pattern).toBe(pattern);
    });

    it.each([
      ['diagonale +45°', 'diagonal-45'],
      ['diagonale -45°', 'diagonal--45'],
    ] as const)('%s calcule de vrais segments', (_name, direction) => {
      const { result } = expectCoreCalculated(base({ layingDirection: direction }));
      expect(result.layout!.zones[0].direction).toBe(direction);
      expect(result.layout!.boardSegments.some((segment) =>
        segment.dirX != null && segment.dirY != null && Math.abs(segment.dirX) > .1 && Math.abs(segment.dirY) > .1
      )).toBe(true);
    });
  });

  describe('longueurs commerciales et produits', () => {
    it('utilise plusieurs longueurs commerciales quand le produit en dispose', () => {
      const { result } = expectCoreCalculated(base({ dimensions: { ...base().dimensions, lengthM: 9.3, widthM: 4.4 } }));
      const allowed = new Set(board('IDEA-TERR-G027').availableLengthsMm);
      expect(result.layout!.stockBoards.every((stock) => allowed.has(stock.stockLengthMm))).toBe(true);
      expect(new Set(result.layout!.stockBoards.map((stock) => stock.stockLengthMm)).size).toBeGreaterThan(1);
    });

    it.each([
      ['Pin du Nord', 'IDEA-TERR-G027'],
      ['Cumaru', 'IDEA-TERR-G005'],
      ['Ipé', 'IDEA-TERR-G011'],
      ['SILVADEC', 'IDEA-TERR-G037'],
    ])('%s dispose au minimum d’un calepinage et d’un panier traçables', (_name, boardId) => {
      const project = base({ board: board(boardId) });
      const result = runConfigurator(project);
      expect(result.geometry).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.layout!.productSummaries[0].boardId).toBe(boardId);
      expect(result.basket).toBeDefined();
      expect(result.basket!.lines.some((line) => line.family === 'decking')).toBe(true);
      buildClientPdfModel(project, result, 'IB-TERR-VERSION-1.0.0', '23/09/2026');
      buildSiteDossierModel(project, result, 'IB-TERR-VERSION-1.0.0', '23/09/2026');
    });

    it.each([
      ['Garapa', 'IDEA-TERR-G008'],
      ['Padouk', 'IDEA-TERR-G015'],
    ])('%s reste bloqué explicitement tant que le jeu de pose exact manque', (_name, boardId) => {
      const project = base({ board: board(boardId) });
      const result = runConfigurator(project);
      expect(result.geometry).toBeDefined();
      expect(result.layout).toBeUndefined();
      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((item) => item.tag === 'SA-TERR-GAP-001' && item.severity === 'blocking')).toBe(true);
      expect(result.trace.some((line) => line.includes('aucune valeur inventée') || line.includes('validation'))).toBe(true);
    });
  });

  describe('niveaux, rives et habillages', () => {
    it('recalcule les hauteurs de plots sur un support quatre coins avec pente finie', () => {
      const project = base({
        supportLevelProfile: {
          mode: 'four-corners',
          topLeftDeltaMm: 0,
          topRightDeltaMm: 20,
          bottomRightDeltaMm: 35,
          bottomLeftDeltaMm: 10,
          targetSlopeXPercent: 1,
          targetSlopeYPercent: .5,
        },
        heightCm: 30,
      });
      const { result } = expectCoreCalculated(project);
      const heights = result.supportPlan!.supportPoints.map((point) => point.requiredPlotHeightMm);
      expect(Math.max(...heights)).toBeGreaterThan(Math.min(...heights));
    });

    it('gère les rives métier et l’habillage partiel', () => {
      const project = base({
        edgeFinishMode: 'per-edge',
        edgeConfigs: [
          { edgeIndex: 0, context: 'wall', treatment: 'profile', note: 'Mur maison' },
          { edgeIndex: 1, context: 'facade', treatment: 'cladding' },
          { edgeIndex: 2, context: 'threshold', treatment: 'drainage' },
          { edgeIndex: 3, context: 'access', treatment: 'edge-board' },
        ],
      });
      const { result, dossier } = expectCoreCalculated(project);
      expect(result.edges).toHaveLength(4);
      expect(result.edges!.filter((edge) => edge.treatment !== 'none')).toHaveLength(4);
      expect(dossier.edges.find((edge) => edge.label === 'AB')?.context).toBe('Contre mur');
      expect(dossier.purchaseList.some((line) => line.id === 'edge-treatment-profile')).toBe(true);
    });
  });

  describe('zones et recalcul transversal', () => {
    it('gère deux zones compatibles avec produit et orientation propres', () => {
      const project = base({
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
          pattern: 'half',
          start: 'right',
          boardId: 'IDEA-TERR-G028',
        }],
      });
      const { result } = expectCoreCalculated(project);
      expect(result.layout!.zones).toHaveLength(2);
      expect(result.layout!.productSummaries).toHaveLength(2);
      expect(result.supportPlan!.joistSegments.some((segment) => segment.role === 'zone-boundary')).toBe(true);
    });

    it('une modification dimensionnelle recalcule géométrie → calepinage → structure → plots → fixations → chutes → quantités → prix → dossier', () => {
      const firstProject = base({ dimensions: { ...base().dimensions, lengthM: 6, widthM: 4 } });
      const secondProject = base({ dimensions: { ...base().dimensions, lengthM: 7.4, widthM: 4.6 } });
      const first = runConfigurator(firstProject);
      const second = runConfigurator(secondProject);

      expect(first.geometry?.areaM2).not.toBe(second.geometry?.areaM2);
      expect(first.layout?.totalRequiredLinearM).not.toBe(second.layout?.totalRequiredLinearM);
      expect(first.layout?.stockBoards.length).not.toBe(second.layout?.stockBoards.length);
      expect(first.supportPlan?.joistLinearM).not.toBe(second.supportPlan?.joistLinearM);
      expect(first.supportPlan?.supportPointCount).not.toBe(second.supportPlan?.supportPointCount);

      const firstFixing = first.basket?.lines.find((line) => line.family === 'fixings');
      const secondFixing = second.basket?.lines.find((line) => line.family === 'fixings');
      expect(firstFixing?.quantity ?? firstFixing?.quantityMin).not.toBe(secondFixing?.quantity ?? secondFixing?.quantityMin);

      expect(first.layout?.cutOptimization.totalRequiredMm).not.toBe(second.layout?.cutOptimization.totalRequiredMm);
      expect(first.pricing?.boardPurchaseTtc).not.toBe(second.pricing?.boardPurchaseTtc);

      const firstDossier = buildSiteDossierModel(firstProject, first, 'IB-TERR-VERSION-1.0.0');
      const secondDossier = buildSiteDossierModel(secondProject, second, 'IB-TERR-VERSION-1.0.0');
      expect(firstDossier.cutList.length).not.toBe(secondDossier.cutList.length);
      expect(firstDossier.purchaseList.find((line) => line.family === 'decking')?.quantity)
        .not.toBe(secondDossier.purchaseList.find((line) => line.family === 'decking')?.quantity);
      expect(secondDossier.planManifest).toHaveLength(6);
      buildClientPdfModel(secondProject, second, 'IB-TERR-VERSION-1.0.0');
    });
  });
});
