import { jsPDF } from 'jspdf';
import type { ConfiguratorResult, ProjectInput } from '../domain/types';
import { buildClientPdfModel } from './clientPdfModel';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';

type Pdf = InstanceType<typeof jsPDF>;

const BLUE = [25, 118, 210] as const;
const NAVY = [23, 50, 77] as const;
const MUTED = [105, 125, 142] as const;
const LINE = [220, 230, 237] as const;
const SOFT = [246, 249, 252] as const;
const GREEN = [30, 138, 85] as const;
const AMBER = [168, 112, 26] as const;

function clean(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[’]/g, "'")
    .replace(/\u00a0/g, ' ');
}

function safeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'projet-terrasse';
}

function text(doc: Pdf, value: string, x: number, y: number, size = 10, bold = false, color: readonly number[] = NAVY) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(clean(value), x, y);
}

function wrapped(doc: Pdf, value: string, x: number, y: number, width: number, size = 9, color: readonly number[] = MUTED): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(clean(value), width) as string[];
  doc.text(lines, x, y);
  return y + Math.max(5, lines.length * 4.2);
}

function drawHeader(doc: Pdf, title: string, page: number) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.roundedRect(14, 8, 10, 10, 2, 2, 'F');
  text(doc, 'IB', 19, 15.2, 8, true, [255, 255, 255]);
  text(doc, 'IDEA BOIS x SPEEDARTI', 29, 11.5, 7.5, true, BLUE);
  text(doc, title, 29, 17, 12, true, NAVY);
  text(doc, `Page ${page}`, 182, 15, 7.5, false, MUTED);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, 23, 196, 23);
}

function drawFooter(doc: Pdf, version: string) {
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, 282, 196, 282);
  text(doc, 'Prix materiaux uniquement - aucune main-d oeuvre, aucune duree de chantier.', 14, 287, 7.2, false, MUTED);
  text(doc, version, 170, 287, 7.2, false, MUTED);
}

function drawPlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const bounds = getDeckBoundingSizeM(input);
  const scale = Math.min((width - 8) / bounds.lengthM, (height - 8) / bounds.widthM);
  const ox = x + (width - bounds.lengthM * scale) / 2;
  const oy = y + (height - bounds.widthM * scale) / 2;
  const outline = getDeckOutlinePointsM(input);

  const pdfPoint = (point: { x: number; y: number }) => [ox + point.x * scale, oy + point.y * scale] as const;
  const outlinePdf = outline.map(pdfPoint);
  const first = outlinePdf[0];
  const vectors = outlinePdf.slice(1).map((point, index) => [
    point[0] - outlinePdf[index][0],
    point[1] - outlinePdf[index][1],
  ]);

  doc.setFillColor(250, 252, 254);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  doc.setFillColor(217, 181, 141);
  doc.setDrawColor(24, 63, 100);
  doc.setLineWidth(0.6);
  doc.lines(vectors, first[0], first[1], [1, 1], 'FD', true);

  doc.setDrawColor(118, 88, 60);
  doc.setLineWidth(0.2);
  const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;

  if (pitchMm > 0) {
    for (let center = input.board.widthMm / 2; center <= transverseMm + 0.001; center += pitchMm) {
      const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
      for (const [intervalStart, intervalEnd] of intervals) {
        if (input.orientation === 'length') {
          doc.line(
            ox + (intervalStart / 1000) * scale,
            oy + (center / 1000) * scale,
            ox + (intervalEnd / 1000) * scale,
            oy + (center / 1000) * scale,
          );
        } else {
          doc.line(
            ox + (center / 1000) * scale,
            oy + (intervalStart / 1000) * scale,
            ox + (center / 1000) * scale,
            oy + (intervalEnd / 1000) * scale,
          );
        }
      }
    }
  }

  for (const obstacle of input.obstacles) {
    doc.setFillColor(obstacle.kind === 'pool' ? 207 : obstacle.kind === 'tree' ? 223 : 235, obstacle.kind === 'pool' ? 238 : obstacle.kind === 'tree' ? 242 : 238, obstacle.kind === 'pool' ? 255 : obstacle.kind === 'tree' ? 223 : 241);
    doc.setDrawColor(105, 125, 142);
    if (obstacle.shape === 'circle') {
      const d = obstacle.diameterM ?? 0;
      doc.ellipse(
        ox + (obstacle.xM + d / 2) * scale,
        oy + (obstacle.yM + d / 2) * scale,
        (d / 2) * scale,
        (d / 2) * scale,
        'FD',
      );
    } else {
      doc.rect(
        ox + obstacle.xM * scale,
        oy + obstacle.yM * scale,
        (obstacle.widthM ?? 0) * scale,
        (obstacle.heightM ?? 0) * scale,
        'FD',
      );
    }
  }

  if (result.layout?.buttJoints?.length) {
    doc.setDrawColor(28, 36, 44);
    doc.setLineWidth(0.45);
    const half = Math.max(1.2, (input.board.widthMm / 1000) * scale * 0.7);
    for (const joint of result.layout.buttJoints) {
      const cx = ox + (input.orientation === 'length' ? joint.axisPositionMm : joint.transverseCenterMm) / 1000 * scale;
      const cy = oy + (input.orientation === 'length' ? joint.transverseCenterMm : joint.axisPositionMm) / 1000 * scale;
      if (input.orientation === 'length') doc.line(cx, cy - half, cx, cy + half);
      else doc.line(cx - half, cy, cx + half, cy);
    }
  }

  doc.setDrawColor(24, 63, 100);
  doc.setLineWidth(0.6);
  doc.lines(vectors, first[0], first[1], [1, 1], 'S', true);

  if (input.shape !== 'circle') {
    outline.forEach((point, index) => {
      const next = outline[(index + 1) % outline.length];
      const a = String.fromCharCode(65 + (index % 26));
      const b = String.fromCharCode(65 + ((index + 1) % 26));
      const mx = ox + ((point.x + next.x) / 2) * scale;
      const my = oy + ((point.y + next.y) / 2) * scale;
      const lengthM = Math.hypot(next.x - point.x, next.y - point.y);
      text(doc, `${a}${b} ${lengthM.toFixed(2)} m`, mx - 5, my - 1.5, 5.5, true, BLUE);
      text(doc, a, ox + point.x * scale + 1.5, oy + point.y * scale - 1.5, 5.3, true, NAVY);
    });
  }
}

