export interface CommercialMaterial {
  id: string;
  label: string;
  productRef?: string;
  unit: string;
  unitPriceTtc: number;
  sourceUrl: string;
  sourceDate: string;
}

export interface PlotMaterial extends CommercialMaterial {
  minHeightMm: number;
  maxHeightMm: number;
  consumptionPerM2?: number;
  consumptionMinPerM2?: number;
  consumptionMaxPerM2?: number;
}

export const PIN_JOIST_60X40_2400: CommercialMaterial = {
  id: 'IDEA-TERR-013',
  productRef: 'L240060040SE',
  label: 'Lambourde pin Classe 4 — 60 × 40 mm — L. 2,40 m',
  unit: 'pièce',
  unitPriceTtc: 7.37,
  sourceUrl: 'https://www.idea-bois.com/art-liteau-pin-maritime-2400x60x40-mm-trait-classe-4-vert-250.htm',
  sourceDate: '2026-09-21',
};

export const PGB_SCREWS_5X60_200: CommercialMaterial = {
  id: 'IDEA-WEB-VIS-5X60-200',
  productRef: '5410439211611',
  label: 'Vis inox A2 5 × 60 mm — boîte de 200',
  unit: 'boîte',
  unitPriceTtc: 18.55,
  sourceUrl: 'https://www.idea-bois.com/art-vis-a2-inox-5x60-mm-t-te-frais-e-tx25-bo-te-de-200-3709.htm',
  sourceDate: '2026-09-21',
};

export const UBBINK_BAND_20M: CommercialMaterial = {
  id: 'IDEA-WEB-UBBINK-20M',
  productRef: '8713645226309',
  label: "Bande bitumineuse d'étanchéité UBBINK — 8 cm × 20 m",
  unit: 'rouleau',
  unitPriceTtc: 31.00,
  sourceUrl: 'https://www.idea-bois.com/art-bande-bitumineuse-d-tanch-it-8cm-x-20m-protection-terrasse-bois-ubbink-3249.htm',
  sourceDate: '2026-09-21',
};

export const SILVADEC_CLIPS_30: CommercialMaterial = {
  id: 'IDEA-WEB-SILVADEC-CLIPS-30',
  productRef: '3760102970058',
  label: 'Clips de fixation + vis inox SILVADEC — sachet de 30',
  unit: 'sachet',
  unitPriceTtc: 28.87,
  sourceUrl: 'https://www.idea-bois.com/art-clips-de-fixation-vis-inox-silvadec-sachet-de-30-pcs-3413.htm',
  sourceDate: '2026-09-21',
};

export const PLOT_OPTIONS: PlotMaterial[] = [
  {
    id: 'IDEA-WEB-JOUPLAST-40-60',
    productRef: 'P40060',
    label: 'Plot lambourde JOUPLAST réglable 40–60 mm',
    unit: 'plot',
    unitPriceTtc: 2.32,
    minHeightMm: 40,
    maxHeightMm: 60,
    consumptionPerM2: 4,
    sourceUrl: 'https://www.idea-bois.com/art-plot-lambourde-terrasse-r-glable-40-60-mm-jouplast-2182.htm',
    sourceDate: '2026-09-21',
  },
  {
    id: 'IDEA-WEB-JOUPLAST-80-140',
    productRef: 'P80140',
    label: 'Plot lambourde JOUPLAST réglable 80–140 mm',
    unit: 'plot',
    unitPriceTtc: 2.65,
    minHeightMm: 80,
    maxHeightMm: 140,
    consumptionPerM2: 4,
    sourceUrl: 'https://www.idea-bois.com/art-plot-lambourde-terrasse-r-glable-80-140-mm-jouplast-2576.htm',
    sourceDate: '2026-09-21',
  },
  {
    id: 'IDEA-WEB-YEED-25-40',
    label: 'Plot terrasse YEED réglable 25–40 mm',
    unit: 'plot',
    unitPriceTtc: 1.90,
    minHeightMm: 25,
    maxHeightMm: 40,
    consumptionMinPerM2: 4,
    consumptionMaxPerM2: 5,
    sourceUrl: 'https://idea-bois.com/art-plot-terrasse-reglable-25-40-mm-pour-terrasse-bois-ou-composite-yeed.htm',
    sourceDate: '2026-09-21',
  },
  {
    id: 'IDEA-WEB-YEED-60-90',
    productRef: 'YEE060090',
    label: 'Plot terrasse YEED réglable 60–90 mm',
    unit: 'plot',
    unitPriceTtc: 2.32,
    minHeightMm: 60,
    maxHeightMm: 90,
    consumptionMinPerM2: 4,
    consumptionMaxPerM2: 5,
    sourceUrl: 'https://www.idea-bois.com/art-plot-terrasse-reglable-60-90-mm-pour-terrasse-bois-ou-composite-yeed.htm',
    sourceDate: '2026-09-21',
  },
  {
    id: 'IDEA-WEB-YEED-90-150',
    productRef: 'YEE090150',
    label: 'Plot terrasse YEED réglable 90–150 mm',
    unit: 'plot',
    unitPriceTtc: 2.63,
    minHeightMm: 90,
    maxHeightMm: 150,
    consumptionMinPerM2: 4,
    consumptionMaxPerM2: 5,
    sourceUrl: 'https://www.idea-bois.com/art-plot-terrasse-reglable-90-150-mm-pour-terrasse-bois-ou-composite-yeed.htm',
    sourceDate: '2026-09-21',
  },
  {
    id: 'IDEA-WEB-YEED-150-260',
    productRef: 'YEE150260',
    label: 'Plot terrasse YEED réglable 150–260 mm',
    unit: 'plot',
    unitPriceTtc: 3.26,
    minHeightMm: 150,
    maxHeightMm: 260,
    consumptionMinPerM2: 4,
    consumptionMaxPerM2: 5,
    sourceUrl: 'https://www.idea-bois.com/art-plot-terrasse-reglable-150-260-mm-pour-terrasse-bois-ou-composite-yeed.htm',
    sourceDate: '2026-09-21',
  },
];
