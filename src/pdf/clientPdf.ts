import { jsPDF } from 'jspdf';
import type { ConfiguratorResult, ProjectInput } from '../domain/types';
import { buildClientPdfModel } from './clientPdfModel';

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

function drawPlan(doc: Pdf, input: ProjectInput, x: number, y: number, width: number, height: number) {
  const L = input.dimensions.lengthM;
  const W = input.dimensions.widthM;
  const nL = input.dimensions.notchLengthM;
  const nW = input.dimensions.notchWidthM;
  const scale = Math.min((width - 8) / L, (height - 8) / W);
  const ox = x + (width - L * scale) / 2;
  const oy = y + (height - W * scale) / 2;

  doc.setFillColor(250, 252, 254);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  doc.setFillColor(217, 181, 141);
  doc.setDrawColor(24, 63, 100);
  doc.setLineWidth(0.6);

  if (input.shape === 'rectangle') {
    doc.rect(ox, oy, L * scale, W * scale, 'FD');
  } else {
    const points = [
      [ox, oy],
      [ox + L * scale, oy],
      [ox + L * scale, oy + (W - nW) * scale],
      [ox + (L - nL) * scale, oy + (W - nW) * scale],
      [ox + (L - nL) * scale, oy + W * scale],
      [ox, oy + W * scale],
    ];
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      'FD',
      true,
    );
  }

  doc.setDrawColor(118, 88, 60);
  doc.setLineWidth(0.25);
  const pitchM = Math.max(0.08, (input.board.widthMm + (input.board.gapMm ?? 0)) / 1000);

  if (input.orientation === 'length') {
    for (let pos = pitchM; pos < W; pos += pitchM) {
      const yy = oy + pos * scale;
      if (input.shape === 'rectangle' || pos <= W - nW) {
        doc.line(ox, yy, ox + L * scale, yy);
      } else {
        doc.line(ox, yy, ox + (L - nL) * scale, yy);
      }
    }
  } else {
    for (let pos = pitchM; pos < L; pos += pitchM) {
      const xx = ox + pos * scale;
      if (input.shape === 'rectangle' || pos <= L - nL) {
        doc.line(xx, oy, xx, oy + W * scale);
      } else {
        doc.line(xx, oy, xx, oy + (W - nW) * scale);
      }
    }
  }
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
  drawPlan(doc, input, 14, 66, 82, 70);

  drawInfoCell(doc, 'Surface', model.surface, 104, 66, 43);
  drawInfoCell(doc, 'Perimetre', model.perimeter, 153, 66, 43);
  drawInfoCell(doc, 'Forme', model.shape, 104, 90, 43);
  drawInfoCell(doc, 'Hauteur finie', model.height, 153, 90, 43);
  drawInfoCell(doc, 'Support', model.support, 104, 114, 43);
  drawInfoCell(doc, 'Appuis', model.supportSystem, 153, 114, 43);

  text(doc, 'Votre choix', 14, 151, 11, true, NAVY);
  drawInfoCell(doc, 'Lames', model.decking, 14, 156, 88);
  drawInfoCell(doc, 'Sens de pose', model.orientation, 108, 156, 88);
  drawInfoCell(doc, 'Dimensions', model.dimensions, 14, 180, 88);
  drawInfoCell(doc, 'Finitions', model.finishes, 108, 180, 88);

  doc.setFillColor(238, 247, 255);
  doc.roundedRect(14, 207, 182, 30, 3, 3, 'F');
  text(doc, 'Votre panier materiaux', 19, 216, 10, true, NAVY);
  wrapped(doc, model.clientNote, 19, 223, 172, 8.5, MUTED);

  text(doc, 'Important', 14, 251, 9, true, NAVY);
  wrapped(
    doc,
    'Les prix presentes correspondent aux donnees catalogue integrees a la demonstration. Les prix et stocks seront resynchronises avec le systeme IDEA Bois lors de la mise en production.',
    14,
    257,
    182,
    8,
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

  doc.save(`IDEA-Bois-${safeFileName(model.projectName)}.pdf`);
}
