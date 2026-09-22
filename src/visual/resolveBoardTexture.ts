import type { BoardSpec, ProductTextureAsset } from '../domain/types';
import { neutralTexture, productTextures } from '../catalog/productTextures';

export function resolveBoardTexture(board: BoardSpec): ProductTextureAsset {
  const direct = productTextures.find((asset) => asset.boardIds.includes(board.id));
  if (direct) return direct;

  const material = board.catalog?.material?.toLowerCase() ?? '';
  const profile = board.catalog?.profile?.toLowerCase() ?? '';
  const color = board.catalog?.color?.toLowerCase() ?? '';

  const inferred = productTextures.find((asset) => {
    if (material.includes('cumaru')) return asset.id === 'tex-cumaru-close';
    if (material.includes('garapa')) return asset.id === 'tex-garapa-close';
    if (material.includes('ipé') || material.includes('ipe')) return asset.id === 'tex-ipe-close';
    if (material.includes('padouk')) return asset.id === 'tex-padouk-close';
    if (material.includes('pin') && profile.includes('stri') && color.includes('vert')) return asset.id === 'tex-pin-nord-vert-strie-close';
    if (material.includes('pin') && profile.includes('stri') && color.includes('marron')) return asset.id === 'tex-pin-nord-marron-strie-close';
    if (material.includes('pin') && color.includes('vert')) return asset.id === 'tex-pin-nord-vert-lisse-close';
    if (material.includes('pin') && color.includes('marron')) return asset.id === 'tex-pin-nord-marron-lisse-close';
    return false;
  });

  return inferred ?? neutralTexture;
}

export function textureStatusLabel(asset: ProductTextureAsset): string {
  if (asset.status === 'exact') return 'Texture exacte';
  if (asset.status === 'close') return 'Texture proche';
  return 'Texture à compléter';
}
