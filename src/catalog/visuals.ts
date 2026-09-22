import type { BoardVisualData } from '../domain/types';

const PADOUK_MEDIA = 'https://www.idea-bois.com/media/cache/app_shop_product_zoom_fancy/c6/25/04f5795ef003b5fc1f6d719d9e9f.jpg';

export function boardVisual(
  id: string,
  material: string,
  profile: string,
  color: string,
  sourcePageUrl: string,
): BoardVisualData {
  const normalized = `${material} ${profile} ${color}`.toLowerCase();

  if (id.startsWith('IDEA-TERR-G014') || id.startsWith('IDEA-TERR-G015') || id.startsWith('IDEA-TERR-G016')) {
    return {
      baseColor: '#b65232',
      grainColor: '#7d2f1d',
      accentColor: '#dc7a4c',
      imageUrl: PADOUK_MEDIA,
      imageSourcePageUrl: 'https://www.idea-bois.com/art-lame-terrasse-bois-exotique-padouk-lisse-longueur-1-55-m-120-x-21-mm-4355.htm',
      imageStatus: 'verified-media',
    };
  }

  if (normalized.includes('silvadec') || normalized.includes('composite')) {
    if (normalized.includes('gris')) {
      return { baseColor: '#7f8280', grainColor: '#656967', accentColor: '#9a9c99', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
    }
    return { baseColor: '#7a5944', grainColor: '#5a3f31', accentColor: '#9a7660', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('garapa')) {
    return { baseColor: '#c99a4a', grainColor: '#9a6f2f', accentColor: '#e0bb72', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('cumaru')) {
    return { baseColor: '#8b4f35', grainColor: '#60321f', accentColor: '#b06b47', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('ipé') || normalized.includes('ipe')) {
    return { baseColor: '#6b4635', grainColor: '#442b23', accentColor: '#8c6047', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('merbau')) {
    return { baseColor: '#8c553c', grainColor: '#623522', accentColor: '#aa6b4a', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('bambou')) {
    return normalized.includes('foncé')
      ? { baseColor: '#795541', grainColor: '#513729', accentColor: '#9a7159', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' }
      : { baseColor: '#a5784f', grainColor: '#775438', accentColor: '#c49a70', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('marron')) {
    return { baseColor: '#8b6748', grainColor: '#5d452f', accentColor: '#a98461', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  if (normalized.includes('pin')) {
    return { baseColor: '#b89a6a', grainColor: '#8a714b', accentColor: '#d1b384', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
  }

  return { baseColor: '#a9815d', grainColor: '#755b42', accentColor: '#c19b75', imageSourcePageUrl: sourcePageUrl, imageStatus: 'catalog-described' };
}
