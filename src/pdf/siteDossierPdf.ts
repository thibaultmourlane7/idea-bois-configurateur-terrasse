import { jsPDF } from 'jspdf';
import type { ConfiguratorResult, ProjectInput, TerraceEdgeTreatment } from '../domain/types';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from '../engine/geometry';
import { buildSiteDossierModel, type SiteDossierModel } from './siteDossierModel';
import { computeStairs } from '../engine/stairs';

type Pdf = InstanceType<typeof jsPDF>;

const BLUE = [25, 118, 210] as const;
const NAVY = [23, 50, 77] as const;
const MUTED = [102, 119, 133] as const;
const LINE = [218, 228, 236] as const;
const SOFT = [247, 250, 252] as const;
const GREEN = [30, 138, 85] as const;
const AMBER = [168, 112, 26] as const;
const RED = [174, 63, 63] as const;
const BROWN = [119, 83, 52] as const;
const PURPLE = [116, 83, 155] as const;
const TEAL = [41, 123, 116] as const;

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

function wrapped(doc: Pdf, value: string, x: number, y: number, width: number, size = 7.2, color: readonly number[] = MUTED): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(clean(value), width) as string[];
  doc.text(lines, x, y);
  return y + Math.max(4.2, lines.length * 3.7);
}

function header(doc: Pdf, title: string) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.roundedRect(14, 8, 10, 10, 2, 2, 'F');
  text(doc, 'IB', 19, 15.2, 8, true, [255, 255, 255]);
  text(doc, 'IDEA BOIS x SPEEDARTI', 29, 11.5, 7.2, true, BLUE);
  text(doc, title, 29, 17, 11.5, true, NAVY);
  text(doc, `Page ${doc.getNumberOfPages()}`, 180, 15, 7, false, MUTED);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, 23, 196, 23);
}

function footer(doc: Pdf, version: string) {
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, 282, 196, 282);
  text(doc, 'Dossier materiaux et implantation - aucune main-d oeuvre ni duree de pose.', 14, 287, 6.7, false, MUTED);
  text(doc, version, 166, 287, 6.7, false, MUTED);
}

function addPage(doc: Pdf, title: string, version: string): number {
  if (doc.getNumberOfPages() > 0) footer(doc, version);
  doc.addPage();
  header(doc, title);
  return 34;
}

function ensure(doc: Pdf, y: number, needed: number, title: string, version: string): number {
  return y + needed > 276 ? addPage(doc, title, version) : y;
}

function statusColor(status: SiteDossierModel['status']): readonly number[] {
  return status === 'ready' ? GREEN : status === 'with-warnings' ? AMBER : RED;
}

