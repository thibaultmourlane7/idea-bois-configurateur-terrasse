import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import { runConfigurator } from '../engine/configurator';
import { computeTerraceEdges, edgeTreatmentLengthM } from '../engine/edges';
import { computeEdgeCladding } from '../engine/edgeCladding';
import { buildClientPdfModel } from '../pdf/clientPdfModel';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Rives Sprint C',
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
  edgeConfigs: [],
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'straight',
  board,
  joist: demoJoist,
  usage: 'residential',
};

describe('Sprint C V0.22 — rives métier', () => {
  it('crée une rive métier par côté avec un identifiant et une longueur réelle', () => {
    const edges = computeTerraceEdges(base);
    expect(edges.map((edge) => edge.label)).toEqual(['AB', 'BC', 'CD', 'DA']);
    expect(edges.map((edge) => edge.lengthM)).toEqual([6, 4, 6, 4]);
    expect(edges.every((edge) => edge.context === 'free' && edge.treatment === 'none')).toBe(true);
  });

  it('conserve le mode historique tout le pourtour', () => {
    const project = { ...base, edgeFinishMode: 'full-perimeter' as const };
    const edges = computeTerraceEdges(project);
    expect(edges.every((edge) => edge.treatment === 'cladding')).toBe(true);
    expect(edgeTreatmentLengthM(project, 'cladding')).toBe(20);
  });

  it('calcule uniquement les rives choisies en mode rive par rive', () => {
    const project: ProjectInput = {
      ...base,
      edgeFinishMode: 'per-edge',
      edgeConfigs: [
        { edgeIndex: 0, context: 'wall', treatment: 'profile', note: 'Mur maison' },
        { edgeIndex: 1, context: 'facade', treatment: 'cladding' },
        { edgeIndex: 2, context: 'threshold', treatment: 'drainage' },
        { edgeIndex: 3, context: 'access', treatment: 'edge-board' },
      ],
    };
    const edges = computeTerraceEdges(project);
    expect(edges[0]).toMatchObject({ label: 'AB', context: 'wall', treatment: 'profile' });
    expect(edges[1]).toMatchObject({ label: 'BC', context: 'facade', treatment: 'cladding' });
    expect(edgeTreatmentLengthM(project, 'cladding')).toBe(4);

    const cladding = computeEdgeCladding(project);
    expect(cladding.perimeterM).toBe(4);
    expect(cladding.edgeLengthsM).toEqual([4]);

    const result = runConfigurator(project);
    expect(result.edges).toHaveLength(4);
    expect(result.basket?.lines.find((line) => line.id === 'edge-finish')?.note).toContain('BC');
    expect(result.basket?.lines.find((line) => line.id === 'edge-treatment-profile')).toMatchObject({ quantity: 6, unit: 'ml', status: 'pending' });
    expect(result.basket?.lines.find((line) => line.id === 'edge-treatment-drainage')).toMatchObject({ quantity: 6, unit: 'ml', status: 'pending' });
    expect(result.basket?.lines.find((line) => line.id === 'edge-treatment-edge-board')).toMatchObject({ quantity: 4, unit: 'ml', status: 'pending' });
    expect(result.basket?.status).toBe('partial');

    const pdf = buildClientPdfModel(project, result, 'IB-TERR-VERSION-022.0', '23/09/2026');
    expect(pdf.finishes).toContain('AB');
    expect(pdf.finishes).toContain('BC');
    expect(pdf.finishes).toContain('Drainage');
  });

  it('sauvegarde les rives dans le lien de partage V10', () => {
    const project: ProjectInput = {
      ...base,
      edgeFinishMode: 'per-edge',
      edgeConfigs: [{ edgeIndex: 0, context: 'wall', treatment: 'profile', note: 'Mur existant' }],
    };
    const token = projectToShareToken(project);
    const restored = projectFromShareToken(token, base);
    expect(restored.edgeFinishMode).toBe('per-edge');
    expect(restored.edgeConfigs?.[0]).toEqual({ edgeIndex: 0, context: 'wall', treatment: 'profile', note: 'Mur existant' });
  });

  it('représente une terrasse circulaire par une rive courbe unique sans faux calcul exact', () => {
    const project: ProjectInput = {
      ...base,
      shape: 'circle',
      edgeFinishMode: 'per-edge',
      edgeConfigs: [{ edgeIndex: 0, context: 'free', treatment: 'cladding' }],
    };
    const edges = computeTerraceEdges(project);
    expect(edges).toHaveLength(1);
    expect(edges[0].curved).toBe(true);
    expect(edges[0].lengthM).toBeCloseTo(Math.PI * 5, 5);
    expect(computeEdgeCladding(project).status).toBe('partial');
  });
});
