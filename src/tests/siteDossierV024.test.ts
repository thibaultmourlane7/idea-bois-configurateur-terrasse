import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildSiteDossierModel } from '../pdf/siteDossierModel';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

const base: ProjectInput = {
  projectName: 'Dossier chantier Sprint E',
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
  obstacles: [{ id: 'REG-1', kind: 'manhole', label: 'Regard', shape: 'rectangle', xM: 1, yM: 1, widthM: .5, heightM: .5 }],
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
  edgeFinishMode: 'per-edge',
  edgeConfigs: [
    { edgeIndex: 0, context: 'wall', treatment: 'profile', note: 'Mur maison' },
    { edgeIndex: 1, context: 'access', treatment: 'cladding' },
  ],
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'straight',
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
    start: 'left',
    boardId: 'IDEA-TERR-G028',
  }],
  board: board('IDEA-TERR-G027'),
  joist: demoJoist,
  usage: 'residential',
};

describe('Sprint E V0.24 — dossier chantier professionnel', () => {
  it('construit un dossier complet à partir des sorties réelles du moteur', () => {
    const result = runConfigurator(base);
    const dossier = buildSiteDossierModel(base, result, 'IB-TERR-VERSION-024.0', '23/09/2026');

    expect(dossier.projectName).toBe('Dossier chantier Sprint E');
    expect(dossier.generatedAt).toBe('23/09/2026');
    expect(dossier.zones).toHaveLength(2);
    expect(dossier.products).toHaveLength(2);
    expect(dossier.structure.joistSegmentCount).toBeGreaterThan(0);
    expect(dossier.structure.supportPointCount).toBeGreaterThan(0);
    expect(dossier.edges).toHaveLength(4);
    expect(dossier.basket.length).toBeGreaterThan(3);
    expect(dossier.trace.length).toBeGreaterThan(5);
  });

  it('sépare les stocks et les informations de coupe par produit', () => {
    const dossier = buildSiteDossierModel(base, runConfigurator(base), 'IB-TERR-VERSION-024.0');
    expect(dossier.products.map((item) => item.boardId)).toEqual(expect.arrayContaining(['IDEA-TERR-G027', 'IDEA-TERR-G028']));
    for (const product of dossier.products) {
      expect(product.stockBoardCount).toBeGreaterThan(0);
      expect(product.stockBreakdown.length).toBeGreaterThan(0);
      expect(product.purchasedLinearM).toBeGreaterThanOrEqual(product.requiredLinearM);
      expect(product.cutRulesNote).toContain('confirmer');
    }
  });

  it('reprend les rives métier et les données à confirmer sans les transformer en valeurs sûres', () => {
    const dossier = buildSiteDossierModel(base, runConfigurator(base), 'IB-TERR-VERSION-024.0');
    expect(dossier.edges.find((edge) => edge.label === 'AB')).toMatchObject({
      context: 'Contre mur',
      treatment: 'Profil de finition',
      note: 'Mur maison',
    });
    expect(dossier.issues.some((issue) => issue.tag.startsWith('PANIER-edge-treatment-profile'))).toBe(true);
    expect(dossier.issues.some((issue) => issue.tag.startsWith('CUT-'))).toBe(true);
    expect(dossier.status).toBe('with-warnings');
  });

  it('passe en statut bloqué si une incompatibilité de zone est détectée sur une géométrie valide', () => {
    const invalid: ProjectInput = {
      ...base,
      layingZones: [{
        ...base.layingZones![0],
        boardId: 'IDEA-TERR-G005',
      }],
    };
    const result = runConfigurator(invalid);
    const dossier = buildSiteDossierModel(invalid, result, 'IB-TERR-VERSION-024.0');
    expect(result.geometry).toBeDefined();
    expect(dossier.status).toBe('blocked');
    expect(dossier.issues.some((issue) => issue.severity === 'blocking')).toBe(true);
  });
});
