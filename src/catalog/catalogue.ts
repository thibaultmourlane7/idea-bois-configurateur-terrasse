import type { BoardSpec, JoistSpec } from '../domain/types';

type RawBoard = [
  string, string, string, number, number, number | null, number[],
  string, string, string, string, string, string, string, string, string[], string,
  'solid-wood' | 'composite', '4' | null, 'nf-dtu-51-4' | 'manufacturer-rules'
];

const RAW_IDEA_BOIS_BOARDS: RawBoard[] = [["IDEA-TERR-G001","Bambou — Réversible","137 × 20 mm • Brun clair • 1,85 m / 3,05 m",137,20,81,[1850,3050],"Lames bambou","Non précisée","Bambou","Réversible","Brun clair","Non précisée","Huilé / pré-huilé","En stock: 2",["IDEA-TERR-011","IDEA-TERR-105"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G002","Bambou — Réversible","137 × 20 mm • Brun foncé • 1,85 m",137,20,84.6,[1850],"Lames bambou","Non précisée","Bambou","Réversible","Brun foncé","Non précisée","Non précisé","En stock: 1",["IDEA-TERR-006"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G003","Cumaru — Lisse","145 × 21 mm • teinte non précisée • 4,55 m",145,21,null,[4550],"Lames bois exotique","Non précisée","Cumaru","Lisse","Non précisée","À visser","Non précisé","À contrôler: 1",["IDEA-TERR-116"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=8","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G004","Cumaru — Lisse","145 × 21 mm • teinte non précisée • 0,9 m",145,21,58.8,[900],"Lames bois exotique","Non précisée","Cumaru","Lisse","Non précisée","À visser","Non précisé","En stock: 1",["IDEA-TERR-114"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=8","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G005","Cumaru — Lisse","145 × 21 mm • teinte non précisée • 1,85 m / 2,15 m / 2,45 m / 2,75 m / 3,05 m / 3,35 m / 3,65 m / 4 m / 4,25 m / 4,3 m / 4,6 m / 4,9 m / 5,2 m",145,21,94.5,[1850,2150,2450,2750,3050,3350,3650,4000,4250,4300,4600,4900,5200],"Lames bois exotique","Non précisée","Cumaru","Lisse","Non précisée","À visser","Non précisé","En stock: 12 / Réappro: 1",["IDEA-TERR-029","IDEA-TERR-069","IDEA-TERR-072","IDEA-TERR-073","IDEA-TERR-079","IDEA-TERR-080","IDEA-TERR-081","IDEA-TERR-082","IDEA-TERR-083","IDEA-TERR-095","IDEA-TERR-096","IDEA-TERR-097","IDEA-TERR-115"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G006","Garapa","145 × 21 mm • teinte non précisée • 5,2 m / 5,8 m",145,21,65.22,[5200,5800],"Lames bois exotique","Non précisée","Garapa","Non précisé","Non précisée","À visser","Non précisé","En stock: 1 / Réappro: 1",["IDEA-TERR-042","IDEA-TERR-043"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=3","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G007","Garapa — Lisse","145 × 21 mm • teinte non précisée • 4 m",145,21,65.22,[4000],"Lames bois exotique","Non précisée","Garapa","Lisse","Non précisée","À visser","Non précisé","En stock: 1",["IDEA-TERR-056"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=4","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G008","Garapa — Lisse","145 × 21 mm • teinte non précisée • 2,15 m / 2,45 m / 2,75 m / 3,35 m / 3,65 m",145,21,75.6,[2150,2450,2750,3350,3650],"Lames bois exotique","Non précisée","Garapa","Lisse","Non précisée","À visser","Non précisé","En stock: 5",["IDEA-TERR-003","IDEA-TERR-041","IDEA-TERR-045","IDEA-TERR-054","IDEA-TERR-065"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G009","Garapa","145 × 21 mm • teinte non précisée • 4,6 m",145,21,75.6,[4600],"Lames bois exotique","Non précisée","Garapa","Non précisé","Non précisée","À visser","Non précisé","En stock: 1",["IDEA-TERR-050"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=4","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G010","Ipé — Lisse","140 × 20 mm • teinte non précisée • 1,55 m",140,20,69.3,[1550],"Lames bois exotique","Non précisée","Ipé","Lisse","Non précisée","À visser","Non précisé","Réappro: 1",["IDEA-TERR-028"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G011","Ipé — Lisse","140 × 20 mm • teinte non précisée • 1,85 m / 2,15 m / 2,75 m / 3,05 m / 3,35 m / 3,65 m / 4,3 m",140,20,164.52,[1850,2150,2750,3050,3350,3650,4300],"Lames bois exotique","Non précisée","Ipé","Lisse","Non précisée","À visser","Non précisé","En stock: 6 / Réappro: 1",["IDEA-TERR-012","IDEA-TERR-018","IDEA-TERR-022","IDEA-TERR-024","IDEA-TERR-051","IDEA-TERR-061","IDEA-TERR-068"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G012","Merbau","140 × 20 mm • teinte non précisée • 2,1 m / 2,4 m / 2,7 m / 3,3 m / 3,9 m / 4,5 m",140,20,72.9,[2100,2400,2700,3300,3900,4500],"Lames bois exotique","Non précisée","Merbau","Non précisé","Non précisée","Non précisée","Non précisé","En stock: 6",["IDEA-TERR-063","IDEA-TERR-070","IDEA-TERR-075","IDEA-TERR-076","IDEA-TERR-077","IDEA-TERR-098"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=4","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G013","Merbau — Lisse","140 × 20 mm • teinte non précisée • 4,2 m",140,20,72.9,[4200],"Lames bois exotique","Non précisée","Merbau","Lisse","Non précisée","À visser","Non précisé","Réappro: 1",["IDEA-TERR-118"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=8","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G014","Padouk — Lisse","120 × 21 mm • teinte non précisée • 1,25 m / 1,55 m / 1,85 m",120,21,72.9,[1250,1550,1850],"Lames bois exotique","Non précisée","Padouk","Lisse","Non précisée","Non précisée","Non précisé","En stock: 3",["IDEA-TERR-110","IDEA-TERR-111","IDEA-TERR-112"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=7","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G015","Padouk — Lisse","120 × 21 mm • teinte non précisée • 2,15 m / 2,45 m / 2,75 m",120,21,78.11,[2150,2450,2750],"Lames bois exotique","Non précisée","Padouk","Lisse","Non précisée","Non précisée","Non précisé","En stock: 3",["IDEA-TERR-002","IDEA-TERR-106","IDEA-TERR-113"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G016","Padouk — Lisse","120 × 21 mm • teinte non précisée • 4,6 m / 4,9 m",120,21,83.7,[4600,4900],"Lames bois exotique","Non précisée","Padouk","Lisse","Non précisée","Non précisée","Non précisé","En stock: 1 / Réappro: 1",["IDEA-TERR-107","IDEA-TERR-108"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=7","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G017","GRAD — Accoya","120 × 21 mm • teinte non précisée • 3 m",120,21,176.4,[3000],"Lames bois modifié / système GRAD","GRAD","Accoya","Non précisé","Non précisée","Non précisée","Non précisé","En stock: 1",["IDEA-TERR-078"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=5","solid-wood",null,"manufacturer-rules"],["IDEA-TERR-G018","Bombé","120 × 28 mm • Marron • 3,6 m / 4,5 m",120,28,29.03,[3600,4500],"Lames bois résineux","Non précisée","Non précisée","Bombé","Marron","Non précisée","Classe 4 marron","En stock: 2",["IDEA-TERR-038","IDEA-TERR-100"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=3","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G019","TRADITION — Pin","145 × 22 mm • Vert • 2,4 m",145,22,23.65,[2400],"Lames bois résineux","TRADITION","Pin","Non précisé","Vert","Non précisée","Classe 4 vert","En stock: 1",["IDEA-TERR-093"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=6","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G020","Terralandes Signature — Pin","145 × 22 mm • Marron • 2,4 m",145,22,24.5,[2400],"Lames bois résineux","Terralandes Signature","Pin","Non précisé","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-019"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G021","SELECTION — Pin — Strié","145 × 22 mm • Marron • 2,4 m",145,22,24.67,[2400],"Lames bois résineux","SELECTION","Pin","Strié","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-094"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=6","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G022","Terralandes Prestige — Pin","145 × 22 mm • Marron • 2,4 m",145,22,26.42,[2400],"Lames bois résineux","Terralandes Prestige","Pin","Non précisé","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-010"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G023","Terralandes Authentique — Pin — Strié","145 × 27 mm • Marron • 2,4 m",145,27,23.86,[2400],"Lames bois résineux","Terralandes Authentique","Pin","Strié","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-109"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=7","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G024","Terralandes Authentique — Pin","145 × 27 mm • Marron • 2,4 m",145,27,29.3,[2400],"Lames bois résineux","Terralandes Authentique","Pin","Non précisé","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-014"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G025","PROLIN — Pin du Nord — Bombé","120 × 28 mm • teinte non précisée • 3,9 m / 4,2 m / 4,5 m / 5,1 m / 5,4 m",120,28,60.48,[3900,4200,4500,5100,5400],"Lames bois résineux","PROLIN","Pin du Nord","Bombé","Non précisée","Non précisée","Classe 4 + Huilé / pré-huilé","En stock: 5",["IDEA-TERR-015","IDEA-TERR-023","IDEA-TERR-026","IDEA-TERR-031","IDEA-TERR-032"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G026","Leni — Pin du Nord — Strié","145 × 27 mm • Marron • 5,1 m",145,27,21.12,[5100],"Lames bois résineux","Leni","Pin du Nord","Strié","Marron","Non précisée","Classe 4 marron","Réappro: 1",["IDEA-TERR-117"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=8","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G027","Pin du Nord — Lisse","145 × 27 mm • teinte non précisée • 3 m / 3,6 m / 4,2 m / 4,5 m / 4,8 m / 5,1 m / 5,4 m",145,27,25.92,[3000,3600,4200,4500,4800,5100,5400],"Lames bois résineux","Non précisée","Pin du Nord","Lisse","Non précisée","Non précisée","Classe 4","En stock: 7",["IDEA-TERR-008","IDEA-TERR-016","IDEA-TERR-025","IDEA-TERR-052","IDEA-TERR-055","IDEA-TERR-059","IDEA-TERR-074"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G028","Pin du Nord — Strié","145 × 27 mm • teinte non précisée • 3 m / 3,6 m / 4,2 m / 4,8 m / 5,4 m",145,27,27.07,[3000,3600,4200,4800,5400],"Lames bois résineux","Non précisée","Pin du Nord","Strié","Non précisée","Non précisée","Classe 4","En stock: 1 / Réappro: 4",["IDEA-TERR-007","IDEA-TERR-036","IDEA-TERR-039","IDEA-TERR-046","IDEA-TERR-057"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G029","Pin du Nord","145 × 27 mm • Marron • 3 m / 3,6 m / 4,2 m / 4,8 m / 5,4 m",145,27,27.07,[3000,3600,4200,4800,5400],"Lames bois résineux","Non précisée","Pin du Nord","Non précisé","Marron","Non précisée","Autoclave","En stock: 5",["IDEA-TERR-009","IDEA-TERR-021","IDEA-TERR-034","IDEA-TERR-040","IDEA-TERR-049"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood",null,"nf-dtu-51-4"],["IDEA-TERR-G030","Pin du Nord — Strié","145 × 27 mm • Marron • 3 m / 3,6 m / 4,2 m / 4,8 m / 5,4 m",145,27,27.84,[3000,3600,4200,4800,5400],"Lames bois résineux","Non précisée","Pin du Nord","Strié","Marron","Non précisée","Classe 4 marron","En stock: 3 / Réappro: 2",["IDEA-TERR-004","IDEA-TERR-037","IDEA-TERR-047","IDEA-TERR-053","IDEA-TERR-058"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G031","Pin du Nord","145 × 27 mm • Marron • 3,6 m / 4,2 m / 4,5 m / 4,8 m",145,27,34.56,[3600,4200,4500,4800],"Lames bois résineux","Non précisée","Pin du Nord","Non précisé","Marron","Non précisée","Classe 4 marron","En stock: 4",["IDEA-TERR-001","IDEA-TERR-060","IDEA-TERR-062","IDEA-TERR-091"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G032","Pin maritime","145 × 22 mm • Marron • 2 m",145,22,19.1,[2000],"Lames bois résineux","Non précisée","Pin maritime","Non précisé","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-030"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G033","TRADITION — Pin maritime — Strié","145 × 22 mm • teinte non précisée • 2,4 m",145,22,22.69,[2400],"Lames bois résineux","TRADITION","Pin maritime","Strié","Non précisée","Non précisée","Classe 4","En stock: 1",["IDEA-TERR-092"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=6","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G034","Béquia — Pin sylvestre — Lisse","90 × 22 mm • Marron • 2,32 m",90,22,26.98,[2320],"Lames bois résineux","Béquia","Pin sylvestre","Lisse","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-027"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G035","Béquia — Pin sylvestre — Lisse","115 × 22 mm • Marron • 2,32 m",115,22,21.6,[2320],"Lames bois résineux","Béquia","Pin sylvestre","Lisse","Marron","Non précisée","Classe 4 marron","En stock: 1",["IDEA-TERR-035"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=3","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G036","Béquia — Pin sylvestre — Lisse","145 × 22 mm • Marron • 1,92 m / 2,32 m",145,22,21.6,[1920,2320],"Lames bois résineux","Béquia","Pin sylvestre","Lisse","Marron","Non précisée","Classe 4 marron","En stock: 2",["IDEA-TERR-005","IDEA-TERR-048"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=1","solid-wood","4","nf-dtu-51-4"],["IDEA-TERR-G037","SILVADEC — Composite — Brossé","138 × 23 mm • Gris Ushuaia • 4 m",138,23,106.42,[4000],"Lames composite","SILVADEC","Composite","Brossé","Gris Ushuaia","Non précisée","Non précisé","En stock: 1",["IDEA-TERR-020"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","composite",null,"manufacturer-rules"],["IDEA-TERR-G038","SILVADEC — Composite","138 × 23 mm • Nuances Ipé • 4 m",138,23,111.74,[4000],"Lames composite","SILVADEC","Composite","Non précisé","Nuances Ipé","Non précisée","Non précisé","En stock: 1",["IDEA-TERR-017"],"https://www.idea-bois.com/cat-terrasse-bois-24.htm?page=2","composite",null,"manufacturer-rules"]];

export const ideaBoisBoards: BoardSpec[] = RAW_IDEA_BOIS_BOARDS.map((row) => {
  const [id, label, subtitle, widthMm, thicknessMm, priceTtcPerM2, availableLengthsMm,
    family, range, material, profile, color, fixation, treatment, availabilitySnapshot,
    internalCodes, sourceUrl, materialFamily, useClass, technicalEngine] = row;

  return {
    id,
    label,
    subtitle,
    widthMm,
    lengthMm: Math.max(...availableLengthsMm),
    availableLengthsMm,
    thicknessMm,
    gapMm: undefined,
    priceTtcPerM2: priceTtcPerM2 ?? undefined,
    isDemo: false,
    catalog: {
      internalCodes,
      family,
      range,
      material,
      profile,
      color,
      fixation,
      treatment,
      availabilitySnapshot,
      sourceUrl,
      sourceDate: '2026-09-04',
      sourceStatus: 'Base catégorie — à valider avant production',
    },
    technical: {
      materialFamily,
      useClass: useClass ?? undefined,
      technicalEngine,
      manufacturerRulesValidated: false,
      sourceLabel: 'Catalogue IDEA Bois — données commerciales vérifiées ; règles techniques à valider',
      sourceVersion: '2026-09-04',
    },
  };
});

/**
 * Produits techniques de régression uniquement : ils servent aux tests du moteur normatif.
 * Ils ne sont pas proposés au particulier dans l'interface V0.7.
 */
export const demoBoards: BoardSpec[] = [
  {
    id: 'DEMO-BOIS-C24-140-3000',
    label: 'Lame bois démo technique',
    subtitle: '140 × 27 mm — longueur 3,00 m',
    widthMm: 140,
    lengthMm: 3000,
    availableLengthsMm: [3000],
    thicknessMm: 27,
    gapMm: 5,
    isDemo: true,
    technical: {
      materialFamily: 'solid-wood',
      mechanicalClass: 'C24',
      useClass: '4',
      densityKgM3: 500,
      technicalEngine: 'nf-dtu-51-4',
      manufacturerRulesValidated: false,
      sourceLabel: 'Données DEMO + NF DTU 51.4 / NF B54-040',
      sourceVersion: '2018-12',
    },
  },
  {
    id: 'DEMO-COMPOSITE-140-4000',
    label: 'Lame composite démo technique',
    subtitle: 'Données fabricant nécessaires avant calcul technique',
    widthMm: 140,
    lengthMm: 4000,
    availableLengthsMm: [4000],
    thicknessMm: 23,
    gapMm: 5,
    isDemo: true,
    technical: {
      materialFamily: 'composite',
      technicalEngine: 'manufacturer-rules',
      manufacturerRulesValidated: false,
      sourceLabel: 'Fabricant requis',
    },
  },
];

export const demoJoist: JoistSpec = {
  id: 'DEMO-LAMB-C24-45x60',
  label: 'Lambourde bois démo 45 × 60 mm',
  widthMm: 45,
  heightMm: 60,
  mechanicalClass: 'C24',
  isDemo: true,
};
