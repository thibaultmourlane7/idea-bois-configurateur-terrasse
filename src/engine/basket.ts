import type { BasketLine, BasketResult, GeometryResult, LayoutResult, PricingResult, ProjectInput, StockBoard, StockLengthBreakdown, SupportPlanResult } from '../domain/types';
import { computeEdgeCladding } from './edgeCladding';
import {
  EXOTIC_JOIST_VARIANTS,
  GEODECK_20M2,
  HARDWOOD_SCREWS_5X60_200,
  PGB_SCREWS_5X60_200,
  PIN_JOIST_60X40_2400,
  PIN_JOIST_VARIANTS,
  PLOT_OPTIONS,
  SILVADEC_CLIPS_30,
  SILVADEC_FINISH_SCREWS_BROWN,
  SILVADEC_FINISH_SCREWS_GREY,
  SILVADEC_SKIRT_GREY,
  SILVADEC_SKIRT_IPE,
  UBBINK_BAND_20M,
} from '../catalog/materials';
import { getCommercialConstructionRule } from './constructionRules';

export const BASKET_TAG = 'SA-TERR-BASKET-001';

const round2 = (value: number) => Math.round(value * 100) / 100;

function stockLengthBreakdown(
  stockBoards: StockBoard[],
  refsByLength?: Map<number, string | undefined>,
): StockLengthBreakdown[] {
  const grouped = new Map<number, number>();
  for (const board of stockBoards) {
    grouped.set(board.stockLengthMm, (grouped.get(board.stockLengthMm) ?? 0) + 1);
  }
  return [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([lengthMm, quantity]) => ({
      lengthMm,
      quantity,
      productRef: refsByLength?.get(lengthMm),
    }));
}

function boardRefsByLength(input: ProjectInput): Map<number, string | undefined> {
  return new Map(
    (input.board.catalog?.variants ?? []).map((variant) => [variant.lengthMm, variant.productRef]),
  );
}

function joistVariantsFor(input: ProjectInput) {
  const exotic = ['idea-cumaru-145x21','idea-garapa-145x21','idea-padouk-120x21','idea-ipe-140x20']
    .includes(input.board.commercialRecipeId ?? '');
  return exotic ? EXOTIC_JOIST_VARIANTS : PIN_JOIST_VARIANTS;
}


function deckingLine(input: ProjectInput, geometry: GeometryResult, layout: LayoutResult | undefined, pricing: PricingResult): BasketLine {
  if (layout && pricing.boardPurchaseTtc != null) {
    return {
      id: 'decking',
      family: 'decking',
      label: input.board.label,
      productRef: input.board.catalog?.internalCodes.join(', '),
      quantity: layout.stockBoards.length,
      unit: 'lame(s)',
      unitPriceTtc: input.board.priceTtcPerM2,
      totalTtc: round2(pricing.boardPurchaseTtc),
      status: 'exact',
      required: true,
      note: `${layout.purchasedLinearM.toFixed(2)} ml achetés • ${layout.wastePercent.toFixed(1)} % de chute`,
      stockBreakdown: stockLengthBreakdown(layout.stockBoards, boardRefsByLength(input)),
      sourceUrl: input.board.catalog?.sourceUrl,
    };
  }

  return {
    id: 'decking',
    family: 'decking',
    label: input.board.label,
    productRef: input.board.catalog?.internalCodes.join(', '),
    quantity: geometry.areaM2,
    unit: 'm² nets',
    unitPriceTtc: input.board.priceTtcPerM2,
    totalTtc: pricing.surfaceNetTtc != null ? round2(pricing.surfaceNetTtc) : undefined,
    status: pricing.surfaceNetTtc != null ? 'informative' : 'pending',
    required: true,
    note: pricing.surfaceNetTtc != null
      ? 'Prix sur surface nette : quantité de commande à finaliser après validation du jeu de pose.'
      : 'Prix catalogue à confirmer.',
    sourceUrl: input.board.catalog?.sourceUrl,
  };
}

function pending(id: string, family: BasketLine['family'], label: string, note: string): BasketLine {
  return { id, family, label, unit: '—', status: 'pending', required: true, note };
}

function choosePlot(residualHeightMm: number) {
  const candidates = PLOT_OPTIONS.filter((item) => residualHeightMm >= item.minHeightMm && residualHeightMm <= item.maxHeightMm);
  return candidates.sort((a, b) => {
    const aExact = a.consumptionPerM2 != null ? 1 : 0;
    const bExact = b.consumptionPerM2 != null ? 1 : 0;
    return bExact - aExact || (a.maxHeightMm - a.minHeightMm) - (b.maxHeightMm - b.minHeightMm);
  })[0];
}

