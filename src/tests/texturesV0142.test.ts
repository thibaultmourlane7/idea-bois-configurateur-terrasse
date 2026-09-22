import { describe, expect, it } from 'vitest';
import { ideaBoisBoards } from '../catalog/catalogue';
import { productTextures } from '../catalog/productTextures';
import { resolveBoardTexture, textureStatusLabel } from '../visual/resolveBoardTexture';

const board = (id: string) => ideaBoisBoards.find((item) => item.id === id)!;

describe('Bibliothèque de textures V0.14.2-A', () => {
  it('mappe les 8 finitions prioritaires vers une texture de projection', () => {
    const priorityIds = [
      'IDEA-TERR-G028',
      'IDEA-TERR-G030',
      'IDEA-TERR-G005',
      'IDEA-TERR-G015',
      'IDEA-TERR-G011',
      'IDEA-TERR-G008',
      'IDEA-TERR-G037',
      'IDEA-TERR-G038',
    ];

    for (const id of priorityIds) {
      const texture = resolveBoardTexture(board(id));
      expect(texture.status).toBe('close');
      expect(texture.textureImageUrl).toContain('polyhaven');
      expect(texture.sourceLicense).toBe('CC0');
      expect(texture.referenceSourceUrl).toBeTruthy();
    }
  });

  it('distingue réellement pin strié vert et pin strié marron', () => {
    const green = resolveBoardTexture(board('IDEA-TERR-G028'));
    const brown = resolveBoardTexture(board('IDEA-TERR-G030'));
    expect(green.id).not.toBe(brown.id);
    expect(green.tintColor).not.toBe(brown.tintColor);
    expect(green.tone).toContain('vert');
    expect(brown.tone).toContain('marron');
  });

  it('distingue un profil strié d’un profil lisse', () => {
    const grooved = resolveBoardTexture(board('IDEA-TERR-G028'));
    const smooth = resolveBoardTexture(board('IDEA-TERR-G027'));
    expect(grooved.finishType).toBe('grooved');
    expect(grooved.grooveCount).toBeGreaterThan(0);
    expect(smooth.finishType).toBe('smooth');
    expect(smooth.grooveCount).toBeUndefined();
  });

  it('ne réutilise plus la photo produit Padouk en perspective comme texture répétée', () => {
    const padouk = resolveBoardTexture(board('IDEA-TERR-G015'));
    expect(padouk.status).toBe('close');
    expect(padouk.textureImageUrl).toContain('polyhaven');
    expect(padouk.textureImageUrl).not.toContain('idea-bois.com/media/cache');
  });

  it('retombe sur une texture neutre si aucune matière fiable n’est mappée', () => {
    const bamboo = resolveBoardTexture(board('IDEA-TERR-G001'));
    expect(bamboo.status).toBe('neutral');
    expect(bamboo.textureImageUrl).toBeUndefined();
    expect(textureStatusLabel(bamboo)).toBe('Texture à compléter');
  });

  it('interdit de qualifier exacte une texture sans source ni image', () => {
    for (const texture of productTextures.filter((item) => item.status === 'exact')) {
      expect(texture.textureImageUrl).toBeTruthy();
      expect(texture.sourceUrl).toBeTruthy();
      expect(texture.referenceSourceUrl).toBeTruthy();
    }
  });

  it('conserve la même matière pour le platelage et les rives d’une même lame', () => {
    const selected = board('IDEA-TERR-G005');
    const deckTexture = resolveBoardTexture(selected);
    const edgeTexture = resolveBoardTexture(selected);
    expect(edgeTexture.id).toBe(deckTexture.id);
    expect(edgeTexture.textureImageUrl).toBe(deckTexture.textureImageUrl);
  });
});
