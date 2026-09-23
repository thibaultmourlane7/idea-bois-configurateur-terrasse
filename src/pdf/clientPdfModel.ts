import type { BasketLine, ConfiguratorResult, ProjectInput } from '../domain/types';
import { getDeckOutlinePointsM } from '../engine/geometry';
import { computeTerraceEdges, EDGE_CONTEXT_LABELS, EDGE_TREATMENT_LABELS } from '../engine/edges';
import { computeTerrainModel } from '../engine/terrain';
import { computeStairs } from '../engine/stairs';
import { computeGuardrails } from '../engine/guardrails';

export interface ClientPdfLine {
  family: string;
  label: string;
  reference: string;
  quantity: string;
  price: string;
  detail?: string;
  status: 'calcule' | 'fourchette' | 'indicatif' | 'a-confirmer';
}

export interface ClientPdfModel {
  projectName: string;
  generatedAt: string;
  version: string;
  shape: string;
  dimensions: string;
  surface: string;
  grossSurface: string;
  excludedSurface: string;
  perimeter: string;
  obstacles: string;
  obstacleDetails: string[];
  edgeDimensions: string[];
  support: string;
  supportSystem: string;
  height: string;
  decking: string;
  orientation: string;
  layingPattern: string;
  finishes: string;
  boardLayout: string;
  stockSummary: string;
  structureSummary: string;
  plotSummary: string;
  levelSummary: string;
  referencePlanSummary: string;
  basketStatus: 'complete' | 'range' | 'partial';
  budgetLabel: string;
  budgetValue: string;
  lines: ClientPdfLine[];
  sources: string[];
  warnings: string[];
  clientNote: string;
}

const fmt = (value: number, digits = 2) =>
  value.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

const eur = (value: number) => `${fmt(value, 2)} EUR`;

const familyLabels: Record<BasketLine['family'], string> = {
  decking: 'Lames',
  joists: 'Lambourdes',
  supports: 'Plots / appuis',
  fixings: 'Fixations',
  protection: 'Protection',
  accessories: 'Accessoires',
};

function quantity(line: BasketLine): string {
  if (line.quantity != null) return `${fmt(line.quantity)} ${line.unit}`;
  if (line.quantityMin != null && line.quantityMax != null) return `${fmt(line.quantityMin)} a ${fmt(line.quantityMax)} ${line.unit}`;
  return 'A confirmer';
}

function price(line: BasketLine): string {
  if (line.totalTtc != null) return eur(line.totalTtc);
  if (line.totalMinTtc != null && line.totalMaxTtc != null) return `${eur(line.totalMinTtc)} a ${eur(line.totalMaxTtc)}`;
  return 'A confirmer';
}

function lineStatus(line: BasketLine): ClientPdfLine['status'] {
  if (line.status === 'exact') return 'calcule';
  if (line.status === 'range') return 'fourchette';
  if (line.status === 'informative') return 'indicatif';
  return 'a-confirmer';
}

function supportLabel(input: ProjectInput): string {
  if (input.supportType === 'existing-concrete-slab') return 'Dalle beton existante';
  if (input.supportType === 'new-concrete-slab') return 'Dalle beton neuve';
  return 'Sol stabilise';
}

function supportSystemLabel(input: ProjectInput): string {
  if (input.supportSystem === 'adjustable-pedestals') return 'Plots reglables';
  if (input.supportSystem === 'pads') return 'Cales / appuis fixes';
  return 'A confirmer';
}

function shapeLabel(input: ProjectInput): string {
  if (input.shape === 'l-shape') return 'Forme en L';
  if (input.shape === 't-shape') return 'Forme en T';
  if (input.shape === 'u-shape') return 'Forme en U';
  if (input.shape === 'circle') return 'Cercle';
  if (input.shape === 'freeform') return 'Forme libre';
  return 'Rectangle';
}