function statusLabel(status: SiteDossierModel['status']): string {
  return status === 'ready' ? 'PRET POUR CONTROLE CHANTIER'
    : status === 'with-warnings' ? 'AVEC POINTS A CONFIRMER'
      : 'BLOQUE - CORRECTIONS REQUISES';
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

function row(doc: Pdf, y: number, title: string, detail: string, right?: string): number {
  const detailLines = doc.splitTextToSize(clean(detail), right ? 126 : 164) as string[];
  const height = Math.max(14, 8 + detailLines.length * 3.7);
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  doc.roundedRect(14, y - 2, 182, height, 2, 2, 'F');
  text(doc, title, 18, y + 4, 7.3, true, NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(detailLines, 18, y + 9);
  if (right) text(doc, right, 151, y + 5, 7, true, NAVY);
  return y + height + 3;
}

function planTransform(input: ProjectInput, x: number, y: number, width: number, height: number) {
  const bounds = getDeckBoundingSizeM(input);
  const scale = Math.min((width - 12) / Math.max(.1, bounds.lengthM), (height - 12) / Math.max(.1, bounds.widthM));
  const ox = x + (width - bounds.lengthM * scale) / 2;
  const oy = y + (height - bounds.widthM * scale) / 2;
  return { scale, ox, oy };
}

function drawOutline(doc: Pdf, input: ProjectInput, x: number, y: number, width: number, height: number, labels = true) {
  const { scale, ox, oy } = planTransform(input, x, y, width, height);
  const outline = getDeckOutlinePointsM(input);
  const points = outline.map((point) => [ox + point.x * scale, oy + point.y * scale] as const);
  if (points.length < 3) return { scale, ox, oy };
  const first = points[0];
  const vectors = points.slice(1).map((point, index) => [point[0] - points[index][0], point[1] - points[index][1]]);
  doc.setFillColor(250, 252, 254);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  doc.setDrawColor(24, 63, 100);
  doc.setLineWidth(.55);
  doc.lines(vectors, first[0], first[1], [1, 1], 'S', true);

  if (labels && input.shape !== 'circle') {
    outline.forEach((point, index) => {
      const next = outline[(index + 1) % outline.length];
      const a = String.fromCharCode(65 + (index % 26));
      const b = String.fromCharCode(65 + ((index + 1) % 26));
      const mx = ox + ((point.x + next.x) / 2) * scale;
      const my = oy + ((point.y + next.y) / 2) * scale;
      text(doc, `${a}${b} ${Math.hypot(next.x - point.x, next.y - point.y).toFixed(2)} m`, mx - 6, my - 1.5, 5.4, true, BLUE);
    });
  }
  return { scale, ox, oy };
}

function drawObstacles(doc: Pdf, input: ProjectInput, scale: number, ox: number, oy: number) {
  doc.setFillColor(231, 237, 241);
  doc.setDrawColor(130, 145, 155);
  for (const obstacle of input.obstacles) {
    if (obstacle.shape === 'circle') {
      const d = obstacle.diameterM ?? 0;
      doc.circle(ox + (obstacle.xM + d / 2) * scale, oy + (obstacle.yM + d / 2) * scale, (d / 2) * scale, 'FD');
    } else {
      doc.rect(ox + obstacle.xM * scale, oy + obstacle.yM * scale, (obstacle.widthM ?? 0) * scale, (obstacle.heightM ?? 0) * scale, 'FD');
    }
  }
}

function drawGeneralPlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, true);
  drawObstacles(doc, input, t.scale, t.ox, t.oy);
  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineDashPattern([2, 1.2], 0);
  for (const zone of input.layingZones ?? []) {
    const pts = zone.points.map((p) => [t.ox + p.xM * t.scale, t.oy + p.yM * t.scale] as const);
    if (pts.length < 3) continue;
    const first = pts[0];
    const vectors = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
    doc.lines(vectors, first[0], first[1], [1, 1], 'S', true);
  }
  doc.setLineDashPattern([], 0);
  if (!result.layout) text(doc, 'Calepinage indisponible', x + 5, y + height - 5, 7, true, AMBER);
}

function drawBoardsPlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, false);
  drawObstacles(doc, input, t.scale, t.ox, t.oy);
  doc.setDrawColor(BROWN[0], BROWN[1], BROWN[2]);
  doc.setLineWidth(.24);
  for (const segment of result.layout?.boardSegments ?? []) {
    if (segment.x1M == null || segment.y1M == null || segment.x2M == null || segment.y2M == null) continue;
    doc.line(t.ox + segment.x1M * t.scale, t.oy + segment.y1M * t.scale, t.ox + segment.x2M * t.scale, t.oy + segment.y2M * t.scale);
  }
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(.45);
  for (const joint of result.layout?.buttJoints ?? []) {
    if (joint.xM == null || joint.yM == null) continue;
    const half = 1.8;
    doc.line(t.ox + joint.xM * t.scale - half, t.oy + joint.yM * t.scale, t.ox + joint.xM * t.scale + half, t.oy + joint.yM * t.scale);
  }
}

function drawStructurePlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, false);
  for (const joist of result.supportPlan?.joistSegments ?? []) {
    const perimeter = joist.role === 'perimeter';
    const boundary = joist.role === 'zone-boundary';
    doc.setDrawColor(perimeter ? 54 : boundary ? 25 : 107, perimeter ? 95 : boundary ? 118 : 77, perimeter ? 122 : boundary ? 210 : 49);
    doc.setLineWidth(perimeter ? 1.05 : boundary ? .9 : joist.multiplicity === 2 ? 1.3 : .65);
    doc.line(t.ox + joist.x1M * t.scale, t.oy + joist.y1M * t.scale, t.ox + joist.x2M * t.scale, t.oy + joist.y2M * t.scale);
  }
  drawObstacles(doc, input, t.scale, t.ox, t.oy);
}

function drawSupportsPlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, false);
  for (const point of result.supportPlan?.supportPoints ?? []) {
    const unsupported = point.status === 'unsupported';
    doc.setFillColor(unsupported ? RED[0] : 47, unsupported ? RED[1] : 103, unsupported ? RED[2] : 129);
    doc.circle(t.ox + point.xM * t.scale, t.oy + point.yM * t.scale, point.multiplicity === 2 ? 1.25 : .9, 'F');
    if (result.supportPlan && result.supportPlan.supportPoints.length <= 65) {
      text(doc, `${Math.round(point.requiredPlotHeightMm)}`, t.ox + point.xM * t.scale + 1.3, t.oy + point.yM * t.scale - .8, 4.5, false, unsupported ? RED : MUTED);
    }
  }
  drawObstacles(doc, input, t.scale, t.ox, t.oy);
}

function drawTerrainPlan(doc: Pdf, input: ProjectInput, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, false);
  drawObstacles(doc, input, t.scale, t.ox, t.oy);

  text(doc, 'Plateforme principale : +0 mm', x + 5, y + 9, 6.2, true, NAVY);

  for (const zone of input.layingZones ?? []) {
    if (zone.points.length < 3) continue;
    const level = zone.finishedLevelOffsetMm ?? 0;
    const points = zone.points.map((point) => [t.ox + point.xM * t.scale, t.oy + point.yM * t.scale] as const);
    const first = points[0];
    const vectors = points.slice(1).map((point, index) => [point[0] - points[index][0], point[1] - points[index][1]]);
    const positive = level > 0.5;
    const negative = level < -0.5;
    doc.setFillColor(positive ? 226 : negative ? 235 : 239, positive ? 242 : negative ? 235 : 246, positive ? 255 : negative ? 248 : 252);
    doc.setDrawColor(positive ? BLUE[0] : negative ? PURPLE[0] : MUTED[0], positive ? BLUE[1] : negative ? PURPLE[1] : MUTED[1], positive ? BLUE[2] : negative ? PURPLE[2] : MUTED[2]);
    doc.setLineWidth(.8);
    doc.lines(vectors, first[0], first[1], [1, 1], 'FD', true);

    const cx = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const cy = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    text(doc, zone.label, cx - 10, cy - 1.5, 6.2, true, NAVY);
    text(doc, `${level >= 0 ? '+' : ''}${Math.round(level)} mm fini`, cx - 10, cy + 4, 5.5, false, MUTED);
  }
}

function drawStairsPlan(doc: Pdf, input: ProjectInput, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, false);
  drawObstacles(doc, input, t.scale, t.ox, t.oy);
  const stairs = computeStairs(input).filter((stair) => stair.status === 'ready');

  for (const stair of stairs) {
    for (const tread of stair.treads) {
      const pts = tread.top.map((point) => [t.ox + point.xM * t.scale, t.oy + point.yM * t.scale] as const);
      if (pts.length < 4) continue;
      const first = pts[0];
      const vectors = pts.slice(1).map((point, index) => [point[0] - pts[index][0], point[1] - pts[index][1]]);
      doc.setFillColor(235, 220, 203);
      doc.setDrawColor(BROWN[0], BROWN[1], BROWN[2]);
      doc.setLineWidth(.45);
      doc.lines(vectors, first[0], first[1], [1, 1], 'FD', true);
    }
    if (stair.footprint) {
      const pts = stair.footprint.map((point) => [t.ox + point.xM * t.scale, t.oy + point.yM * t.scale] as const);
      const cx = pts.reduce((sum, point) => sum + point[0], 0) / pts.length;
      const cy = pts.reduce((sum, point) => sum + point[1], 0) / pts.length;
      text(doc, `${stair.label} - ${stair.stepCount ?? 0} marche(s)`, cx - 12, cy, 5.8, true, BROWN);
    }
  }
}

