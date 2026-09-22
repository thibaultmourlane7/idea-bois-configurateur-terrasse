import type { BasketLine, ConfiguratorResult, ProjectInput } from '../domain/types';

export interface ClientPdfLine {
  family: string;
  label: string;
  reference: string;
  quantity: string;
  price: string;
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
  support: string;
  supportSystem: string;
  height: string;
  decking: string;
  orientation: string;
  finishes: string;
  basketStatus: 'complete' | 'range' | 'partial';
  budgetLabel: string;
  budgetValue: string;
  lines: ClientPdfLine[];
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
  return 'Rectangle';
}

function dimensionLabel(input: ProjectInput): string {
  const g = input.dimensions;
  if (input.shape === 'circle') return `Diametre ${fmt(g.circleDiameterM)} m`;
  if (input.shape === 'l-shape') return `${fmt(g.lengthM)} x ${fmt(g.widthM)} m - decroche ${fmt(g.notchLengthM)} x ${fmt(g.notchWidthM)} m`;
  if (input.shape === 't-shape') return `${fmt(g.lengthM)} x ${fmt(g.widthM)} m - pied ${fmt(g.tStemWidthM)} m - barre ${fmt(g.tBarDepthM)} m`;
  if (input.shape === 'u-shape') return `${fmt(g.lengthM)} x ${fmt(g.widthM)} m - ouverture ${fmt(g.uOpeningWidthM)} x ${fmt(g.uOpeningDepthM)} m`;
  return `${fmt(g.lengthM)} m x ${fmt(g.widthM)} m`;
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

  const finishParts = [input.edgeFinishMode === 'full-perimeter' ? `Habillage lateral du pourtour - hauteur ${fmt(input.edgeCladdingHeightCm)} cm` : 'Sans habillage lateral'];
  if (input.supportType === 'stabilized-ground') finishParts.push(input.includeGeotextile ? 'Geotextile inclus' : 'Sans geotextile');

  const lines = (basket?.lines ?? []).map((line): ClientPdfLine => ({
    family: familyLabels[line.family],
    label: line.label,
    reference: line.productRef ?? '-',
    quantity: quantity(line),
    price: price(line),
    status: lineStatus(line),
  }));

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
    obstacles: input.obstacles.length
      ? input.obstacles.map((obstacle) => obstacle.label).join(', ')
      : 'Aucune reservation',
    support: supportLabel(input),
    supportSystem: supportSystemLabel(input),
    height: `${fmt(input.heightCm)} cm`,
    decking: input.board.label,
    orientation: input.orientation === 'length' ? 'Dans la longueur' : 'Dans la largeur',
    finishes: finishParts.join(' - '),
    basketStatus,
    budgetLabel,
    budgetValue,
    lines,
    clientNote,
  };
}