function dimensionLabel(input: ProjectInput): string {
  const g = input.dimensions;
  if (input.shape === 'circle') return `Diametre ${fmt(g.circleDiameterM)} m`;
  if (input.shape === 'freeform') {
    const points = input.freeformPoints ?? [];
    const xs = points.map((point) => point.xM);
    const ys = points.map((point) => point.yM);
    const width = points.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const height = points.length ? Math.max(...ys) - Math.min(...ys) : 0;
    return `${points.length} sommets - emprise ${fmt(width)} x ${fmt(height)} m`;
  }
  if (input.shape === 'l-shape') return `${fmt(g.lengthM)} x ${fmt(g.widthM)} m - decroche ${fmt(g.notchLengthM)} x ${fmt(g.notchWidthM)} m`;
  if (input.shape === 't-shape') return `${fmt(g.lengthM)} x ${fmt(g.widthM)} m - pied ${fmt(g.tStemWidthM)} m - barre ${fmt(g.tBarDepthM)} m`;
  if (input.shape === 'u-shape') return `${fmt(g.lengthM)} x ${fmt(g.widthM)} m - ouverture ${fmt(g.uOpeningWidthM)} x ${fmt(g.uOpeningDepthM)} m`;
  return `${fmt(g.lengthM)} m x ${fmt(g.widthM)} m`;
}

function layingPatternLabel(input: ProjectInput): string {
  if (input.layingPattern === 'half') return 'Pose decalee 1/2';
  if (input.layingPattern === 'third') return 'Pose decalee 1/3';
  return 'Pose entiere / droite';
}

function edgeDimensions(input: ProjectInput): string[] {
  if (input.shape === 'circle') return [`Diametre : ${fmt(input.dimensions.circleDiameterM)} m`];
  const outline = getDeckOutlinePointsM(input);
  return outline.map((point, index) => {
    const next = outline[(index + 1) % outline.length];
    const length = Math.hypot(next.x - point.x, next.y - point.y);
    const a = String.fromCharCode(65 + (index % 26));
    const b = String.fromCharCode(65 + ((index + 1) % 26));
    return `${a}${b} : ${fmt(length)} m`;
  });
}

function obstacleDetails(input: ProjectInput): string[] {
  return input.obstacles.map((obstacle) => {
    const position = `X ${fmt(obstacle.xM)} m / Y ${fmt(obstacle.yM)} m`;
    if (obstacle.shape === 'circle') return `${obstacle.label} - Ø ${fmt(obstacle.diameterM ?? 0)} m - ${position}`;
    return `${obstacle.label} - ${fmt(obstacle.widthM ?? 0)} x ${fmt(obstacle.heightM ?? 0)} m - ${position}`;
  });
}

function stockBreakdownText(line: BasketLine): string | undefined {
  if (!line.stockBreakdown?.length) return undefined;
  const detail = line.stockBreakdown
    .map((item) => `${item.quantity} x ${fmt(item.lengthMm / 1000)} m${item.productRef ? ` (${item.productRef})` : ''}`)
    .join(' + ');
  const unmapped = line.stockBreakdown.some((item) => !item.productRef);
  return `Longueurs a commander : ${detail}. ${unmapped ? 'Les longueurs sans SKU restent non associees tant que la page produit exacte n est pas verifiee.' : 'Les SKU affiches sont verifies par longueur.'}`;
}

