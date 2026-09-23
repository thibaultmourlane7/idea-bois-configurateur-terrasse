import type { BasketLine, ConfiguratorResult, Diagnostic, ProjectInput } from '../domain/types';
import { buildClientPdfModel } from './clientPdfModel';
import { getProductCompatibility, findBoard } from '../catalog/compatibility';
import { EDGE_CONTEXT_LABELS, EDGE_TREATMENT_LABELS } from '../engine/edges';
import { computeTerrainModel } from '../engine/terrain';

export type SiteDossierStatus = 'ready' | 'with-warnings' | 'blocked';

export interface SiteDossierZone {
  id: string;
  label: string;
  boardId: string;
  boardLabel: string;
  direction: string;
  pattern: string;
  start: string;
  rowCount: number;
  buttJointAxisCount: number;
}

export interface SiteDossierProduct {
  boardId: string;
  boardLabel: string;
  zones: string[];
  requiredLinearM: number;
  purchasedLinearM: number;
  wasteLinearM: number;
  wastePercent: number;
  purchasedAreaM2: number;
  stockBoardCount: number;
  stockBreakdown: string[];
  reusedOffcutCount: number;
  finalRemainingMm: number;
  cutRulesStatus: 'pending-manufacturer-validation' | 'validated';
  cutRulesNote: string;
}

export interface SiteDossierStructure {
  status: 'exact' | 'partial' | 'unavailable';
  joistSpacingMm?: number;
  plotSpacingMm?: number;
  joistSegmentCount: number;
  joistLinearM: number;
  doubleJoistLinearM: number;
  joistStockCount: number;
  buttJointAxisCount: number;
  perimeterJoistCount: number;
  zoneBoundaryJoistCount: number;
  supportPointCount: number;
  unsupportedPointCount: number;
  minRequiredPlotHeightMm?: number;
  maxRequiredPlotHeightMm?: number;
  plotGroups: Array<{
    label: string;
    productRef?: string;
    quantity: number;
    minHeightMm: number;
    maxHeightMm: number;
  }>;
  note?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface SiteDossierEdge {
  label: string;
  lengthM: number;
  context: string;
  treatment: string;
  note?: string;
}

export interface SiteDossierPurchaseLine {
  id: string;
  family: string;
  label: string;
  reference?: string;
  quantity: string;
  amount: string;
  status: BasketLine['status'];
  note?: string;
}

export interface SiteDossierCutLine {
  boardId: string;
  boardLabel: string;
  zoneId: string;
  stockBoardId: string;
  stockLengthMm: number;
  cutId: string;
  pieceId: string;
  cutLengthMm: number;
  sourceId: string;
  sourceType: 'stock-board' | 'offcut';
  remainingAfterMm: number;
  resultingOffcutId?: string;
}

export interface SiteDossierIssue {
  tag: string;
  severity: Diagnostic['severity'] | 'pending';
  message: string;
  source?: string;
}

export interface SiteDossierCompatibility {
  boardLabel: string;
  overall: 'validated' | 'partial' | 'missing';
  rows: Array<{ family: string; state: 'validated' | 'partial' | 'missing'; detail: string }>;
}

export interface SiteDossierTerrain {
  platforms: Array<{
    id: string;
    label: string;
    isMain: boolean;
    finishedLevelOffsetMm: number;
    supportLevelOffsetMm: number;
    targetSlopeXPercent: number;
    targetSlopeYPercent: number;
  }>;
  relations: Array<{
    id: string;
    aLabel: string;
    bLabel: string;
    sharedBoundaryLengthM: number;
    finishedDeltaMinMm: number;
    finishedDeltaMaxMm: number;
    supportDeltaMinMm: number;
    supportDeltaMaxMm: number;
    transitionRequired: boolean;
  }>;
  transitionCount: number;
}

export interface SiteDossierModel {
  projectName: string;
  generatedAt: string;
  version: string;
  status: SiteDossierStatus;
  clientSummary: ReturnType<typeof buildClientPdfModel>;
  zones: SiteDossierZone[];
  products: SiteDossierProduct[];
  structure: SiteDossierStructure;
  terrain: SiteDossierTerrain;
  edges: SiteDossierEdge[];
  /** Liste d'achat = produits à fournir. */
  purchaseList: SiteDossierPurchaseLine[];
  /** Liste de débit = découpes atelier/chantier, distincte de la liste d'achat. */
  cutList: SiteDossierCutLine[];
  /** Six plans séparés exigés par la roadmap V1. */
  planManifest: Array<'general' | 'boards' | 'structure' | 'supports' | 'cuts' | 'finishes'>;
  issues: SiteDossierIssue[];
  compatibility: SiteDossierCompatibility[];
  trace: string[];
  sources: string[];
  scopeNote: string;
}

const directionLabel = (value: string) =>
  value === 'width' ? 'largeur'
    : value === 'diagonal-45' ? 'diagonale +45°'
      : value === 'diagonal--45' ? 'diagonale -45°'
        : 'longueur';

const patternLabel = (value: string) =>
  value === 'half' ? 'décalage 1/2'
    : value === 'third' ? 'décalage 1/3'
      : 'pose droite';

const startLabel = (value: string) =>
  value === 'right' ? 'droite'
    : value === 'top' ? 'haut'
      : value === 'bottom' ? 'bas'
        : value === 'edge' ? 'rive choisie'
          : 'gauche';

function stockBreakdown(summary: NonNullable<ConfiguratorResult['layout']>['productSummaries'][number]): string[] {
  const grouped = new Map<number, number>();
  for (const board of summary.stockBoards) {
    grouped.set(board.stockLengthMm, (grouped.get(board.stockLengthMm) ?? 0) + 1);
  }
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lengthMm, quantity]) => `${quantity} × ${(lengthMm / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m`);
}