function edgeColor(treatment: TerraceEdgeTreatment): readonly number[] {
  if (treatment === 'cladding') return BLUE;
  if (treatment === 'profile') return PURPLE;
  if (treatment === 'edge-board') return BROWN;
  if (treatment === 'drainage') return TEAL;
  return MUTED;
}

function drawFinishesPlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const t = drawOutline(doc, input, x, y, width, height, false);
  if (input.shape === 'circle') {
    const edge = result.edges?.[0];
    if (edge) {
      const c = edgeColor(edge.treatment);
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setLineWidth(edge.treatment === 'none' ? .5 : 2);
      const bounds = getDeckBoundingSizeM(input);
      doc.circle(t.ox + bounds.lengthM * t.scale / 2, t.oy + bounds.widthM * t.scale / 2, bounds.lengthM * t.scale / 2, 'S');
      text(doc, `${edge.label} - ${edge.treatment}`, x + 5, y + 9, 6.5, true, c);
    }
    return;
  }
  for (const edge of result.edges ?? []) {
    const c = edgeColor(edge.treatment);
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(edge.treatment === 'none' ? .45 : 1.8);
    if (edge.treatment === 'none') doc.setLineDashPattern([2, 1.5], 0);
    doc.line(t.ox + edge.start.xM * t.scale, t.oy + edge.start.yM * t.scale, t.ox + edge.end.xM * t.scale, t.oy + edge.end.yM * t.scale);
    doc.setLineDashPattern([], 0);
    const mx = t.ox + ((edge.start.xM + edge.end.xM) / 2) * t.scale;
    const my = t.oy + ((edge.start.yM + edge.end.yM) / 2) * t.scale;
    text(doc, edge.label, mx - 2, my - 2, 5.5, true, c);
  }
}