function directionLabel(input: ProjectInput): string {
  const direction = input.layingDirection ?? input.orientation;
  if (direction === 'width') return 'Dans la largeur';
  if (direction === 'diagonal-45') return 'Diagonale +45 deg';
  if (direction === 'diagonal--45') return 'Diagonale -45 deg';
  return 'Dans la longueur';
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

export function buildClientPdfModel(
  input: ProjectInput,
  result: ConfiguratorResult,
  version: string,
  generatedAt = new Date().toLocaleDateString('fr-FR'),
): ClientPdfModel {
  if (!result.geometry) throw new Error('Geometrie indisponible pour le PDF client.');

  const basket = result.basket;
  const basketStatus = basket?.status ?? 'partial';
  const budgetLabel = basketStatus === 'complete'
    ? 'TOTAL MATERIEL TTC'
    : basketStatus === 'range'
      ? 'BUDGET MATERIEL TTC'
      : 'SOUS-TOTAL DEJA CHIFFRE';
  const budgetValue = basketStatus === 'complete'
    ? eur(basket?.totalTtc ?? 0)
    : basketStatus === 'range'
      ? `${eur(basket?.totalMinTtc ?? 0)} a ${eur(basket?.totalMaxTtc ?? 0)}`
      : eur(basket?.knownSubtotalTtc ?? 0);

  const edgeResults = computeTerraceEdges(input);
  const treatedEdges = edgeResults.filter((edge) => edge.treatment !== 'none');
  const finishParts = [
    input.edgeFinishMode === 'full-perimeter'
      ? `Habillage lateral du pourtour - hauteur ${fmt(input.edgeCladdingHeightCm)} cm`
      : input.edgeFinishMode === 'per-edge'
        ? treatedEdges.length
          ? treatedEdges.map((edge) => `${edge.label}: ${EDGE_CONTEXT_LABELS[edge.context]} / ${EDGE_TREATMENT_LABELS[edge.treatment]}`).join(' ; ')
          : 'Rives configurees sans traitement materiel'
        : 'Sans habillage lateral',
  ];
  if (input.supportType === 'stabilized-ground') finishParts.push(input.includeGeotextile ? 'Geotextile inclus' : 'Sans geotextile');
  if (guardrails.length) {
    finishParts.push(`${guardrails.length} garde-corps - ${guardrails.reduce((sum, guardrail) => sum + (guardrail.postCount ?? 0), 0)} poteau(x) - ${guardrails.reduce((sum, guardrail) => sum + (guardrail.sectionCount ?? 0), 0)} section(s)`);
  }

  const lines = (basket?.lines ?? []).map((line): ClientPdfLine => ({
    family: familyLabels[line.family],
    label: line.label,
    reference: line.productRef ?? '-',
    quantity: quantity(line),
    price: price(line),
    detail: stockBreakdownText(line),
    status: lineStatus(line),
  }));

  const layout = result.layout;
  const supportPlan = result.supportPlan;
  const terrain = computeTerrainModel(input);
  const stairs = computeStairs(input).filter((stair) => stair.status === 'ready');
  const guardrails = computeGuardrails(input).filter((guardrail) => guardrail.status === 'ready');
  const jointAxisCount = layout
    ? layout.zones.reduce((sum, zone) => sum + zone.buttJointAxisPositionsMm.length, 0)
    : 0;
  const perimeterJoists = supportPlan?.joistSegments.filter((segment) => segment.role === 'perimeter').length ?? 0;
  const zoneBoundaryJoists = supportPlan?.joistSegments.filter((segment) => segment.role === 'zone-boundary').length ?? 0;
  const doubleJoists = supportPlan?.joistSegments.filter((segment) => segment.multiplicity === 2).length ?? 0;

  const boardLayout = layout
    ? `${layout.rowCount} rangees - ${layout.boardSegments.length} segments poses - ${layout.buttJoints.length} raccords sur ${jointAxisCount} axe(s) locaux - ${layout.zones.length} zone(s) de pose - ${layout.productSummaries.length} reference(s) de lame`
    : 'Calepinage final a confirmer';

  const stockSummary = layout
    ? layout.productSummaries.map((summary) => {
        const grouped = new Map<number, number>();
        for (const stock of summary.stockBoards) grouped.set(stock.stockLengthMm, (grouped.get(stock.stockLengthMm) ?? 0) + 1);
        const breakdown = [...grouped.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([lengthMm, qty]) => `${qty} x ${fmt(lengthMm / 1000)} m`)
          .join(' + ');
        return `${summary.boardLabel}: ${summary.stockBoards.length} lames commerciales - ${breakdown} - ${fmt(summary.purchasedLinearM)} ml - chute ${fmt(summary.wastePercent, 1)} % - zones ${summary.zoneIds.join(', ')}`;
      }).join(' | ')
    : 'Longueurs de commande a confirmer';

  const structureSummary = supportPlan && supportPlan.status !== 'unavailable'
    ? `${supportPlan.joistStockBoards.length} lambourdes commerciales - ${fmt(supportPlan.joistLinearM)} ml - entraxe ${supportPlan.joistSpacingMm ?? 0} mm - ${perimeterJoists} segment(s) de contour - ${zoneBoundaryJoists} separation(s) de zone - ${doubleJoists} segment(s) doubles`
    : 'Structure a confirmer pour cette gamme';

  const plotCount = supportPlan?.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0) ?? 0;
  const plotSummary = supportPlan && supportPlan.status !== 'unavailable'
    ? `${plotCount} appuis - entraxe maxi ${supportPlan.plotSpacingMm ?? 0} mm - hauteurs ${fmt(supportPlan.minRequiredPlotHeightMm ?? 0, 0)} a ${fmt(supportPlan.maxRequiredPlotHeightMm ?? 0, 0)} mm - statut ${supportPlan.status}`
    : supportSystemLabel(input);

  const level = input.supportLevelProfile;
  const baseLevelSummary = level
    ? `Support ${level.mode === 'flat' ? 'plan' : '4 coins'} - ecarts TL/TR/BR/BL : ${fmt(level.topLeftDeltaMm, 0)}/${fmt(level.topRightDeltaMm, 0)}/${fmt(level.bottomRightDeltaMm, 0)}/${fmt(level.bottomLeftDeltaMm, 0)} mm - pente finie X ${fmt(level.targetSlopeXPercent)} % / Y ${fmt(level.targetSlopeYPercent)} %`
    : 'Niveaux non renseignes';
  const terrainSummary = terrain.platforms.length > 1
    ? `${baseLevelSummary} - ${terrain.platforms.length} plateformes - ${terrain.transitionCount} transition(s) de niveau - offsets finis ${fmt(terrain.minFinishedDeltaMm, 0)} a ${fmt(terrain.maxFinishedDeltaMm, 0)} mm`
    : baseLevelSummary;
  const levelSummary = stairs.length
    ? `${terrainSummary} - ${stairs.length} escalier(s) / ${stairs.reduce((sum, stair) => sum + (stair.stepCount ?? 0), 0)} marche(s)`
    : terrainSummary;

  const referencePlanSummary = input.referencePlan
    ? input.referencePlan.calibrated
      ? `Fond calibre - distance etalon ${fmt((input.referencePlan.calibrationDistanceMm ?? 0) / 1000)} m - rotation ${fmt(input.referencePlan.rotationDeg, 0)} deg`
      : 'Fond importe mais calibration metrique a refaire'
    : 'Aucun fond plan/photo attache au projet';

  const sources = unique([
    input.board.catalog?.sourceUrl,
    input.board.technical.sourceLabel,
    supportPlan?.sourceUrl,
    ...((basket?.lines ?? []).map((line) => line.sourceUrl)),
  ]);

  const warnings = unique([
    ...result.diagnostics
      .filter((item) => item.severity !== 'info')
      .map((item) => `${item.tag} - ${item.message}`),
    ...((basket?.lines ?? [])
      .filter((line) => line.status === 'pending' || line.status === 'informative')
      .map((line) => `${line.label} - ${line.note ?? 'A confirmer'}`)),
  ]);

  const clientNote = basketStatus === 'complete'
    ? 'Les quantites et prix ci-dessus constituent le panier materiel calcule pour cette configuration.'
    : basketStatus === 'range'
      ? 'Le budget comporte une fourchette issue de consommations fabricant publiees sous forme de plage.'
      : 'Certaines lignes restent a confirmer avant commande. Elles ne sont pas ajoutees au sous-total affiche.';

  return {
    projectName: input.projectName || 'Mon projet terrasse',
    generatedAt,
    version,
    shape: shapeLabel(input),
    dimensions: dimensionLabel(input),
    surface: `${fmt(result.geometry.areaM2)} m2`,
    grossSurface: `${fmt(result.geometry.grossAreaM2)} m2`,
    excludedSurface: `${fmt(result.geometry.excludedAreaM2)} m2`,
    perimeter: `${fmt(result.geometry.perimeterM)} ml`,
    obstacles: input.obstacles.length ? input.obstacles.map((obstacle) => obstacle.label).join(', ') : 'Aucune reservation',
    obstacleDetails: obstacleDetails(input),
    edgeDimensions: edgeDimensions(input),
    support: supportLabel(input),
    supportSystem: plotSummary,
    height: `${fmt(input.heightCm)} cm (reference)`,
    decking: input.board.label,
    orientation: directionLabel(input),
    layingPattern: layingPatternLabel(input),
    finishes: finishParts.join(' - '),
    boardLayout,
    stockSummary,
    structureSummary,
    plotSummary,
    levelSummary,
    referencePlanSummary,
    basketStatus,
    budgetLabel,
    budgetValue,
    lines,
    sources,
    warnings,
    clientNote,
  };
}
