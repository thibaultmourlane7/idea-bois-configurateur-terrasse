import { describe, expect, it } from 'vitest';
import {
  ANGEL_TERRACE_BUSINESS_VERSION,
  ANGEL_TERRACE_KNOWLEDGE,
  searchAngelTerraceKnowledge,
} from './angelTerraceKnowledge';

describe('Base de connaissance Ángel — Terrasse IDEA Bois', () => {
  it('est synchronisée avec la V1.8.2', () => {
    expect(ANGEL_TERRACE_BUSINESS_VERSION).toBe('IB-TERR-VERSION-1.8.2');
  });

  it('contient les décisions produit critiques', () => {
    const byId = new Map(ANGEL_TERRACE_KNOWLEDGE.map((entry) => [entry.id, entry]));
    expect(byId.get('garapa-gap')?.answer).toContain('5 mm');
    expect(byId.get('padouk-gap')?.answer).toContain('5 mm');
    expect(byId.get('cumaru-g003-price')?.answer).toContain('94,50');
    expect(byId.get('moso-bamboo')?.answer).toContain('BO-SB155');
    expect(byId.get('silvadec-reversil')?.answer).toContain('SILAMB2102');
    expect(byId.get('pin-g025-prolin')?.status).toBe('partial');
  });

  it('retrouve les réponses avec une recherche simple', () => {
    expect(searchAngelTerraceKnowledge('hauteur plot')[0]?.id).toBe('height-total');
    expect(searchAngelTerraceKnowledge('silvadec reversil').some((entry) => entry.id === 'silvadec-reversil')).toBe(true);
    expect(searchAngelTerraceKnowledge('cumaru G003 prix').some((entry) => entry.id === 'cumaru-g003-price')).toBe(true);
  });
});
