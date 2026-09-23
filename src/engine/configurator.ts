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
import { computeTerraceEdges, EDGE_TAG } from './edges';
import { getProductCompatibility } from '../catalog/compatibility';
import { computeTerrainModel, TERRAIN_TAG } from './terrain';
import { computeStairs, STAIR_TAG } from './stairs';
import { computeGuardrails, GUARDRAIL_TAG } from './guardrails';

export const VERSION_TAG = 'IB-TERR-VERSION-1.6.0';
export const CATALOG_TAG = 'SA-TERR-CATALOG-002';
export const GAP_TAG = 'SA-TERR-GAP-001';

export function runConfigurator(input: ProjectInput): ConfiguratorResult {
  const diagnostics: Diagnostic[] = [...validateProject(input)];
  const trace: string[] = [`[${VERSION_TAG}] V1.6.0 : Sprint G2 — 3D immersive réaliste avec caméra orbitale, vue technique conservée et moteur métier inchangé.`];

  if (diagnostics.some((d) => d.severity === 'blocking')) {
    return { valid: false, diagnostics, trace: [...trace, 'Calcul bloqué : géométrie ou données de base invalides.'] };
  }

  if (input.referencePlan) {
    trace.push(
      `[SA-TERR-IMPORT-150] Source ${input.referencePlan.sourceKind ?? 'image'}`
      + `${input.referencePlan.sourceName ? ` « ${input.referencePlan.sourceName} »` : ''}`
      + `${input.referencePlan.sourceKind === 'pdf' && input.referencePlan.sourcePageNumber ? ` page ${input.referencePlan.sourcePageNumber}/${input.referencePlan.sourcePageCount ?? '?'}` : ''}`
      + ` ; calibration ${input.referencePlan.calibrated ? 'validée' : 'non validée'}`
      + ` ; contour assisté ${input.referencePlan.humanValidatedAt ? 'validé humainement' : 'non validé'}.`
    );
  }
  const geometry = computeGeometry(input);
  const terrain = computeTerrainModel(input);
  trace.push(`[${TERRAIN_TAG}] ${terrain.platforms.length} plateforme(s) ; ${terrain.relations.length} relation(s) ; ${terrain.transitionCount} transition(s) de niveau détectée(s).`);
  const stairs = computeStairs(input);
  if (stairs.length) {
    const readyStairs = stairs.filter((stair) => stair.status === 'ready');
    const treadLinearM = readyStairs.reduce((sum, stair) => sum + (stair.treadRequiredLinearM ?? 0), 0);
    const structureLinearM = readyStairs.reduce((sum, stair) => sum + (stair.structureLinearM ?? 0), 0);
    trace.push(`[${STAIR_TAG}] ${stairs.length} escalier(s) configuré(s) ; ${readyStairs.length} géométrie(s) calculée(s) ; marches ${treadLinearM.toFixed(2)} ml de lame ; structure géométrique ${structureLinearM.toFixed(2)} ml renseignés.`);
  }
  const guardrails = computeGuardrails(input);
  if (guardrails.length) {
    const readyGuardrails = guardrails.filter((item) => item.status === 'ready');
    trace.push(`[${GUARDRAIL_TAG}] ${guardrails.length} garde-corps configuré(s) ; ${readyGuardrails.length} géométrie(s) calculée(s) ; ${readyGuardrails.reduce((sum, item) => sum + (item.postCount ?? 0), 0)} poteau(x) ; ${readyGuardrails.reduce((sum, item) => sum + (item.sectionCount ?? 0), 0)} section(s).`);
  }
  const compatibility = getProductCompatibility(input.board);
  diagnostics.push({
    tag: 'SA-TERR-COMPAT-023',
    severity: compatibility.overall === 'missing' ? 'warning' : 'info',
    message: `Matrice produit : ${compatibility.overall === 'validated' ? 'compatibilités complètes' : compatibility.overall === 'partial' ? 'compatibilités partielles' : 'compatibilités à compléter'}.`,
    technicalMessage: [compatibility.layout, compatibility.structure, compatibility.fixings, compatibility.supports, compatibility.edgeFinish]
      .map((item) => `${item.label}: ${item.state}`).join(' • '),
    source: input.board.catalog?.sourceUrl,
  });
  const edges = computeTerraceEdges(input);
  trace.push(`[${EDGE_TAG}] ${edges.length} rive(s) métier ; ${edges.filter((edge) => edge.treatment !== 'none').length} rive(s) avec traitement demandé.`);
  trace.push(`[${GEOMETRY_TAG}] Surface brute ${geometry.grossAreaM2.toFixed(3)} m² ; exclusions ${geometry.excludedAreaM2.toFixed(3)} m² ; surface nette ${geometry.areaM2.toFixed(3)} m² ; périmètre extérieur ${geometry.perimeterM.toFixed(3)} m.`);

  let layout: LayoutResult | undefined;
  if (input.board.gapMm != null && Number.isFinite(input.board.gapMm) && input.board.gapMm >= 0) {
    layout = computeLayout(input);
    trace.push(`[${LAYOUT_TAG}] ${layout.rowCount} rangées sur ${layout.zones.length} zone(s) ; ${layout.productSummaries.length} référence(s) de lame ; ${layout.totalRequiredLinearM.toFixed(3)} ml nécessaires ; ${layout.buttJoints.length} raccord(s) positionné(s).`);
    trace.push(`[${CUT_TAG}] ${layout.stockBoards.length} lames commerciales ; ${layout.cutOptimization.reusedOffcutCount} réemploi(s) tracé(s) ; reste final brut ${(layout.cutOptimization.finalRemainingMm / 1000).toFixed(3)} ml. Seuil de chute réutilisable et trait de scie : à confirmer.`);
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
    const partialReasons = [
      supportPlan.pendingCurvedPerimeter
        ? 'Une portion de lambourdage périphérique courbe reste à confirmer.'
        : undefined,
      supportPlan.unsupportedPointCount > 0
        ? `${supportPlan.unsupportedPointCount} appui(s) restent sans plot commercial validé dans le référentiel actuel.`
        : undefined,
    ].filter((value): value is string => Boolean(value));
    diagnostics.push({
      tag: SUPPORT_PLAN_TAG,
      severity: 'warning',
      message: 'Le plan structurel reste partiel et ne doit pas être considéré comme exact.',
      technicalMessage: partialReasons.join(' ') || supportPlan.note || 'Une validation structurelle complémentaire est nécessaire.',
      source: supportPlan.sourceUrl,
    });
    trace.push(`[${SUPPORT_PLAN_TAG}] Plan structurel partiel : ${partialReasons.join(' ') || supportPlan.note || 'validation complémentaire requise'}`);
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

  const technical = computeTechnicalSizing(input, layout);
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
      edges,
      trace: [...trace, 'Panier commercial conservé ; validation technique finale encore requise avant commande.'],
    };
  }

  const structure = computeStructure(input, technical.boardMaxSupportSpacingMm, technical.joistMaxSupportSpacingMm, layout);
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
    edges,
    trace,
  };
}