function woodCommercialLines(input: ProjectInput, geometry: GeometryResult, layout: LayoutResult | undefined, supportPlan?: SupportPlanResult): BasketLine[] {
  const area = geometry.areaM2;
  const rule = getCommercialConstructionRule(input);
  const unresolvedStructureReason = input.supportSystem === 'adjustable-pedestals'
    ? !layout
      ? 'Calepinage des lames indisponible : les raccords et leurs appuis ne peuvent pas être validés.'
      : supportPlan?.pendingCurvedPerimeter
        ? 'Une portion de lambourdage périphérique courbe reste à valider avant de figer les quantités.'
        : undefined
    : undefined;
  const hasPrecisePlan = input.supportSystem === 'adjustable-pedestals'
    && !unresolvedStructureReason
    && supportPlan
    && supportPlan.status !== 'unavailable'
    && supportPlan.joistStockBoards.length > 0;
  const joistVariants = joistVariantsFor(input);
  const longestJoist = joistVariants
    .slice()
    .sort((a, b) => (b.lengthMm ?? 0) - (a.lengthMm ?? 0))[0] ?? PIN_JOIST_60X40_2400;
  const joistMaterialByLength = new Map(joistVariants.map((item) => [item.lengthMm ?? 0, item]));
  const joistRefsByLength = new Map(joistVariants.map((item) => [item.lengthMm ?? 0, item.productRef]));
  const fallbackStockLengthM = Math.max(...(rule?.joistStockLengthsMm?.length ? rule.joistStockLengthsMm : [longestJoist.lengthMm ?? 2400])) / 1000;
  const joistLinearM = hasPrecisePlan ? supportPlan.joistLinearM : area * 2.5;
  const joistPieces = hasPrecisePlan ? supportPlan.joistStockBoards.length : Math.ceil(joistLinearM / fallbackStockLengthM);
  const joistBreakdown = hasPrecisePlan ? stockLengthBreakdown(supportPlan.joistStockBoards, joistRefsByLength) : undefined;
  const joistPreciseTotalTtc = hasPrecisePlan
    ? supportPlan.joistStockBoards.reduce((sum, stock) => {
        const material = joistMaterialByLength.get(stock.stockLengthMm);
        return material ? sum + material.unitPriceTtc : Number.NaN;
      }, 0)
    : undefined;
  const joistPricingComplete = joistPreciseTotalTtc == null || Number.isFinite(joistPreciseTotalTtc);
  const joistFallbackTotalTtc = joistPieces * longestJoist.unitPriceTtc;
  const bandRolls = Math.ceil(joistLinearM / 20);

  const lines: BasketLine[] = unresolvedStructureReason
    ? [
        pending('joists', 'joists', rule?.joistLabel ?? longestJoist.label, unresolvedStructureReason),
        pending('protection', 'protection', UBBINK_BAND_20M.label, 'La longueur de protection dépend du lambourdage final validé.'),
      ]
    : [
        {
          id: 'joists',
          family: 'joists',
          label: rule?.joistLabel ?? longestJoist.label,
          productRef: hasPrecisePlan && joistBreakdown?.every((item) => item.productRef)
            ? joistBreakdown.map((item) => item.productRef).filter(Boolean).join(', ')
            : longestJoist.productRef,
          quantity: joistPieces,
          unit: 'pièce(s)',
          unitPriceTtc: hasPrecisePlan ? undefined : longestJoist.unitPriceTtc,
          totalTtc: hasPrecisePlan
            ? joistPricingComplete ? round2(joistPreciseTotalTtc ?? 0) : undefined
            : round2(joistFallbackTotalTtc),
          status: hasPrecisePlan && !joistPricingComplete ? 'pending' : 'exact',
          required: true,
          note: hasPrecisePlan
            ? `${joistLinearM.toFixed(1)} ml calculés sur le plan réel • ${supportPlan.buttJointAxisPositionsMm.length} axe(s) de jonction détecté(s) • double lambourdage ${input.doubleJoistsAtButtJoints ? 'activé' : 'désactivé'} • optimisation selon les longueurs commerciales validées de la lambourde.`
            : `${joistLinearM.toFixed(1)} ml • règle commerciale IDEA Bois : 2,5 ml/m²`,
          stockBreakdown: joistBreakdown,
          sourceUrl: hasPrecisePlan ? rule?.sourceUrl : longestJoist.sourceUrl,
        },
        {
          id: 'protection',
          family: 'protection',
          label: UBBINK_BAND_20M.label,
          productRef: UBBINK_BAND_20M.productRef,
          quantity: bandRolls,
          unit: 'rouleau(x)',
          unitPriceTtc: UBBINK_BAND_20M.unitPriceTtc,
          totalTtc: round2(bandRolls * UBBINK_BAND_20M.unitPriceTtc),
          status: 'exact',
          required: true,
          note: '1 rouleau couvre 20 ml de lambourdes.',
          sourceUrl: UBBINK_BAND_20M.sourceUrl,
        },
      ];

  if (input.board.thicknessMm >= 20 && input.board.thicknessMm <= 27 && input.board.technical.technicalEngine !== 'manufacturer-rules') {
    const hardwoodRecipe = ['idea-cumaru-145x21','idea-garapa-145x21','idea-padouk-120x21','idea-ipe-140x20'].includes(input.board.commercialRecipeId ?? '');
    const screwMaterial = hardwoodRecipe ? HARDWOOD_SCREWS_5X60_200 : PGB_SCREWS_5X60_200;
    const screwMin = Math.ceil(area * 35);
    const screwMax = Math.ceil(area * 40);
    const packMin = Math.ceil(screwMin / 200);
    const packMax = Math.ceil(screwMax / 200);
    const exact = packMin === packMax;
    lines.push({
      id: 'fixings',
      family: 'fixings',
      label: screwMaterial.label,
      productRef: screwMaterial.productRef,
      quantity: exact ? packMin : undefined,
      quantityMin: exact ? undefined : packMin,
      quantityMax: exact ? undefined : packMax,
      unit: 'boîte(s)',
      unitPriceTtc: screwMaterial.unitPriceTtc,
      totalTtc: exact ? round2(packMin * screwMaterial.unitPriceTtc) : undefined,
      totalMinTtc: exact ? undefined : round2(packMin * screwMaterial.unitPriceTtc),
      totalMaxTtc: exact ? undefined : round2(packMax * screwMaterial.unitPriceTtc),
      status: exact ? 'exact' : 'range',
      required: true,
      note: 'IDEA Bois indique 35 à 40 vis/m² ; conditionnement de 200.',
      sourceUrl: screwMaterial.sourceUrl,
    });
  } else {
    lines.push(pending('fixings', 'fixings', 'Fixations adaptées à la lame', 'La fixation doit être confirmée pour ce profil avant commande.'));
  }

  if (input.supportSystem === 'adjustable-pedestals') {
    if (unresolvedStructureReason) {
      lines.push(pending('supports', 'supports', 'Plots / appuis', unresolvedStructureReason));
    } else if (hasPrecisePlan) {
      for (const group of supportPlan.plotGroups) {
        lines.push({
          id: `supports-${group.materialId}`,
          family: 'supports',
          label: group.label,
          productRef: group.productRef,
          quantity: group.quantity,
          unit: 'plot(s)',
          unitPriceTtc: group.unitPriceTtc,
          totalTtc: group.totalTtc,
          status: 'exact',
          required: true,
          note: `Implantation V0.16 : hauteur compatible ${group.minHeightMm}–${group.maxHeightMm} mm • quantités issues des positions réelles des lambourdes et d'un entraxe plots ≤ ${supportPlan.plotSpacingMm ?? 700} mm.`,
          sourceUrl: group.sourceUrl,
        });
      }
      if (supportPlan.unsupportedPointCount > 0) {
        lines.push(pending(
          'supports-unavailable-heights',
          'supports',
          'Plots pour hauteurs hors gamme',
          `${supportPlan.unsupportedPointCount} appui(s) nécessitent une hauteur non couverte par les plots tarifés du référentiel actuel (${supportPlan.minRequiredPlotHeightMm?.toFixed(0) ?? '?'} à ${supportPlan.maxRequiredPlotHeightMm?.toFixed(0) ?? '?'} mm sur le projet).`,
        ));
      }
    } else {
      const residualHeightMm = input.heightCm * 10 - input.board.thicknessMm - 40;
      const plot = choosePlot(residualHeightMm);
      if (!plot || residualHeightMm <= 0) {
        lines.push(pending('supports', 'supports', 'Plots / appuis', `Hauteur utile calculée : ${Math.max(0, residualHeightMm).toFixed(0)} mm. Aucun plot tarifé compatible n'est validé dans le référentiel V0.8.`));
      } else if (plot.consumptionPerM2 != null) {
        const qty = Math.ceil(area * plot.consumptionPerM2);
        lines.push({
          id: 'supports',
          family: 'supports',
          label: plot.label,
          productRef: plot.productRef,
          quantity: qty,
          unit: 'plot(s)',
          unitPriceTtc: plot.unitPriceTtc,
          totalTtc: round2(qty * plot.unitPriceTtc),
          status: 'exact',
          required: true,
          note: `Hauteur utile ${residualHeightMm.toFixed(0)} mm • ${plot.consumptionPerM2} plots/m² publiés.`,
          sourceUrl: plot.sourceUrl,
        });
      } else {
        const qMin = Math.ceil(area * (plot.consumptionMinPerM2 ?? 4));
        const qMax = Math.ceil(area * (plot.consumptionMaxPerM2 ?? 5));
        lines.push({
          id: 'supports',
          family: 'supports',
          label: plot.label,
          productRef: plot.productRef,
          quantityMin: qMin,
          quantityMax: qMax,
          unit: 'plot(s)',
          unitPriceTtc: plot.unitPriceTtc,
          totalMinTtc: round2(qMin * plot.unitPriceTtc),
          totalMaxTtc: round2(qMax * plot.unitPriceTtc),
          status: 'range',
          required: true,
          note: `Hauteur utile ${residualHeightMm.toFixed(0)} mm • consommation publiée 4 à 5 plots/m².`,
          sourceUrl: plot.sourceUrl,
        });
      }
    }
  } else if (input.supportSystem === 'pads') {
    lines.push(pending('supports', 'supports', 'Cales / appuis fixes', 'Le type et l’épaisseur des cales doivent être choisis selon le support réel.'));
  } else {
    lines.push(pending('supports', 'supports', 'Plots / cales / appuis', 'Choisissez le système de support pour obtenir son prix.'));
  }

  return lines;
}

