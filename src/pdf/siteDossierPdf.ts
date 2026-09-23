import { jsPDF } from 'jspdf';
import type { ConfiguratorResult, ProjectInput } from '../domain/types';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from '../engine/geometry';
import { buildSiteDossierModel, type SiteDossierModel } from './siteDossierModel';

type Pdf = InstanceType<typeof jsPDF>;

const BLUE = [25, 118, 210] as const;
const NAVY = [23, 50, 77] as const;
const MUTED = [102, 119, 133] as const;
const LINE = [218, 228, 236] as const;
const SOFT = [247, 250, 252] as const;
const GREEN = [30, 138, 85] as const;
const AMBER = [168, 112, 26] as const;
const RED = [174, 63, 63] as const;

function clean(value: string): string {
  return value.replace(/[–—]/g, '-').replace(/[’]/g, "'").replace(/\u00a0/g, ' ');
}

function safeFileName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'projet-terrasse';
}

function text(doc: Pdf, value: string, x: number, y: number, size = 9, bold = false, color: readonly number[] = NAVY) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(clean(value), x, y);
}

function wrapped(doc: Pdf, value: string, x: number, y: number, width: number, size = 7.5, color: readonly number[] = MUTED): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(clean(value), width) as string[];
  doc.text(lines, x, y);
  return y + Math.max(4.4, lines.length * 3.8);
}

function header(doc: Pdf, title: string, page: number) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.roundedRect(14, 8, 10, 10, 2, 2, 'F');
  text(doc, 'IB', 19, 15.2, 8, true, [255, 255, 255]);
  text(doc, 'IDEA BOIS x SPEEDARTI', 29, 11.5, 7.2, true, BLUE);
  text(doc, title, 29, 17, 11.5, true, NAVY);
  text(doc, `Page ${page}`, 180, 15, 7, false, MUTED);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, 23, 196, 23);
}

function footer(doc: Pdf, version: string) {
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, 282, 196, 282);
  text(doc, 'Dossier materiaux et implantation - aucune main-d oeuvre ni duree de pose.', 14, 287, 6.7, false, MUTED);
  text(doc, version, 169, 287, 6.7, false, MUTED);
}

function newPage(doc: Pdf, title: string, version: string): number {
  if (doc.getNumberOfPages() > 0) footer(doc, version);
  doc.addPage();
  const page = doc.getNumberOfPages();
  header(doc, title, page);
  return 34;
}

function statusColor(status: SiteDossierModel['status']): readonly number[] {
  return status === 'ready' ? GREEN : status === 'with-warnings' ? AMBER : RED;
}

function statusLabel(status: SiteDossierModel['status']): string {
  return status === 'ready' ? 'PRET POUR CONTROLE CHANTIER' : status === 'with-warnings' ? 'AVEC POINTS A CONFIRMER' : 'BLOQUE - CORRECTIONS REQUISES';
}

function cell(doc: Pdf, label: string, value: string, x: number, y: number, width: number, height = 18) {
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  text(doc, label.toUpperCase(), x + 3, y + 5.5, 6.1, true, MUTED);
  const lines = doc.splitTextToSize(clean(value), width - 6) as string[];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(lines.slice(0, 2), x + 3, y + 12);
}

function drawPlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number, structure = false) {
  const bounds = getDeckBoundingSizeM(input);
  const scale = Math.min((width - 8) / Math.max(.1, bounds.lengthM), (height - 8) / Math.max(.1, bounds.widthM));
  const ox = x + (width - bounds.lengthM * scale) / 2;
  const oy = y + (height - bounds.widthM * scale) / 2;
  const outline = getDeckOutlinePointsM(input);
  const points = outline.map((point) => [ox + point.x * scale, oy + point.y * scale] as const);
  if (points.length < 3) return;
  const first = points[0];
  const vectors = points.slice(1).map((point, index) => [point[0] - points[index][0], point[1] - points[index][1]]);

  doc.setFillColor(249, 251, 253);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  doc.setDrawColor(24, 63, 100);
  doc.setLineWidth(.55);
  doc.lines(vectors, first[0], first[1], [1, 1], 'S', true);

  if (!structure) {
    doc.setDrawColor(125, 91, 58);
    doc.setLineWidth(.22);
    for (const segment of result.layout?.boardSegments ?? []) {
      if (segment.x1M == null || segment.y1M == null || segment.x2M == null || segment.y2M == null) continue;
      doc.line(ox + segment.x1M * scale, oy + segment.y1M * scale, ox + segment.x2M * scale, oy + segment.y2M * scale);
    }
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.setLineDashPattern([2, 1.2], 0);
    for (const zone of input.layingZones ?? []) {
      const zonePoints = zone.points.map((point) => [ox + point.xM * scale, oy + point.yM * scale] as const);
      if (zonePoints.length < 3) continue;
      const z0 = zonePoints[0];
      const zv = zonePoints.slice(1).map((point, index) => [point[0] - zonePoints[index][0], point[1] - zonePoints[index][1]]);
      doc.lines(zv, z0[0], z0[1], [1, 1], 'S', true);
    }
    doc.setLineDashPattern([], 0);
  } else {
    const plan = result.supportPlan;
    for (const joist of plan?.joistSegments ?? []) {
      const perimeter = joist.role === 'perimeter';
      const boundary = joist.role === 'zone-boundary';
      doc.setDrawColor(perimeter ? 54 : boundary ? 25 : 107, perimeter ? 95 : boundary ? 118 : 77, perimeter ? 122 : boundary ? 210 : 49);
      doc.setLineWidth(perimeter ? 1.05 : boundary ? .9 : joist.multiplicity === 2 ? 1.3 : .65);
      doc.line(ox + joist.x1M * scale, oy + joist.y1M * scale, ox + joist.x2M * scale, oy + joist.y2M * scale);
    }
    for (const point of plan?.supportPoints ?? []) {
      doc.setFillColor(point.status === 'unsupported' ? RED[0] : 47, point.status === 'unsupported' ? RED[1] : 63, point.status === 'unsupported' ? RED[2] : 75);
      doc.circle(ox + point.xM * scale, oy + point.yM * scale, point.multiplicity === 2 ? 1.1 : .8, 'F');
    }
  }

  for (const obstacle of input.obstacles) {
    doc.setFillColor(230, 236, 240);
    if (obstacle.shape === 'circle') {
      const d = obstacle.diameterM ?? 0;
      doc.circle(ox + (obstacle.xM + d / 2) * scale, oy + (obstacle.yM + d / 2) * scale, (d / 2) * scale, 'F');
    } else {
      doc.rect(ox + obstacle.xM * scale, oy + obstacle.yM * scale, (obstacle.widthM ?? 0) * scale, (obstacle.heightM ?? 0) * scale, 'F');
    }
  }
}

function ensure(doc: Pdf, y: number, needed: number, title: string, version: string): number {
  return y + needed > 276 ? newPage(doc, title, version) : y;
}