function drawStructurePlan(doc: Pdf, input: ProjectInput, result: ConfiguratorResult, x: number, y: number, width: number, height: number) {
  const bounds = getDeckBoundingSizeM(input);
  const scale = Math.min((width - 8) / bounds.lengthM, (height - 8) / bounds.widthM);
  const ox = x + (width - bounds.lengthM * scale) / 2;
  const oy = y + (height - bounds.widthM * scale) / 2;
  const outline = getDeckOutlinePointsM(input);
  const points = outline.map((point) => [ox + point.x * scale, oy + point.y * scale] as const);
  const first = points[0];
  const vectors = points.slice(1).map((point, index) => [point[0] - points[index][0], point[1] - points[index][1]]);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  doc.setFillColor(242, 244, 245);
  doc.setDrawColor(160, 176, 188);
  doc.lines(vectors, first[0], first[1], [1, 1], 'FD', true);

  const plan = result.supportPlan;
  if (plan && plan.status !== 'unavailable') {
    for (const joist of plan.joistSegments) {
      const perimeter = joist.role === 'perimeter';
      const doubled = joist.multiplicity === 2;
      doc.setDrawColor(perimeter ? 54 : doubled ? 155 : 108, perimeter ? 95 : doubled ? 95 : 77, perimeter ? 122 : doubled ? 47 : 49);
      doc.setLineWidth(perimeter ? 1.2 : doubled ? 1.5 : 0.8);
      doc.line(
        ox + joist.x1M * scale,
        oy + joist.y1M * scale,
        ox + joist.x2M * scale,
        oy + joist.y2M * scale,
      );
    }

    for (const point of plan.supportPoints) {
      doc.setFillColor(point.status === 'unsupported' ? 182 : 47, point.status === 'unsupported' ? 76 : 63, point.status === 'unsupported' ? 69 : 75);
      const r = point.multiplicity === 2 ? 1.3 : 1;
      doc.circle(ox + point.xM * scale, oy + point.yM * scale, r, 'F');
    }
  }

  for (const obstacle of input.obstacles) {
    doc.setFillColor(obstacle.kind === 'pool' ? 207 : obstacle.kind === 'tree' ? 223 : 235, obstacle.kind === 'pool' ? 238 : obstacle.kind === 'tree' ? 242 : 238, obstacle.kind === 'pool' ? 255 : obstacle.kind === 'tree' ? 223 : 241);
    if (obstacle.shape === 'circle') {
      const d = obstacle.diameterM ?? 0;
      doc.ellipse(
        ox + (obstacle.xM + d / 2) * scale,
        oy + (obstacle.yM + d / 2) * scale,
        (d / 2) * scale,
        (d / 2) * scale,
        'F',
      );
    } else {
      doc.rect(
        ox + obstacle.xM * scale,
        oy + obstacle.yM * scale,
        (obstacle.widthM ?? 0) * scale,
        (obstacle.heightM ?? 0) * scale,
        'F',
      );
    }
  }

  doc.setDrawColor(24, 63, 100);
  doc.setLineWidth(0.6);
  doc.lines(vectors, first[0], first[1], [1, 1], 'S', true);
}

function drawInfoCell(doc: Pdf, label: string, value: string, x: number, y: number, w: number) {
  doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  doc.roundedRect(x, y, w, 18, 2, 2, 'F');
  text(doc, label.toUpperCase(), x + 4, y + 6, 6.5, true, MUTED);
  const valueLines = doc.splitTextToSize(value, w - 8) as string[];
  text(doc, valueLines[0] ?? '', x + 4, y + 13, 8.5, true, NAVY);
}