function silvadecLines(input: ProjectInput, geometry: GeometryResult, layout: LayoutResult | undefined, supportPlan?: SupportPlanResult): BasketLine[] {
  const area = geometry.areaM2;
  const clips = Math.ceil(area * 18);
  const packs = Math.ceil(clips / 30);
  const preciseJoists = Boolean(layout)
    && !supportPlan?.pendingCurvedPerimeter
    && supportPlan
    && supportPlan.status !== 'unavailable'
    && supportPlan.joistStockBoards.length > 0;
  return [
    {
      id: 'joists',
      family: 'joists',
      label: 'Lambourde aluminium Réversil SILVADEC 63 × 40 × 3600 mm',
      productRef: 'SILAMB2102',
      quantity: preciseJoists ? supportPlan.joistStockBoards.length : round2(area * 3),
      unit: preciseJoists ? 'pièce(s)' : 'ml',
      status: 'pending',
      required: true,
      note: preciseJoists
        ? `${supportPlan.joistLinearM.toFixed(1)} ml implantés avec entraxe de lambourdes ≤ 400 mm et appuis ≤ 600 mm en résidentiel. Prix commercial de la Réversil à confirmer.`
        : 'Quantité fabricant : environ 3 ml/m². Prix de la structure Réversil à confirmer.',
      sourceUrl: 'https://fr.silvadec.com/wp-content/pdf/fr-PU39.pdf',
    },
    {
      id: 'fixings',
      family: 'fixings',
      label: SILVADEC_CLIPS_30.label,
      productRef: SILVADEC_CLIPS_30.productRef,
      quantity: packs,
      unit: 'sachet(s)',
      unitPriceTtc: SILVADEC_CLIPS_30.unitPriceTtc,
      totalTtc: round2(packs * SILVADEC_CLIPS_30.unitPriceTtc),
      status: 'exact',
      required: true,
      note: `${clips} clips requis à 18 clips/m² • sachets de 30.`,
      sourceUrl: SILVADEC_CLIPS_30.sourceUrl,
    },
    pending('supports', 'supports', 'Plots / appuis compatibles', supportPlan?.supportPoints.length
      ? `${supportPlan.supportPoints.length} position(s) d’appui calculée(s) avec un entraxe maximal de 600 mm. Le modèle de plot commercial compatible reste à valider.`
      : 'La référence de plot doit être validée avant chiffrage.'),
    pending('protection', 'protection', 'Protection / accessoires structure', 'Dépend du matériau de lambourde retenu.'),
  ];
}

