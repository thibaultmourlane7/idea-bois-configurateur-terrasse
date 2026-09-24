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


export interface BoardRenderColors {
  baseColor: string;
  grainColor: string;
  accentColor: string;
  source: 'product-texture' | 'board-visual';
}

function shadeHex(hex: string, factor: number): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
  const value = Number.parseInt(normalized, 16);
  const r = Math.max(0, Math.min(255, Math.round(((value >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((value >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((value & 255) * factor)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Couleurs de projection 3D.
 *
 * Si une texture produit est déjà associée et possède une teinte de calibration,
 * cette teinte devient la couleur principale du rendu. Cela évite que les produits
 * mappés apparaissent avec la couleur neutre utilisée historiquement pour les
 * produits sans média exact.
 *
 * Une texture neutre ne déclenche aucune couleur inventée : on conserve alors
 * strictement les couleurs visuelles déjà portées par le produit.
 */
export function resolveBoardRenderColors(board: BoardSpec): BoardRenderColors {
  const asset = resolveBoardTexture(board);
  const visualBase = board.visual?.baseColor ?? '#d8c3a4';
  const visualGrain = board.visual?.grainColor ?? '#8f775d';
  const visualAccent = board.visual?.accentColor ?? '#efe6d8';

  if (asset.status !== 'neutral' && asset.tintColor) {
    return {
      baseColor: asset.tintColor,
      grainColor: shadeHex(asset.tintColor, 0.62),
      accentColor: shadeHex(asset.tintColor, 1.22),
      source: 'product-texture',
    };
  }

  return {
    baseColor: visualBase,
    grainColor: visualGrain,
    accentColor: visualAccent,
    source: 'board-visual',
  };
}