function quantityLabel(line: BasketLine): string {
  if (line.quantity != null) return `${line.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${line.unit}`;
  if (line.quantityMin != null && line.quantityMax != null) {
    return `${line.quantityMin.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}–${line.quantityMax.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${line.unit}`;
  }
  return 'À confirmer';
}

function amountLabel(line: BasketLine): string {
  const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  if (line.totalTtc != null) return euro(line.totalTtc);
  if (line.totalMinTtc != null && line.totalMaxTtc != null) return `${euro(line.totalMinTtc)} – ${euro(line.totalMaxTtc)}`;
  return 'À confirmer';
}

function compatibilityFor(boardId: string, fallback: ProjectInput['board']): SiteDossierCompatibility {
  const board = findBoard(boardId) ?? fallback;
  const profile = getProductCompatibility(board);
  const rows = [
    { family: 'Catalogue', item: profile.catalog },
    { family: 'Calepinage', item: profile.layout },
    { family: 'Structure', item: profile.structure },
    { family: 'Fixations', item: profile.fixings },
    { family: 'Plots / appuis', item: profile.supports },
    { family: 'Rives / finitions', item: profile.edgeFinish },
    { family: 'Produit par zone', item: profile.zoneProduct },
  ];
  return {
    boardLabel: board.label,
    overall: profile.overall,
    rows: rows.map(({ family, item }) => ({
      family,
      state: item.state,
      detail: `${item.label} — ${item.detail}`,
    })),
  };
}