function accessoryLines(input: ProjectInput, geometry: GeometryResult): BasketLine[] {
  const lines: BasketLine[] = [];

  if (input.supportType === 'stabilized-ground' && input.includeGeotextile) {
    const rolls = Math.ceil(geometry.areaM2 / 20);
    lines.push({
      id: 'geotextile',
      family: 'accessories',
      label: GEODECK_20M2.label,
      productRef: GEODECK_20M2.productRef,
      quantity: rolls,
      unit: 'rouleau(x)',
      unitPriceTtc: GEODECK_20M2.unitPriceTtc,
      totalTtc: round2(rolls * GEODECK_20M2.unitPriceTtc),
      status: 'exact',
      required: true,
      note: `${rolls * 20} m² couverts pour ${geometry.areaM2.toFixed(2)} m² de terrasse.`,
      sourceUrl: GEODECK_20M2.sourceUrl,
    });
  }

  if (input.edgeFinishMode !== 'full-perimeter') return lines;

  if (input.board.id === 'IDEA-TERR-G037' || input.board.id === 'IDEA-TERR-G038') {
    const grey = input.board.id === 'IDEA-TERR-G037';
    const skirt = grey ? SILVADEC_SKIRT_GREY : SILVADEC_SKIRT_IPE;
    const screws = grey ? SILVADEC_FINISH_SCREWS_GREY : SILVADEC_FINISH_SCREWS_BROWN;
    const perimeter = geometry.perimeterM;
    const skirtLength = skirt.lengthM ?? 2;
    const skirtQty = Math.ceil(perimeter / skirtLength);
    const screwSpacing = screws.spacingM ?? 0.4;
    const screwCount = Math.ceil(perimeter / screwSpacing);
    const screwPack = screws.packQuantity ?? 50;
    const screwPacks = Math.ceil(screwCount / screwPack);

    lines.push({
      id: 'edge-finish',
      family: 'accessories',
      label: skirt.label,
      productRef: skirt.productRef,
      quantity: skirtQty,
      unit: 'pièce(s)',
      unitPriceTtc: skirt.unitPriceTtc,
      totalTtc: round2(skirtQty * skirt.unitPriceTtc),
      status: 'informative',
      required: true,
      note: `${perimeter.toFixed(2)} ml de rives. Quantité commerciale minimale sur longueurs de ${skirtLength.toFixed(2)} m ; angles et chutes de rive à confirmer.`,
      sourceUrl: skirt.sourceUrl,
    });

    lines.push({
      id: 'edge-finish-screws',
      family: 'accessories',
      label: screws.label,
      productRef: screws.productRef,
      quantity: screwPacks,
      unit: 'blister(s)',
      unitPriceTtc: screws.unitPriceTtc,
      totalTtc: round2(screwPacks * screws.unitPriceTtc),
      status: 'informative',
      required: true,
      note: `Base fabricant : 1 vis tous les ${Math.round(screwSpacing * 100)} cm sur la jupe. Quantité à confirmer avec le calepinage des angles.`,
      sourceUrl: screws.sourceUrl,
    });
  } else {
    const cladding = computeEdgeCladding(input);

    if (cladding.status === 'exact' && cladding.mode === 'same-decking') {
      lines.push({
        id: 'edge-finish',
        family: 'accessories',
        label: `Habillage latéral — ${input.board.label}`,
        productRef: input.board.catalog?.internalCodes.join(', '),
        quantity: cladding.boardStockBoards?.length,
        unit: 'lame(s)',
        totalTtc: cladding.boardTotalTtc,
        status: 'exact',
        required: true,
        note: `${cladding.rowCount} rang(s) sur ${input.edgeCladdingHeightCm.toFixed(0)} cm de hauteur • même lame que le platelage • ${cladding.boardPurchasedLinearM?.toFixed(2)} ml achetés.`,
        sourceUrl: input.board.catalog?.sourceUrl,
      });

      lines.push({
        id: 'edge-vertical-joists',
        family: 'joists',
        label: `Lambourdes verticales d’habillage — morceaux de ${input.edgeCladdingHeightCm.toFixed(0)} cm`,
        productRef: PIN_JOIST_60X40_2400.productRef,
        quantity: cladding.verticalJoistStockBoards?.length,
        unit: 'lambourde(s) 2,40 m',
        unitPriceTtc: PIN_JOIST_60X40_2400.unitPriceTtc,
        totalTtc: cladding.verticalJoistTotalTtc,
        status: 'exact',
        required: true,
        note: `${cladding.verticalSupportCount} support(s) verticaux de ${input.edgeCladdingHeightCm.toFixed(0)} cm • entraxe maxi ${Math.round((cladding.verticalJoistSpacingMm ?? 0) / 10)} cm • ${cladding.verticalJoistRequiredLinearM?.toFixed(2)} ml nécessaires.`,
        sourceUrl: PIN_JOIST_60X40_2400.sourceUrl,
      });
    } else if (cladding.mode === 'same-decking' && cladding.boardTotalTtc != null) {
      lines.push({
        id: 'edge-finish',
        family: 'accessories',
        label: `Habillage latéral — ${input.board.label}`,
        productRef: input.board.catalog?.internalCodes.join(', '),
        quantity: cladding.boardStockBoards?.length,
        unit: 'lame(s)',
        unitPriceTtc: input.board.priceTtcPerM2,
        totalTtc: cladding.boardTotalTtc,
        status: 'exact',
        required: true,
        note: `${cladding.rowCount} rang(s) • même lame que le platelage. ${cladding.reason ?? ''}`.trim(),
        sourceUrl: input.board.catalog?.sourceUrl,
      });
      lines.push(pending(
        'edge-vertical-joists',
        'joists',
        'Lambourdes verticales d’habillage',
        cladding.reason ?? 'L’entraxe des supports verticaux doit être validé pour cette gamme.',
      ));
    } else {
      lines.push(pending(
        'edge-finish',
        'accessories',
        'Habillage latéral avec la même lame',
        cladding.reason ?? `${geometry.perimeterM.toFixed(2)} ml de rives à habiller. Le calcul doit être validé pour cette géométrie.`,
      ));
      lines.push(pending(
        'edge-vertical-joists',
        'joists',
        'Lambourdes verticales d’habillage',
        cladding.reason ?? 'La structure verticale doit être validée.',
      ));
    }
  }

  return lines;
}