export async function generateClientPdf(input: ProjectInput, result: ConfiguratorResult, version: string): Promise<void> {
  const model = buildClientPdfModel(input, result, version);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  doc.setProperties({
    title: `Projet terrasse - ${model.projectName}`,
    subject: 'Configuration terrasse IDEA Bois',
    author: 'IDEA Bois x SpeedArti',
    creator: 'Configurateur Terrasse',
  });

  drawHeader(doc, 'Votre projet terrasse', 1);

  text(doc, model.projectName, 14, 34, 19, true, NAVY);
  text(doc, `Configuration generee le ${model.generatedAt}`, 14, 40, 8, false, MUTED);

  const budgetColor = model.basketStatus === 'complete' ? GREEN : model.basketStatus === 'range' ? AMBER : MUTED;
  doc.setFillColor(model.basketStatus === 'complete' ? 237 : model.basketStatus === 'range' ? 255 : 247, model.basketStatus === 'complete' ? 249 : model.basketStatus === 'range' ? 248 : 249, model.basketStatus === 'complete' ? 242 : model.basketStatus === 'range' ? 233 : 251);
  doc.roundedRect(132, 30, 64, 22, 3, 3, 'F');
  text(doc, model.budgetLabel, 136, 37, 7, true, budgetColor);
  text(doc, model.budgetValue, 136, 46, 13, true, budgetColor);

  text(doc, 'Apercu du projet', 14, 61, 11, true, NAVY);
  drawPlan(doc, input, result, 14, 66, 82, 70);

  drawInfoCell(doc, 'Surface nette', model.surface, 104, 66, 43);
  drawInfoCell(doc, 'Zones exclues', model.excludedSurface, 153, 66, 43);
  drawInfoCell(doc, 'Forme', model.shape, 104, 90, 43);
  drawInfoCell(doc, 'Hauteur finie', model.height, 153, 90, 43);
  drawInfoCell(doc, 'Support', model.support, 104, 114, 43);
  drawInfoCell(doc, 'Appuis', model.supportSystem, 153, 114, 43);

  text(doc, 'Votre choix', 14, 151, 11, true, NAVY);
  drawInfoCell(doc, 'Lames', model.decking, 14, 156, 88);
  drawInfoCell(doc, 'Sens de pose', model.orientation, 108, 156, 88);
  drawInfoCell(doc, 'Dimensions', model.dimensions, 14, 180, 88);
  drawInfoCell(doc, 'Finitions', model.finishes, 108, 180, 88);

  drawInfoCell(doc, 'Reservations', model.obstacles, 14, 204, 182);

  doc.setFillColor(238, 247, 255);
  doc.roundedRect(14, 227, 182, 22, 3, 3, 'F');
  text(doc, 'Votre panier materiaux', 19, 235, 9.5, true, NAVY);
  wrapped(doc, model.clientNote, 19, 241, 172, 7.5, MUTED);

  text(doc, 'Important', 14, 258, 9, true, NAVY);
  wrapped(
    doc,
    'Les prix presentes correspondent aux donnees catalogue integrees a la demonstration. Les prix et stocks seront resynchronises avec le systeme IDEA Bois lors de la mise en production.',
    14,
    264,
    182,
    7.5,
    MUTED,
  );

  drawFooter(doc, version);

  doc.addPage();
  drawHeader(doc, 'Detail du panier materiaux', 2);

  let y = 34;
  const col = { family: 14, product: 38, ref: 108, qty: 136, price: 165 };
  text(doc, 'FAMILLE', col.family, y, 6.5, true, MUTED);
  text(doc, 'PRODUIT', col.product, y, 6.5, true, MUTED);
  text(doc, 'REFERENCE', col.ref, y, 6.5, true, MUTED);
  text(doc, 'QUANTITE', col.qty, y, 6.5, true, MUTED);
  text(doc, 'PRIX TTC', col.price, y, 6.5, true, MUTED);
  y += 4;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(14, y, 196, y);
  y += 5;

  for (const line of model.lines) {
    const productLines = doc.splitTextToSize(clean(line.label), 66) as string[];
    const refLines = doc.splitTextToSize(clean(line.reference), 25) as string[];
    const qtyLines = doc.splitTextToSize(clean(line.quantity), 26) as string[];
    const priceLines = doc.splitTextToSize(clean(line.price), 30) as string[];
    const rowHeight = Math.max(14, productLines.length * 4 + 7, refLines.length * 4 + 7, qtyLines.length * 4 + 7, priceLines.length * 4 + 7);

    if (y + rowHeight > 268) {
      drawFooter(doc, version);
      doc.addPage();
      drawHeader(doc, 'Detail du panier materiaux', doc.getNumberOfPages());
      y = 34;
    }

    if (line.status === 'a-confirmer') {
      doc.setFillColor(251, 252, 253);
    } else if (line.status === 'fourchette' || line.status === 'indicatif') {
      doc.setFillColor(255, 250, 240);
    } else {
      doc.setFillColor(248, 252, 250);
    }
    doc.roundedRect(14, y - 2, 182, rowHeight, 2, 2, 'F');

    text(doc, line.family, col.family + 2, y + 4, 7, true, NAVY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(productLines, col.product, y + 4);
    doc.text(refLines, col.ref, y + 4);
    doc.text(qtyLines, col.qty, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(priceLines, col.price, y + 4);

    const statusText = line.status === 'calcule' ? 'calcule' : line.status === 'fourchette' ? 'fourchette' : line.status === 'indicatif' ? 'indicatif' : 'a confirmer';
    text(doc, statusText, col.product, y + rowHeight - 3.5, 6.3, false, MUTED);
    y += rowHeight + 3;
  }

  if (y + 42 > 268) {
    drawFooter(doc, version);
    doc.addPage();
    drawHeader(doc, 'Recapitulatif financier', doc.getNumberOfPages());
    y = 40;
  }

  doc.setFillColor(model.basketStatus === 'complete' ? 234 : model.basketStatus === 'range' ? 255 : 247, model.basketStatus === 'complete' ? 248 : model.basketStatus === 'range' ? 248 : 249, model.basketStatus === 'complete' ? 240 : model.basketStatus === 'range' ? 233 : 251);
  doc.roundedRect(118, y, 78, 23, 3, 3, 'F');
  text(doc, model.budgetLabel, 123, y + 8, 7, true, budgetColor);
  text(doc, model.budgetValue, 123, y + 17, 12, true, budgetColor);
  y += 31;

  wrapped(doc, model.clientNote, 14, y, 182, 8.5, MUTED);

  text(doc, 'Ce document est un recapitulatif materiaux issu du configurateur et ne constitue pas une etude structurelle.', 14, 272, 7.2, false, MUTED);
  drawFooter(doc, version);

  doc.addPage();
  drawHeader(doc, 'Plan technique de pose', doc.getNumberOfPages());
  text(doc, 'Calepinage des lames', 14, 33, 11, true, NAVY);
  wrapped(doc, `${model.layingPattern} - ${model.orientation} - ${model.boardLayout}`, 14, 39, 182, 7.5, MUTED);
  drawPlan(doc, input, result, 14, 48, 182, 78);
  text(doc, model.stockSummary, 14, 133, 7.2, false, MUTED);

  text(doc, 'Structure et appuis', 14, 148, 11, true, NAVY);
  wrapped(doc, model.structureSummary, 14, 154, 182, 7.5, MUTED);
  drawStructurePlan(doc, input, result, 14, 166, 182, 72);
  wrapped(doc, model.plotSummary, 14, 246, 182, 7.5, MUTED);
  drawFooter(doc, version);

  doc.addPage();
  drawHeader(doc, 'Cotes, niveaux et tracabilite', doc.getNumberOfPages());
  let technicalY = 34;

  const writeTechnicalSection = (title: string, values: string[]) => {
    if (!values.length) return;
    if (technicalY > 250) {
      drawFooter(doc, version);
      doc.addPage();
      drawHeader(doc, 'Cotes, niveaux et tracabilite', doc.getNumberOfPages());
      technicalY = 34;
    }
    text(doc, title, 14, technicalY, 9.5, true, NAVY);
    technicalY += 6;
    for (const value of values) {
      const nextY = wrapped(doc, `- ${value}`, 18, technicalY, 174, 7.2, MUTED);
      technicalY = nextY + 1.5;
      if (technicalY > 264) {
        drawFooter(doc, version);
        doc.addPage();
        drawHeader(doc, 'Cotes, niveaux et tracabilite', doc.getNumberOfPages());
        technicalY = 34;
      }
    }
    technicalY += 4;
  };

  writeTechnicalSection('Cotes du contour', model.edgeDimensions);
  writeTechnicalSection('Reservations', model.obstacleDetails.length ? model.obstacleDetails : ['Aucune reservation']);
  writeTechnicalSection('Niveaux et pentes', [model.levelSummary]);
  writeTechnicalSection('Fond de reference', [model.referencePlanSummary]);
  writeTechnicalSection('Sources techniques', model.sources.length ? model.sources : ['Aucune source supplementaire']);
  writeTechnicalSection('Points a confirmer / avertissements', model.warnings.length ? model.warnings : ['Aucun avertissement technique actif']);
  wrapped(doc, 'Les donnees signalees a confirmer ne sont jamais transformees en valeurs certaines. Les prix restent des donnees catalogue integrees et non des donnees ERP temps reel.', 14, Math.min(technicalY + 2, 270), 182, 7.2, MUTED);
  drawFooter(doc, version);

  doc.save(`IDEA-Bois-${safeFileName(model.projectName)}.pdf`);
}