export function buildSiteDossierModel(
  input: ProjectInput,
  result: ConfiguratorResult,
  version: string,
  generatedAt = new Date().toLocaleDateString('fr-FR'),
): SiteDossierModel {
  if (!result.geometry) throw new Error('SA-TERR-DOSSIER-001: géométrie indisponible.');

  const clientSummary = buildClientPdfModel(input, result, version, generatedAt);
  const terrainModel = computeTerrainModel(input);
  const layout = result.layout;
  const supportPlan = result.supportPlan;
  const blocking = result.diagnostics.filter((item) => item.severity === 'blocking');
  const warnings = result.diagnostics.filter((item) => item.severity === 'warning');
  const pendingLines = (result.basket?.lines ?? []).filter((line) => line.status === 'pending' || line.status === 'informative');

  const status: SiteDossierStatus = blocking.length
    ? 'blocked'
    : warnings.length || pendingLines.length || supportPlan?.status === 'partial'
      ? 'with-warnings'
      : 'ready';

  const zones: SiteDossierZone[] = (layout?.zones ?? []).map((zone) => ({
    id: zone.id,
    label: zone.label,
    boardId: zone.boardId,
    boardLabel: zone.boardLabel,
    direction: directionLabel(zone.direction),
    pattern: patternLabel(zone.pattern),
    start: startLabel(zone.start),
    rowCount: zone.rowCount,
    buttJointAxisCount: zone.buttJointAxisPositionsMm.length,
  }));

  const products: SiteDossierProduct[] = (layout?.productSummaries ?? []).map((summary) => ({
    boardId: summary.boardId,
    boardLabel: summary.boardLabel,
    zones: summary.zoneIds,
    requiredLinearM: summary.totalRequiredLinearM,
    purchasedLinearM: summary.purchasedLinearM,
    wasteLinearM: summary.wasteLinearM,
    wastePercent: summary.wastePercent,
    purchasedAreaM2: summary.purchasedAreaM2,
    stockBoardCount: summary.stockBoards.length,
    stockBreakdown: stockBreakdown(summary),
    reusedOffcutCount: summary.cutOptimization.reusedOffcutCount,
    finalRemainingMm: summary.cutOptimization.finalRemainingMm,
    cutRulesStatus: summary.cutOptimization.rules.status,
    cutRulesNote: summary.cutOptimization.rules.note,
  }));

  const structure: SiteDossierStructure = supportPlan ? {
    status: supportPlan.status,
    joistSpacingMm: supportPlan.joistSpacingMm,
    plotSpacingMm: supportPlan.plotSpacingMm,
    joistSegmentCount: supportPlan.joistSegments.length,
    joistLinearM: supportPlan.joistLinearM,
    doubleJoistLinearM: supportPlan.doubleJoistLinearM,
    joistStockCount: supportPlan.joistStockBoards.length,
    buttJointAxisCount: supportPlan.buttJointAxisCount ?? supportPlan.buttJointAxisPositionsMm.length,
    perimeterJoistCount: supportPlan.joistSegments.filter((item) => item.role === 'perimeter').length,
    zoneBoundaryJoistCount: supportPlan.joistSegments.filter((item) => item.role === 'zone-boundary').length,
    supportPointCount: supportPlan.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0),
    unsupportedPointCount: supportPlan.unsupportedPointCount,
    minRequiredPlotHeightMm: supportPlan.minRequiredPlotHeightMm,
    maxRequiredPlotHeightMm: supportPlan.maxRequiredPlotHeightMm,
    plotGroups: supportPlan.plotGroups.map((group) => ({
      label: group.label,
      productRef: group.productRef,
      quantity: group.quantity,
      minHeightMm: group.minHeightMm,
      maxHeightMm: group.maxHeightMm,
    })),
    note: supportPlan.note,
    sourceLabel: supportPlan.sourceLabel,
    sourceUrl: supportPlan.sourceUrl,
  } : {
    status: 'unavailable',
    joistSegmentCount: 0,
    joistLinearM: 0,
    doubleJoistLinearM: 0,
    joistStockCount: 0,
    buttJointAxisCount: 0,
    perimeterJoistCount: 0,
    zoneBoundaryJoistCount: 0,
    supportPointCount: 0,
    unsupportedPointCount: 0,
    plotGroups: [],
    note: 'Plan de structure indisponible.',
  };

  const edges: SiteDossierEdge[] = (result.edges ?? []).map((edge) => ({
    label: edge.label,
    lengthM: edge.lengthM,
    context: EDGE_CONTEXT_LABELS[edge.context],
    treatment: EDGE_TREATMENT_LABELS[edge.treatment],
    note: edge.note,
  }));

  const purchaseList: SiteDossierPurchaseLine[] = (result.basket?.lines ?? []).map((line) => ({
    id: line.id,
    family: line.family,
    label: line.label,
    reference: line.productRef,
    quantity: quantityLabel(line),
    amount: amountLabel(line),
    status: line.status,
    note: line.note,
  }));

  const cutList: SiteDossierCutLine[] = [];
  for (const summary of layout?.productSummaries ?? []) {
    const pieceZones = new Map(summary.requiredPieces.map((piece) => [piece.id, piece.zoneId ?? 'main']));
    for (const stock of summary.stockBoards) {
      for (const cut of stock.cuts) {
        cutList.push({
          boardId: summary.boardId,
          boardLabel: summary.boardLabel,
          zoneId: pieceZones.get(cut.pieceId) ?? 'main',
          stockBoardId: stock.id,
          stockLengthMm: stock.stockLengthMm,
          cutId: cut.id,
          pieceId: cut.pieceId,
          cutLengthMm: cut.lengthMm,
          sourceId: cut.sourceId,
          sourceType: cut.sourceType,
          remainingAfterMm: cut.remainingAfterMm,
          resultingOffcutId: cut.resultingOffcutId,
        });
      }
    }
  }

  const issues: SiteDossierIssue[] = [
    ...result.diagnostics
      .filter((item) => item.severity !== 'info')
      .map((item) => ({
        tag: item.tag,
        severity: item.severity,
        message: item.technicalMessage ? `${item.message} — ${item.technicalMessage}` : item.message,
        source: item.source,
      })),
    ...pendingLines.map((line) => ({
      tag: `PANIER-${line.id}`,
      severity: 'pending' as const,
      message: `${line.label} — ${line.note ?? 'Donnée à confirmer avant commande.'}`,
      source: line.sourceUrl,
    })),
  ];

  if (layout) {
    for (const summary of layout.productSummaries) {
      if (summary.cutOptimization.rules.status !== 'validated') {
        issues.push({
          tag: `CUT-${summary.boardId}`,
          severity: 'pending',
          message: `${summary.boardLabel} — ${summary.cutOptimization.rules.note}`,
        });
      }
    }
  }

  const boardIds = [...new Set([
    input.board.id,
    ...(layout?.productSummaries.map((summary) => summary.boardId) ?? []),
  ])];
  const compatibility = boardIds.map((boardId) => compatibilityFor(boardId, input.board));

  const sources = [...new Set([
    ...clientSummary.sources,
    ...issues.map((issue) => issue.source),
    ...boardIds.map((boardId) => findBoard(boardId)?.catalog?.sourceUrl),
  ].filter((value): value is string => Boolean(value?.trim())))];

  return {
    projectName: input.projectName || 'Mon projet terrasse',
    generatedAt,
    version,
    status,
    clientSummary,
    zones,
    products,
    structure,
    terrain: {
      platforms: terrainModel.platforms.map((platform) => ({
        id: platform.id,
        label: platform.label,
        isMain: platform.isMain,
        finishedLevelOffsetMm: platform.finishedLevelOffsetMm,
        supportLevelOffsetMm: platform.supportLevelOffsetMm,
        targetSlopeXPercent: platform.targetSlopeXPercent,
        targetSlopeYPercent: platform.targetSlopeYPercent,
      })),
      relations: terrainModel.relations.map((relation) => ({
        id: relation.id,
        aLabel: relation.aLabel,
        bLabel: relation.bLabel,
        sharedBoundaryLengthM: relation.sharedBoundaryLengthM,
        finishedDeltaMinMm: relation.finishedDeltaMinMm,
        finishedDeltaMaxMm: relation.finishedDeltaMaxMm,
        supportDeltaMinMm: relation.supportDeltaMinMm,
        supportDeltaMaxMm: relation.supportDeltaMaxMm,
        transitionRequired: relation.transitionRequired,
      })),
      transitionCount: terrainModel.transitionCount,
    },
    edges,
    purchaseList,
    cutList,
    planManifest: ['general', 'boards', 'structure', 'supports', 'cuts', 'finishes'],
    issues,
    compatibility,
    trace: [...result.trace],
    sources,
    scopeNote: 'Dossier matériaux et implantation issu du configurateur. Aucune main-d’œuvre, durée de pose ou donnée critique absente n’est inventée. Les éléments signalés « à confirmer » doivent être validés avant commande ou exécution.',
  };
}
