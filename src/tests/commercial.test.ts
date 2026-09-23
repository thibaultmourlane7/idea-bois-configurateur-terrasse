import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { buildCommercialPayload } from '../commercial/payload';
import { assessCartReadiness } from '../commercial/types';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import { demoCommercialAdapter } from '../commercial/demoAdapter';

const base: ProjectInput = {
  projectName: 'Terrasse été',
  shape: 'l-shape',
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
  orientation: 'width',
  board: ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!,
  joist: demoJoist,
  usage: 'residential',
};

describe('Parcours commercial V0.11', () => {
  it('partage et restaure réellement la configuration sans données client', () => {
    const shared = { ...base, structureJoistChoice: 'exotic' as const };
    const token = projectToShareToken(shared);
    const restored = projectFromShareToken(token, { ...base, projectName: 'fallback' });
    expect(restored.projectName).toBe('Terrasse été');
    expect(restored.shape).toBe('l-shape');
    expect(restored.orientation).toBe('width');
    expect(restored.board.id).toBe(base.board.id);
    expect(restored.structureJoistChoice).toBe('exotic');
    expect(token).not.toContain('email');
    expect(token).not.toContain('phone');
  });

  it('prépare une demande de devis sans main-d’œuvre', () => {
    const result = runConfigurator(base);
    const payload = buildCommercialPayload('quote-request', base, result, 'IB-TERR-VERSION-011', {
      firstName: 'Jean',
      lastName: 'Client',
      email: 'jean@example.com',
      phone: '0600000000',
      postalCode: '31000',
      consent: true,
    }, '2026-09-21T14:00:00.000Z');

    expect(payload.intent).toBe('quote-request');
    expect(payload.excludesLabor).toBe(true);
    expect(payload.resultSummary.lines.length).toBe(result.basket?.lines.length);
    expect((payload as unknown as Record<string, unknown>).laborCost).toBeUndefined();
    expect((payload as unknown as Record<string, unknown>).hours).toBeUndefined();
  });

  it('verrouille le panier tant que le mapping SKU multi-longueurs n’est pas exact', () => {
    const result = runConfigurator(base);
    const readiness = assessCartReadiness(result);
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.some((item) => item.includes('SKU'))).toBe(true);
  });

  it('l’adaptateur de démo ne prétend pas avoir envoyé la demande', async () => {
    const result = runConfigurator(base);
    const payload = buildCommercialPayload('receive-project', base, result, 'IB-TERR-VERSION-011');
    const response = await demoCommercialAdapter.submit(payload);
    expect(response.status).toBe('prepared-demo');
    expect(response.message).toContain('Aucun envoi réseau');
  });
});
