/**
 * Référentiel minimal V0.6 pour le parcours PARTICULIER / résidentiel.
 * Source pédagogique : Guide de conception et de réalisation des terrasses en bois, version 4 (FCBA/FBF),
 * conforme au NF DTU 51.4 et à NF B54-040 de décembre 2018.
 *
 * Important : seules les valeurs réellement utilisées par la V0.6 sont présentes ici.
 * Aucun tableau incomplet n'est extrapolé.
 */
export const NF_DTU_51_4_2018 = {
  id: 'NF_DTU_51_4',
  version: '2018-12',
  status: 'ACTIVE',
  scope: {
    maxDeckHeightCm: 100,
    maxPolymerPedestalHeightCm: 30,
    maxJoistSupportSpanTwoSupportsMm: 600,
    maxJoistSupportSpanThreeOrMoreSupportsMm: 700,
    minimumJoistSectionMm2: 2200,
  },
  drainage: {
    newConcreteSlabMinSlopePercentExclusive: 1.5,
    existingConcreteSlabMinSlopePercentExclusive: 1,
    existingConcreteSlabRequiresVentilatedPlenum: true,
  },
  boardSupportReduction: {
    twoSupportsFactor: 0.85,
  },
  joistSupportReduction: {
    twoSupportsFactor: 0.75,
  },
  fixing: {
    twoScrewsFromBoardWidthMm: 60,
  },
  residential: {
    // Ligne réellement utilisée par le produit bois DEMO : 24-27 mm / largeur 140 mm / C24-D24.
    boardMaxSupportSpacing: [
      { minThicknessMm: 24, maxThicknessMm: 27, widthMm: 140, mechanicalClass: 'C24', maxSpacingMm: 670 },
      { minThicknessMm: 24, maxThicknessMm: 27, widthMm: 140, mechanicalClass: 'D24', maxSpacingMm: 670 },
    ],
    // Lignes réellement utilisées par la lambourde DEMO 45 x 60 mm / C24.
    joistMaxSupportSpacing: [
      { minJoistSpacingMm: 300, maxJoistSpacingMm: 600, widthMm: 45, heightMm: 60, mechanicalClass: 'C24', maxSpacingMm: 700 },
      { minJoistSpacingMm: 600, maxJoistSpacingMm: 1250, widthMm: 45, heightMm: 60, mechanicalClass: 'C24', maxSpacingMm: 690 },
    ],
  },
} as const;
