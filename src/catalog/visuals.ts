import type { BoardVisualData } from '../domain/types';

const NEUTRAL = {
  baseColor: '#e9eef1',
  grainColor: '#c7d1d7',
  accentColor: '#f7f9fa',
};

const PADOUK_MEDIA = 'https://www.idea-bois.com/media/cache/app_shop_product_zoom_fancy/c6/25/04f5795ef003b5fc1f6d719d9e9f.jpg';

type VerifiedProductPage = {
  productCode?: string;
  pageUrl: string;
};

const VERIFIED_PRODUCT_PAGES: Partial<Record<string, VerifiedProductPage>> = {
  'IDEA-TERR-G027': {
    productCode: 'TSL300145027E',
    pageUrl: 'https://www.idea-bois.com/art-lame-de-terrasse-en-pin-du-nord-lisse-long-3-00-m-27x145-mm-classe-4-2490.htm',
  },
  'IDEA-TERR-G028': {
    productCode: 'TSS300145027E',
    pageUrl: 'https://www.idea-bois.com/art-terrasse-en-pin-du-nord-stri-3-00m-145x27-mm-3215.htm',
  },
  'IDEA-TERR-G029': {
    productCode: 'TSL300145027M',
    pageUrl: 'https://www.idea-bois.com/art-lame-pin-du-nord-lisse-marron-l-3-00-m-145x27mm-traitement-classe-4-2172.htm',
  },
  'IDEA-TERR-G030': {
    productCode: 'TSS300145027M',
    pageUrl: 'https://www.idea-bois.com/art-lame-de-terrasse-en-pin-du-nord-strie-classe-4-marron-l-3-00-m-145x27-mm.htm',
  },
  'IDEA-TERR-G031': {
    productCode: 'T420145027USM',
    pageUrl: 'https://www.idea-bois.com/art-lame-terrasse-4-20-m-pin-du-nord-us-marron-145-x-27-mm-2941.htm',
  },
  'IDEA-TERR-G005': {
    productCode: 'TCL490145021',
    pageUrl: 'https://www.idea-bois.com/art-lame-terrasse-cumaru-l-4-90m-145x21-mm-2867.htm',
  },
  'IDEA-TERR-G008': {
    productCode: 'TGL215145021',
    pageUrl: 'https://www.idea-bois.com/art-lame-terrasse-bois-exotique-garapa-lisse-l-2-15-m-145x21-mm-visser-3468.htm',
  },
  'IDEA-TERR-G011': {
    pageUrl: 'https://www.idea-bois.com/art-lame-de-terrasse-ip-lisse-l-1-85-m-140x20-mm-visser-2774.htm',
  },
  'IDEA-TERR-G015': {
    productCode: 'TPAD27512021',
    pageUrl: 'https://idea-bois.com/art-lame-terrasse-bois-exotique-padouk-lisse-longueur-2-75-m-120-x-21-mm.htm',
  },
  'IDEA-TERR-G037': {
    productCode: 'SILVAGRIS',
    pageUrl: 'https://www.idea-bois.com/art-lame-composite-atmosph-re-bross-e-23x138x4000-mm-gris-ushuaia-silvadec-1845.htm',
  },
  'IDEA-TERR-G038': {
    productCode: 'SILVAIPE',
    pageUrl: 'https://www.idea-bois.com/art-lame-composite-atmosph-re-nuances-ip-23x138x4000-mm-silvadec-3416.htm',
  },
};

function neutralVisual(sourcePageUrl: string): BoardVisualData {
  return {
    ...NEUTRAL,
    imageSourcePageUrl: sourcePageUrl,
    imageStatus: 'unmapped',
  };
}

export function boardVisual(
  id: string,
  _material: string,
  _profile: string,
  _color: string,
  sourcePageUrl: string,
): BoardVisualData {
  if (id === 'IDEA-TERR-G014' || id === 'IDEA-TERR-G015' || id === 'IDEA-TERR-G016') {
    return {
      ...NEUTRAL,
      imageUrl: PADOUK_MEDIA,
      imageSourcePageUrl: VERIFIED_PRODUCT_PAGES['IDEA-TERR-G015']?.pageUrl
        ?? 'https://www.idea-bois.com/art-lame-terrasse-bois-exotique-padouk-lisse-longueur-1-55-m-120-x-21-mm-4355.htm',
      officialProductCode: id === 'IDEA-TERR-G015' ? 'TPAD27512021' : undefined,
      imageStatus: 'verified-media',
    };
  }

  const verifiedPage = VERIFIED_PRODUCT_PAGES[id];
  if (verifiedPage) {
    return {
      ...NEUTRAL,
      imageSourcePageUrl: verifiedPage.pageUrl,
      officialProductCode: verifiedPage.productCode,
      imageStatus: 'verified-product-page',
    };
  }

  return neutralVisual(sourcePageUrl);
}