function row(doc: Pdf, y: number, title: string, detail: string, right?: string): number {
  const detailLines = doc.splitTextToSize(clean(detail), right ? 128 : 164) as string[];
  const height = Math.max(14, 8 + detailLines.length * 3.7);
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  doc.roundedRect(14, y - 2, 182, height, 2, 2, 'F');
  text(doc, title, 18, y + 4, 7.3, true, NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(detailLines, 18, y + 9);
  if (right) text(doc, right, 151, y + 5, 7.2, true, NAVY);
  return y + height + 3;
}

export async function generateSiteDossierPdf(input: ProjectInput, result: ConfiguratorResult, version: string): Promise<void> {
  const model = buildSiteDossierModel(input, result, version);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Dossier chantier - ${model.projectName}`,
    subject: 'Dossier technique terrasse IDEA Bois',
    author: 'IDEA Bois x SpeedArti',
    creator: 'Configurateur Terrasse',
  });

  header(doc, 'Dossier chantier professionnel', 1);
  text(doc, model.projectName, 14, 34, 18, true, NAVY);
  text(doc, `Genere le ${model.generatedAt} - ${model.version}`, 14, 40, 7.5, false, MUTED);

  const sc = statusColor(model.status);
  doc.setFillColor(sc[0] === GREEN[0] ? 235 : sc[0] === AMBER[0] ? 255 : 253, sc[0] === GREEN[0] ? 248 : sc[0] === AMBER[0] ? 248 : 238, sc[0] === GREEN[0] ? 240 : sc[0] === AMBER[0] ? 230 : 238);
  doc.roundedRect(122, 30, 74, 18, 3, 3, 'F');
  text(doc, statusLabel(model.status), 126, 40.5, 7.2, true, sc);

  drawPlan(doc, input, result, 14, 54, 112, 82);
  cell(doc, 'Surface nette', model.clientSummary.surface, 132, 54, 64);
  cell(doc, 'Perimetre', model.clientSummary.perimeter, 132, 76, 64);
  cell(doc, 'Support', model.clientSummary.support, 132, 98, 64);
  cell(doc, 'Budget', model.clientSummary.budgetValue, 132, 120, 64);

  text(doc, 'Configuration technique', 14, 149, 10.5, true, NAVY);
  cell(doc, 'Forme', model.clientSummary.shape, 14, 155, 56);
  cell(doc, 'Hauteur', model.clientSummary.height, 76, 155, 56);
  cell(doc, 'Zones', String(model.zones.length), 138, 155, 58);
  cell(doc, 'References de lame', String(model.products.length), 14, 177, 56);
  cell(doc, 'Lambourdes achetees', String(model.structure.joistStockCount), 76, 177, 56);
  cell(doc, 'Appuis / plots', String(model.structure.supportPointCount), 138, 177, 58);

  text(doc, 'Perimetre du dossier', 14, 209, 9.5, true, NAVY);
  wrapped(doc, model.scopeNote, 14, 216, 182, 7.4, MUTED);
  text(doc, 'Le dossier reprend uniquement les donnees effectivement calculees ou renseignees dans le configurateur.', 14, 250, 7.2, true, NAVY);
  footer(doc, version);

  let y = newPage(doc, 'Plan de pose et zones', version);
  drawPlan(doc, input, result, 14, y, 182, 92);
  y += 101;
  text(doc, 'Zones de pose', 14, y, 10, true, NAVY);
  y += 7;
  for (const zone of model.zones) {
    y = ensure(doc, y, 18, 'Plan de pose et zones', version);
    y = row(doc, y, `${zone.label} [${zone.id}]`, `${zone.boardLabel} - sens ${zone.direction} - ${zone.pattern} - depart ${zone.start} - ${zone.rowCount} rangee(s) - ${zone.buttJointAxisCount} axe(s) de raccord`);
  }

  y = ensure(doc, y + 3, 18, 'Plan de pose et zones', version);
  text(doc, 'Achats de lames par produit', 14, y, 10, true, NAVY);
  y += 7;
  for (const product of model.products) {
    y = ensure(doc, y, 24, 'Plan de pose et zones', version);
    y = row(
      doc,
      y,
      product.boardLabel,
      `Zones ${product.zones.join(', ')} - besoin ${product.requiredLinearM.toFixed(2)} ml - achat ${product.purchasedLinearM.toFixed(2)} ml - ${product.stockBreakdown.join(' + ')}`,
      `chute ${product.wastePercent.toFixed(1)} %`,
    );
  }

  y = newPage(doc, 'Structure et appuis', version);
  drawPlan(doc, input, result, 14, y, 182, 98, true);
  y += 107;
  const structureStatus = model.structure.status === 'exact' ? 'EXACT' : model.structure.status === 'partial' ? 'PARTIEL' : 'INDISPONIBLE';
  text(doc, `Statut structure : ${structureStatus}`, 14, y, 10, true, model.structure.status === 'exact' ? GREEN : model.structure.status === 'partial' ? AMBER : RED);
  y += 7;
  const stats = [
    ['Lambourdage', `${model.structure.joistSegmentCount} segment(s) - ${model.structure.joistLinearM.toFixed(2)} ml - entraxe maxi ${model.structure.joistSpacingMm ?? '?'} mm`],
    ['Jonctions', `${model.structure.buttJointAxisCount} axe(s) - double lambourdage ajoute ${model.structure.doubleJoistLinearM.toFixed(2)} ml`],
    ['Contours / zones', `${model.structure.perimeterJoistCount} segment(s) peripherique(s) - ${model.structure.zoneBoundaryJoistCount} separation(s) de zone`],
    ['Appuis', `${model.structure.supportPointCount} point(s) - entraxe maxi ${model.structure.plotSpacingMm ?? '?'} mm - ${model.structure.unsupportedPointCount} hors gamme`],
    ['Hauteurs', model.structure.minRequiredPlotHeightMm != null && model.structure.maxRequiredPlotHeightMm != null ? `${model.structure.minRequiredPlotHeightMm.toFixed(0)} a ${model.structure.maxRequiredPlotHeightMm.toFixed(0)} mm` : 'A confirmer'],
  ];
  for (const [label, detail] of stats) {
    y = ensure(doc, y, 16, 'Structure et appuis', version);
    y = row(doc, y, label, detail);
  }
  if (model.structure.plotGroups.length) {
    y = ensure(doc, y + 2, 15, 'Structure et appuis', version);
    text(doc, 'Repartition des plots', 14, y, 9.5, true, NAVY);
    y += 7;
    for (const group of model.structure.plotGroups) {
      y = ensure(doc, y, 15, 'Structure et appuis', version);
      y = row(doc, y, group.label, `Hauteur compatible ${group.minHeightMm}-${group.maxHeightMm} mm${group.productRef ? ` - ref. ${group.productRef}` : ' - reference a confirmer'}`, `${group.quantity} u.`);
    }
  }
  if (model.structure.note) {
    y = ensure(doc, y, 18, 'Structure et appuis', version);
    y = wrapped(doc, model.structure.note, 14, y, 182, 7.2, MUTED) + 3;
  }

  y = newPage(doc, 'Rives et finitions', version);
  text(doc, 'Rives metier', 14, y, 10, true, NAVY);
  y += 7;
  for (const edge of model.edges) {
    y = ensure(doc, y, 18, 'Rives et finitions', version);
    y = row(doc, y, edge.label, `${edge.lengthM.toFixed(2)} m - ${edge.context} - ${edge.treatment}${edge.note ? ` - note : ${edge.note}` : ''}`);
  }

  y = ensure(doc, y + 4, 16, 'Rives et finitions', version);
  text(doc, 'Compatibilites produit', 14, y, 10, true, NAVY);
  y += 7;
  for (const product of model.compatibility) {
    y = ensure(doc, y, 16, 'Rives et finitions', version);
    text(doc, `${product.boardLabel} - ${product.overall === 'validated' ? 'valide' : product.overall === 'partial' ? 'partiel' : 'a completer'}`, 14, y, 8.2, true, NAVY);
    y += 5;
    for (const item of product.rows) {
      y = ensure(doc, y, 11, 'Rives et finitions', version);
      y = wrapped(doc, `- ${item.family}: ${item.state} - ${item.detail}`, 18, y, 174, 6.6, MUTED) + 1;
    }
    y += 3;
  }

  y = newPage(doc, 'Optimisation des coupes', version);
  for (const summary of result.layout?.productSummaries ?? []) {
    y = ensure(doc, y, 22, 'Optimisation des coupes', version);
    text(doc, summary.boardLabel, 14, y, 10, true, NAVY);
    y += 5;
    y = wrapped(doc, `Zones ${summary.zoneIds.join(', ')} - ${summary.stockBoards.length} lame(s) commerciales - ${summary.purchasedLinearM.toFixed(2)} ml achetes - chute ${summary.wastePercent.toFixed(1)} % - ${summary.cutOptimization.reusedOffcutCount} reutilisation(s) de chute.`, 14, y, 182, 7, MUTED) + 3;

    for (const stock of summary.stockBoards) {
      const cuts = stock.cuts.map((cut) => `${cut.pieceId} ${Math.round(cut.lengthMm)} mm [${cut.sourceId}]`).join(' + ');
      const detail = `${Math.round(stock.stockLengthMm)} mm -> ${cuts || 'aucune coupe'} -> reste ${Math.round(stock.remainingMm)} mm`;
      y = ensure(doc, y, 16, 'Optimisation des coupes', version);
      y = row(doc, y, stock.id, detail);
    }
    y = ensure(doc, y, 18, 'Optimisation des coupes', version);
    y = wrapped(doc, `Regles de reutilisation : ${summary.cutOptimization.rules.note}`, 14, y, 182, 6.8, AMBER) + 5;
  }

  y = newPage(doc, 'Panier materiaux', version);
  for (const line of model.basket) {
    y = ensure(doc, y, 18, 'Panier materiaux', version);
    const ref = line.reference ? `ref. ${line.reference} - ` : '';
    y = row(doc, y, line.label, `${line.family} - ${ref}${line.quantity} - statut ${line.status}${line.note ? ` - ${line.note}` : ''}`, line.amount);
  }

  y = newPage(doc, 'Points a confirmer et tracabilite', version);
  if (!model.issues.length) {
    text(doc, 'Aucun point bloquant ou a confirmer actif.', 14, y, 8, true, GREEN);
    y += 10;
  } else {
    for (const issue of model.issues) {
      y = ensure(doc, y, 18, 'Points a confirmer et tracabilite', version);
      const color = issue.severity === 'blocking' ? RED : issue.severity === 'warning' || issue.severity === 'pending' ? AMBER : MUTED;
      text(doc, `${issue.tag} - ${String(issue.severity).toUpperCase()}`, 14, y, 7.5, true, color);
      y = wrapped(doc, issue.message, 18, y + 5, 174, 6.8, MUTED) + 3;
    }
  }

  y = ensure(doc, y + 2, 15, 'Points a confirmer et tracabilite', version);
  text(doc, 'Sources', 14, y, 9.5, true, NAVY);
  y += 6;
  for (const source of model.sources) {
    y = ensure(doc, y, 12, 'Points a confirmer et tracabilite', version);
    y = wrapped(doc, `- ${source}`, 18, y, 174, 6.2, MUTED) + 1;
  }

  y = ensure(doc, y + 3, 15, 'Points a confirmer et tracabilite', version);
  text(doc, 'Trace moteur', 14, y, 9.5, true, NAVY);
  y += 6;
  for (const trace of model.trace) {
    y = ensure(doc, y, 12, 'Points a confirmer et tracabilite', version);
    y = wrapped(doc, trace, 18, y, 174, 6.2, MUTED) + 1;
  }

  footer(doc, version);
  doc.save(`IDEA-Bois-Dossier-Chantier-${safeFileName(model.projectName)}.pdf`);
}
