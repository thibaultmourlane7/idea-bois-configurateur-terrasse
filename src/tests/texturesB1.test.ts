import { describe, expect, it } from 'vitest';
import { ideaBoisBoards } from '../catalog/catalogue';
import { resolveBoardTexture } from '../visual/resolveBoardTexture';
import { materialProfiles, resolveMaterialProfile } from '../visual/materialProfiles';
import { buildGrooveLines } from '../visual/texturePainter';
import { resolveTextureVariant } from '../visual/textureVariants';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

describe('Affinage Pin du Nord strié V0.14.2-B1', () => {
  it('associe un profil profond distinct au pin strié vert et marron', () => {
    const green = resolveMaterialProfile(board('IDEA-TERR-G028'));
    const brown = resolveMaterialProfile(board('IDEA-TERR-G030'));

    expect(green?.id).toBe('pin-nord-strie-vert-b1');
    expect(brown?.id).toBe('pin-nord-strie-marron-b1');
    expect(green?.grooveStyle).toBe('deep');
    expect(brown?.grooveStyle).toBe('deep');
    expect(green?.id).not.toBe(brown?.id);
  });

  it('reproduit deux bandes de 13 rainures avec un centre volontairement lisse', () => {
    for (const profile of materialProfiles) {
      const grooves = buildGrooveLines(profile);
      expect(profile.grooveBands).toHaveLength(2);
      expect(grooves).toHaveLength(26);
      expect(grooves.filter((line) => line.ratio > 0.311 && line.ratio < 0.689)).toHaveLength(0);
      expect(grooves.some((line) => line.ratio < 0.31)).toBe(true);
      expect(grooves.some((line) => line.ratio > 0.69)).toBe(true);
    }
  });

  it('ne donne aucun profil B1 au pin lisse', () => {
    expect(resolveMaterialProfile(board('IDEA-TERR-G027'))).toBeUndefined();
    expect(resolveMaterialProfile(board('IDEA-TERR-G029'))).toBeUndefined();
  });

  it('utilise quatre variantes visuelles déterministes entre les lames', () => {
    const variants = [0, 1, 2, 3].map((row) => resolveTextureVariant(row, 0, 4));
    expect(new Set(variants.map((variant) => variant.index)).size).toBe(4);
    expect(resolveTextureVariant(2, 1, 4)).toEqual(resolveTextureVariant(2, 1, 4));
    expect(new Set(variants.flatMap((variant) => variant.knotRatios)).size).toBeGreaterThan(1);
  });

  it('conserve deux matières couleur distinctes pour vert et marron', () => {
    const green = resolveBoardTexture(board('IDEA-TERR-G028'));
    const brown = resolveBoardTexture(board('IDEA-TERR-G030'));

    expect(green.textureImageUrl).toContain('coated_pine');
    expect(brown.textureImageUrl).toContain('coated_pine');
    expect(green.tintColor).toBe('#7c8362');
    expect(brown.tintColor).toBe('#8a5b3f');
    expect(green.tintColor).not.toBe(brown.tintColor);
    expect(green.grooveCount).toBe(26);
    expect(brown.grooveCount).toBe(26);
  });

  it('documente les profils comme projections proches et non textures exactes', () => {
    for (const id of ['IDEA-TERR-G028', 'IDEA-TERR-G030']) {
      const texture = resolveBoardTexture(board(id));
      expect(texture.status).toBe('close');
      expect(texture.sourceLicense).toBe('CC0');
      expect(texture.referenceSourceUrl).toContain('idea-bois.com');
    }
  });
});