export function computeBasket(
  input: ProjectInput,
  geometry: GeometryResult,
  layout: LayoutResult | undefined,
  pricing: PricingResult,
  supportPlan?: SupportPlanResult,
): BasketResult {
  const lines: BasketLine[] = [deckingLine(input, geometry, layout, pricing)];

  if (input.board.commercialRecipeId === 'silvadec-atmosphere-138x23') {
    lines.push(...silvadecLines(input, geometry, layout, supportPlan));
  } else if (['idea-pin-nord-145x27','idea-resineux-class4','idea-cumaru-145x21','idea-garapa-145x21','idea-padouk-120x21','idea-ipe-140x20'].includes(input.board.commercialRecipeId ?? '')) {
    lines.push(...woodCommercialLines(input, geometry, layout, supportPlan));
  } else {
    lines.push(
      pending('joists', 'joists', 'Lambourdes / structure', 'Compatibilité produit à valider.'),
      pending('supports', 'supports', 'Plots / appuis', 'Système de support à valider.'),
      pending('fixings', 'fixings', 'Vis / clips / fixations', 'Fixation fabricant à valider.'),
      pending('protection', 'protection', 'Protection / accessoires', 'Accessoires compatibles à valider.'),
    );
  }

  lines.push(...accessoryLines(input, geometry));

  const required = lines.filter((line) => line.required);
  const exactLines = required.filter((line) => line.status === 'exact');
  const rangeLines = required.filter((line) => line.status === 'range');
  const unresolved = required.filter((line) => line.status === 'pending' || line.status === 'informative');

  const knownSubtotalTtc = round2(exactLines.reduce((sum, line) => sum + (line.totalTtc ?? 0), 0));
  const rangeMin = round2(knownSubtotalTtc + rangeLines.reduce((sum, line) => sum + (line.totalMinTtc ?? 0), 0));
  const rangeMax = round2(knownSubtotalTtc + rangeLines.reduce((sum, line) => sum + (line.totalMaxTtc ?? 0), 0));

  if (!unresolved.length && !rangeLines.length) {
    return { lines, knownSubtotalTtc, totalTtc: knownSubtotalTtc, status: 'complete', missingFamilies: [] };
  }
  if (!unresolved.length && rangeLines.length) {
    return { lines, knownSubtotalTtc, totalMinTtc: rangeMin, totalMaxTtc: rangeMax, status: 'range', missingFamilies: [] };
  }

  return {
    lines,
    knownSubtotalTtc,
    status: 'partial',
    missingFamilies: unresolved.map((line) => line.label),
  };
}
