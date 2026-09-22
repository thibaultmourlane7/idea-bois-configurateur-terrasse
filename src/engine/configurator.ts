import type { ConfiguratorResult, Diagnostic, LayoutResult, ProjectInput } from '../domain/types';
import { RULE_TAGS } from '../domain/rules';
import { validateProject } from '../domain/validation';
import { computeBasket, BASKET_TAG } from './basket';
import { computeGeometry, GEOMETRY_TAG } from './geometry';
import { computeLayout, LAYOUT_TAG } from './layout';
import { CUT_TAG } from './cuts';
import { computePricing, PRICE_TAG } from './pricing';
import { validateScope } from './scope';
import { computeTechnicalSizing } from './technical';
import { computeStructure } from './structure';
import { computeSupportPlan, SUPPORT_PLAN_TAG } from './supportPlan';

export const VERSION_TAG = 'IB-TERR-VERSION-017';
export const CATALOG_TAG = 'SA-TERR-CATALOG-002';
export const GAP_TAG = 'SA-TERR-GAP-001';

export function runConfigurator(input: ProjectInput): ConfiguratorResult {
  const diagnostics: Diagnostic[] = [...validateProject(input)];
  const trace: string[] = [`[${VERSION_TAG}] Calepinage CALPI adapté terrasse : pose entière/1-2/1-3, raccords globaux cohérents et lambourdes sans explosion d’axes.`];

  if (diagnostics.some((d) => d.severity === 'blocking')) {
    return { valid: false, diagnostics, trace: [...trace, 'Calcul bloqué : géométrie ou données de base invalides.'] };
  }

  const geometry = computeGeometry(input);
  trace.push(`[${GEOMETRY_TAG}] Surface brute ${geometry.grossAreaM2.toFixed(3)} m² ; exclusions ${geometry.excludedAreaM2.toFixed(3)} m² ; surface nette ${geometry.areaM2.toFixed(3)} m² ; périmètre extérieur ${geometry.perimeterM.toFixed(3)} m.`);

  let layout: LayoutResult | undefined;
  if (input.board.gapMm != null && Number.isFinite(input.board.gapMm) && input.board.gapMm >= 0) {
    layout = computeLayout(input);
    trace.push(`[${LAYOUT_TAG}] ${layout.rowCount} rangées ; motif ${input.layingPattern ?? 'straight'} ; ${layout.totalRequiredLinearM.toFixed(3)} ml de lames nécessaires ; ${new Set(layout.buttJoints.map((joint) => Math.round(joint.axisPositionMm))).size} axe(s) de raccord.`);
    trace.push(`[${CUT_TAG}] ${layout.stockBoards.length} lames commerciales ; chute matière ${layout.wastePercent.toFixed(2)} %.`);
  } else {
    diagnostics.push({
      tag: GAP_TAG,
      severity: 'blocking',
      message: 'Cette référence nécessite encore une validation de pose avant commande.',
      technicalMessage: 'Jeu entre lames absent du référentiel structuré : le moteur ne l’invente pas.',
      source: input.board.technical.sourceLabel,
    });
  }

  let pricing = computePricing(input, geometry, layout);
  if (pricing.boardPurchaseTtc != null) {
    trace.push(`[${PRICE_TAG}] Lames à acheter ${pricing.boardPurchaseTtc.toFixed(2)} € TTC.`);
  } else if (pricing.surfaceNetTtc != null) {
    trace.push(`[${PRICE_TAG}] Prix lames sur surface nette ${pricing.surfaceNetTtc.toFixed(2)} € TTC.`);
  } else {
    trace.push(`[${PRICE_TAG}] Prix lames indisponible : aucune valeur inventée.`);
  }

  const supportPlan = computeSupportPlan(input, layout);
  if (supportPlan.status === 'exact') {
    trace.push(`[${SUPPORT_PLAN_TAG}] ${supportPlan.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0)} appuis implantés • hauteurs ${supportPlan.minRequiredPlotHeightMm?.toFixed(0) ?? '?'} à ${supportPlan.maxRequiredPlotHeightMm?.toFixed(0) ?? '?'} mm • ${supportPlan.joistStockBoards.length} lambourdes commerciales.`);
  } else if (supportPlan.status === 'partial') {
    diagnostics.push({
      tag: SUPPORT_PLAN_TAG,
      severity: 'warning',
      message: 'Certaines hauteurs de plots restent hors des gammes tarifées connues.',
      technicalMessage: `${supportPlan.unsupportedPointCount} appui(s) sans plot compatible dans le référentiel actuel.`,
      source: supportPlan.sourceUrl,
    });
    trace.push(`[${SUPPORT_PLAN_TAG}] Plan structurel partiel : ${supportPlan.unsupportedPointCount} appui(s) restent à résoudre.`);
  } else if (supportPlan.note) {
    trace.push(`[${SUPPORT_PLAN_TAG}] ${supportPlan.note}`);
  }

  const basket = computeBasket(input, geometry, layout, pricing, supportPlan);
  if (basket.totalTtc != null) {
    trace.push(`[${BASKET_TAG}] Panier matériel complet : ${basket.totalTtc.toFixed(2)} € TTC.`);
  } else if (basket.totalMinTtc != null && basket.totalMaxTtc != null) {
    trace.push(`[${BASKET_TAG}] Panier matériel : ${basket.totalMinTtc.toFixed(2)} à ${basket.totalMaxTtc.toFixed(2)} € TTC.`);
  } else {
    trace.push(`[${BASKET_TAG}] Sous-total exact disponible : ${basket.knownSubtotalTtc.toFixed(2)} € TTC ; lignes manquantes explicites.`);
  }

  diagnostics.push(...validateScope(input));

  if (input.board.catalog) {
    diagnostics.push({
      tag: CATALOG_TAG,
      severity: 'info',
      message: 'Les tarifs affichés proviennent du catalogue IDEA Bois relevé ou vérifié.',
      technicalMessage: 'La connexion ERP n’est pas activée dans la démo : les prix et stocks seront resynchronisés en production.',
      source: input.board.catalog.sourceUrl,
    });
  }

  const technical = computeTechnicalSizing(input);
  if (technical) diagnostics.push(...technical.diagnostics);

  if (!technical || diagnostics.some((d) => d.severity === 'blocking')) {
    return {
      valid: false,
      diagnostics,
      geometry,
      layout,
      pricing,
      basket,
      supportPlan,
      trace: [...trace, 'Panier commercial conservé ; validation technique finale encore requise avant commande.'],
    };
  }

  const structure = computeStructure(input, technical.boardMaxSupportSpacingMm, technical.joistMaxSupportSpacingMm);
  trace.push(`[${RULE_TAGS.boardSpan}] Entraxe maxi lame ${technical.boardMaxSupportSpacingMm} mm ; entraxe réel ${structure.joistActualSpacingMm.toFixed(1)} mm.`);
  trace.push(`[${RULE_TAGS.joistSpan}] Appuis lambourdes ≤ ${structure.joistSupportMaxSpacingMm} mm ; ${structure.supportPointCount} appuis calculés.`);

  if (layout?.hasButtJoints) {
    diagnostics.push({
      tag: RULE_TAGS.joints,
      severity: 'warning',
      message: 'Certains raccords de lames devront être confirmés avant la commande.',
      technicalMessage: 'Les raccords sont maintenant positionnés rangée par rangée et repris dans le plan structurel. Le choix simple/double lambourdage reste sous validation humaine avant commande.',
    });
    structure.fixingCount = undefined;
    structure.fixingStatus = 'pending-joint-layout';
  }

  pricing = computePricing(input, geometry, layout);

  trace.push('[SA-TERR-SCOPE-001] Aucun temps de pose, aucune heure de main-d’œuvre et aucun coût de main-d’œuvre.');

  return {
    valid: true,
    diagnostics,
    geometry,
    structure,
    layout,
    pricing,
    basket,
    supportPlan,
    trace,
  };
}