function drawCutBoard(doc: Pdf, x: number, y: number, width: number, stockLengthMm: number, cuts: Array<{ pieceId: string; lengthMm: number }>, remainingMm: number) {
  const barH = 9;
  doc.setFillColor(241, 244, 246);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(x, y, width, barH, 1, 1, 'FD');
  let cursor = x;
  const palette = [BLUE, BROWN, TEAL, PURPLE] as const;
  cuts.forEach((cut, index) => {
    const w = width * (cut.lengthMm / stockLengthMm);
    const c = palette[index % palette.length];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(cursor, y, Math.max(.3, w), barH, 'F');
    if (w > 13) text(doc, cut.pieceId, cursor + 1, y + 5.8, 4.7, true, [255, 255, 255]);
    cursor += w;
  });
  if (remainingMm > .1) {
    const rw = width * (remainingMm / stockLengthMm);
    doc.setFillColor(225, 230, 234);
    doc.rect(x + width - rw, y, rw, barH, 'F');
    if (rw > 10) text(doc, `reste ${Math.round(remainingMm)}`, x + width - rw + 1, y + 5.8, 4.5, false, NAVY);
  }
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(x, y, width, barH, 1, 1, 'S');
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

  header(doc, 'Dossier chantier professionnel');
  text(doc, model.projectName, 14, 34, 18, true, NAVY);
  text(doc, `Genere le ${model.generatedAt} - ${model.version}`, 14, 40, 7.5, false, MUTED);
  const sc = statusColor(model.status);
  doc.setFillColor(model.status === 'ready' ? 235 : model.status === 'with-warnings' ? 255 : 253, model.status === 'ready' ? 248 : model.status === 'with-warnings' ? 248 : 238, model.status === 'ready' ? 240 : model.status === 'with-warnings' ? 230 : 238);
  doc.roundedRect(122, 30, 74, 18, 3, 3, 'F');
  text(doc, statusLabel(model.status), 126, 40.5, 7, true, sc);
  drawGeneralPlan(doc, input, result, 14, 54, 112, 82);
  cell(doc, 'Surface nette', model.clientSummary.surface, 132, 54, 64);
  cell(doc, 'Perimetre', model.clientSummary.perimeter, 132, 76, 64);
  cell(doc, 'Support', model.clientSummary.support, 132, 98, 64);
  cell(doc, 'Budget', model.clientSummary.budgetValue, 132, 120, 64);
  text(doc, 'Sorties chantier', 14, 149, 10, true, NAVY);
  cell(doc, 'Liste achat', `${model.purchaseList.length} ligne(s)`, 14, 156, 56);
  cell(doc, 'Liste debit', `${model.cutList.length} coupe(s)`, 76, 156, 56);
  cell(doc, 'Plans separes', `${model.planManifest.length} plans`, 138, 156, 58);
  cell(doc, 'Zones', String(model.zones.length), 14, 180, 56);
  cell(doc, 'References lame', String(model.products.length), 76, 180, 56);
  cell(doc, 'Appuis / plots', String(model.structure.supportPointCount), 138, 180, 58);
  text(doc, 'Perimetre du dossier', 14, 212, 9.5, true, NAVY);
  wrapped(doc, model.scopeNote, 14, 219, 182, 7.3, MUTED);
  footer(doc, version);

  let y = addPage(doc, 'Plan general', version);
  drawGeneralPlan(doc, input, result, 14, y, 182, 168);
  y += 177;
  wrapped(doc, `${model.clientSummary.shape} - ${model.clientSummary.dimensions} - surface nette ${model.clientSummary.surface} - reservations : ${model.clientSummary.obstacles}.`, 14, y, 182, 7.4, MUTED);

  y = addPage(doc, 'Plan des lames', version);
  drawBoardsPlan(doc, input, result, 14, y, 182, 168);
  y += 177;
  for (const zone of model.zones) {
    y = ensure(doc, y, 15, 'Plan des lames', version);
    y = row(doc, y, zone.label, `${zone.boardLabel} - ${zone.direction} - ${zone.pattern} - depart ${zone.start} - ${zone.rowCount} rangee(s) - ${zone.buttJointAxisCount} axe(s) de raccord`);
  }

  y = addPage(doc, 'Plan structure', version);
  drawStructurePlan(doc, input, result, 14, y, 182, 168);
  y += 177;
  wrapped(doc, `${model.structure.joistSegmentCount} segment(s) - ${model.structure.joistLinearM.toFixed(2)} ml - entraxe maxi ${model.structure.joistSpacingMm ?? '?'} mm - double lambourdage ${model.structure.doubleJoistLinearM.toFixed(2)} ml - ${model.structure.zoneBoundaryJoistCount} separation(s) de zone.`, 14, y, 182, 7.3, MUTED);

  y = addPage(doc, 'Plan des plots / appuis', version);
  drawSupportsPlan(doc, input, result, 14, y, 182, 168);
  y += 177;
  wrapped(doc, `${model.structure.supportPointCount} appui(s) - entraxe maxi ${model.structure.plotSpacingMm ?? '?'} mm - hauteurs ${model.structure.minRequiredPlotHeightMm ?? '?'} a ${model.structure.maxRequiredPlotHeightMm ?? '?'} mm - ${model.structure.unsupportedPointCount} point(s) hors gamme.`, 14, y, 182, 7.3, MUTED);
  for (const group of model.structure.plotGroups) {
    y = ensure(doc, y + 2, 14, 'Plan des plots / appuis', version);
    y = row(doc, y, group.label, `Hauteur ${group.minHeightMm}-${group.maxHeightMm} mm${group.productRef ? ` - ref. ${group.productRef}` : ' - reference a confirmer'}`, `${group.quantity} u.`);
  }

  y = addPage(doc, 'Niveaux et plateformes', version);
  drawTerrainPlan(doc, input, 14, y, 182, 138);
  y += 147;
  for (const platform of model.terrain.platforms) {
    y = ensure(doc, y, 17, 'Niveaux et plateformes', version);
    y = row(
      doc,
      y,
      platform.label,
      `${platform.isMain ? 'Référence principale' : 'Plateforme locale'} - niveau fini ${platform.finishedLevelOffsetMm >= 0 ? '+' : ''}${platform.finishedLevelOffsetMm.toFixed(0)} mm - support ${platform.supportLevelOffsetMm >= 0 ? '+' : ''}${platform.supportLevelOffsetMm.toFixed(0)} mm - pente X ${platform.targetSlopeXPercent.toFixed(2)} % / Y ${platform.targetSlopeYPercent.toFixed(2)} %`,
    );
  }
  if (model.terrain.relations.length) {
    y = ensure(doc, y + 3, 15, 'Niveaux et plateformes', version);
    text(doc, 'Relations entre plateformes', 14, y, 9, true, NAVY);
    y += 6;
    for (const relation of model.terrain.relations) {
      y = ensure(doc, y, 17, 'Niveaux et plateformes', version);
      y = row(
        doc,
        y,
        `${relation.aLabel} / ${relation.bLabel}`,
        `Frontière ${relation.sharedBoundaryLengthM.toFixed(2)} m - écart fini ${relation.finishedDeltaMinMm.toFixed(0)} à ${relation.finishedDeltaMaxMm.toFixed(0)} mm - écart support ${relation.supportDeltaMinMm.toFixed(0)} à ${relation.supportDeltaMaxMm.toFixed(0)} mm`,
        relation.transitionRequired ? 'Transition à traiter' : 'Même niveau',
      );
    }
  }
  if (model.terrain.transitionCount > 0) {
    y = ensure(doc, y, 18, 'Niveaux et plateformes', version);
    y = wrapped(doc, model.stairs.length
      ? 'Les transitions de niveau sont calculées. Les escaliers explicitement configurés sont détaillés à la page suivante ; les autres transitions restent à traiter.'
      : 'Les écarts entre plateformes sont calculés. Aucune marche, rampe ou pièce de transition n’est ajoutée automatiquement tant qu’aucun escalier n’est explicitement configuré.', 14, y, 182, 7, AMBER) + 4;
  }

  if (model.stairs.length) {
    y = addPage(doc, 'Escaliers', version);
    drawStairsPlan(doc, input, 14, y, 182, 122);
    y += 131;
    for (const stair of model.stairs) {
      y = ensure(doc, y, 28, 'Escaliers', version);
      if (stair.status !== 'ready') {
        y = row(doc, y, stair.label, `Statut ${stair.status} - ${stair.issues.join(' ')}`, 'À compléter');
        continue;
      }
      y = row(
        doc,
        y,
        stair.label,
        `${stair.lowPlatformLabel ?? '?'} vers ${stair.highPlatformLabel ?? '?'} - largeur ${stair.widthM?.toFixed(2)} m - ${stair.stepCount} marche(s) de profondeur ${Math.round(stair.treadDepthMm ?? 0)} mm - hauteur totale ${stair.riseLeftMm?.toFixed(0)} à ${stair.riseRightMm?.toFixed(0)} mm - hauteur par marche ${stair.riserHeightLeftMm?.toFixed(0)} à ${stair.riserHeightRightMm?.toFixed(0)} mm - développement ${stair.totalRunM?.toFixed(2)} m`,
      );
      y = ensure(doc, y, 20, 'Escaliers', version);
      y = wrapped(
        doc,
        `Marches : ${stair.treadAreaM2?.toFixed(2)} m² géométriques / ${stair.treadRequiredLinearM?.toFixed(2)} ml de lame. Structure : ${stair.structureLineCount ?? '?'} ligne(s) porteuse(s) / ${stair.structureLinearM?.toFixed(2) ?? '?'} ml géométriques. Section, référence et fixations de structure restent à valider.`,
        18,
        y,
        174,
        6.7,
        stair.structureLineCount != null ? MUTED : AMBER,
      ) + 4;
    }
  }

  y = addPage(doc, 'Plan des finitions', version);
  drawFinishesPlan(doc, input, result, 14, y, 182, 168);
  y += 177;
  for (const edge of model.edges) {
    y = ensure(doc, y, 15, 'Plan des finitions', version);
    y = row(doc, y, edge.label, `${edge.lengthM.toFixed(2)} m - ${edge.context} - ${edge.treatment}${edge.note ? ` - ${edge.note}` : ''}`);
  }

  y = addPage(doc, 'Liste d achat', version);
  text(doc, 'Produits IDEA Bois / materiaux a fournir', 14, y, 9.5, true, NAVY);
  y += 7;
  for (const line of model.purchaseList) {
    y = ensure(doc, y, 18, 'Liste d achat', version);
    const ref = line.reference ? `ref. ${line.reference} - ` : '';
    y = row(doc, y, line.label, `${line.family} - ${ref}${line.quantity} - statut ${line.status}${line.note ? ` - ${line.note}` : ''}`, line.amount);
  }

  y = addPage(doc, 'Liste de debit', version);
  text(doc, 'Coupes a effectuer - distinctes de la liste d achat', 14, y, 9.5, true, NAVY);
  y += 7;
  for (const cut of model.cutList) {
    y = ensure(doc, y, 17, 'Liste de debit', version);
    y = row(
      doc,
      y,
      `${cut.pieceId} / ${cut.cutId}`,
      `${cut.boardLabel} - zone ${cut.zoneId} - lame stock ${cut.stockBoardId} (${Math.round(cut.stockLengthMm)} mm) - source ${cut.sourceId} [${cut.sourceType}] - coupe ${Math.round(cut.cutLengthMm)} mm - reste ${Math.round(cut.remainingAfterMm)} mm${cut.resultingOffcutId ? ` - chute ${cut.resultingOffcutId}` : ''}`,
    );
  }

  y = addPage(doc, 'Plan de coupe', version);
  for (const summary of result.layout?.productSummaries ?? []) {
    y = ensure(doc, y, 23, 'Plan de coupe', version);
    text(doc, summary.boardLabel, 14, y, 9.5, true, NAVY);
    y += 6;
    for (const stock of summary.stockBoards) {
      y = ensure(doc, y, 18, 'Plan de coupe', version);
      text(doc, `${stock.id} - ${Math.round(stock.stockLengthMm)} mm`, 14, y, 6.8, true, NAVY);
      drawCutBoard(doc, 48, y - 5, 144, stock.stockLengthMm, stock.cuts.map((cut) => ({ pieceId: cut.pieceId, lengthMm: cut.lengthMm })), stock.remainingMm);
      y += 14;
    }
    y = ensure(doc, y, 16, 'Plan de coupe', version);
    y = wrapped(doc, `Regles de reutilisation : ${summary.cutOptimization.rules.note}`, 14, y, 182, 6.8, AMBER) + 5;
  }

  y = addPage(doc, 'Compatibilites et points a confirmer', version);
  for (const product of model.compatibility) {
    y = ensure(doc, y, 16, 'Compatibilites et points a confirmer', version);
    text(doc, `${product.boardLabel} - ${product.overall === 'validated' ? 'valide' : product.overall === 'partial' ? 'partiel' : 'a completer'}`, 14, y, 8.3, true, NAVY);
    y += 5;
    for (const item of product.rows) {
      y = ensure(doc, y, 11, 'Compatibilites et points a confirmer', version);
      y = wrapped(doc, `- ${item.family}: ${item.state} - ${item.detail}`, 18, y, 174, 6.5, MUTED) + 1;
    }
    y += 3;
  }
  for (const issue of model.issues) {
    y = ensure(doc, y, 15, 'Compatibilites et points a confirmer', version);
    const c = issue.severity === 'blocking' ? RED : AMBER;
    text(doc, `${issue.tag} - ${String(issue.severity).toUpperCase()}`, 14, y, 7, true, c);
    y = wrapped(doc, issue.message, 18, y + 5, 174, 6.5, MUTED) + 3;
  }

  y = addPage(doc, 'Tracabilite', version);
  text(doc, 'Sources', 14, y, 9.5, true, NAVY);
  y += 6;
  for (const source of model.sources) {
    y = ensure(doc, y, 11, 'Tracabilite', version);
    y = wrapped(doc, `- ${source}`, 18, y, 174, 6.1, MUTED) + 1;
  }
  y += 4;
  text(doc, 'Trace moteur', 14, y, 9.5, true, NAVY);
  y += 6;
  for (const trace of model.trace) {
    y = ensure(doc, y, 11, 'Tracabilite', version);
    y = wrapped(doc, trace, 18, y, 174, 6.1, MUTED) + 1;
  }

  footer(doc, version);
  doc.save(`IDEA-Bois-Dossier-Chantier-${safeFileName(model.projectName)}.pdf`);
}
