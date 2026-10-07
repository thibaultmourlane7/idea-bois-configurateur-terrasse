import type { BoardSpec } from '../domain/types';
import { ideaBoisBoards } from './catalogue';

export type CompatibilityState = 'validated' | 'partial' | 'missing';

export interface CompatibilityItem {
  state: CompatibilityState;
  label: string;
  detail: string;
}

export interface ProductCompatibilityProfile {
  boardId: string;
  boardLabel: string;
  recipeId?: BoardSpec['commercialRecipeId'];
  systemKey?: string;
  catalog: CompatibilityItem;
  layout: CompatibilityItem;
  structure: CompatibilityItem;
  fixings: CompatibilityItem;
  supports: CompatibilityItem;
  edgeFinish: CompatibilityItem;
  zoneProduct: CompatibilityItem;
  overall: CompatibilityState;
}

const validated = (label: string, detail: string): CompatibilityItem => ({ state: 'validated', label, detail });
const partial = (label: string, detail: string): CompatibilityItem => ({ state: 'partial', label, detail });
const missing = (label: string, detail: string): CompatibilityItem => ({ state: 'missing', label, detail });

function recipeSystemKey(board: BoardSpec): string | undefined {
  if (!board.commercialRecipeId) return undefined;
  return board.commercialRecipeId;
}

function structureItem(board: BoardSpec): CompatibilityItem {
  const recipe = board.commercialRecipeId;
  if (recipe === 'idea-pin-nord-145x27' || recipe === 'idea-resineux-class4')
    return validated('Structure bois validée', 'Lambourde pin Classe 4 60 × 40 mm documentée.');
  if (recipe === 'idea-cumaru-145x21' || recipe === 'idea-ipe-140x20')
    return validated('Structure exotique validée', 'Lambourde bois exotique 65 × 42 mm documentée.');
  if (recipe === 'idea-garapa-145x21' || recipe === 'idea-padouk-120x21')
    return partial('Choix de structure requis', 'Pin Classe 4 ou bois exotique : choix explicite nécessaire avant calcul définitif.');
  if (recipe === 'silvadec-atmosphere-138x23')
    return validated('Réversil documentée', 'Réversil aluminium 63 × 40 mm et entraxe fabricant de 400 mm maximum documentés. Une autre structure compatible peut être choisie séparément.');
  if (recipe === 'idea-bamboo-137x20' && board.id === 'IDEA-TERR-G002')
    return validated('Structure MOSO documentée', 'Lambourde bambou MOSO Thermo-Density BO-SB155 et entraxe de 462,5 mm documentés.');
  if (recipe === 'idea-bamboo-137x20')
    return partial('Structure DASSO documentée partiellement', 'La lambourde bambou DASSO XTR est identifiée ; le plan d’appuis précis reste à confirmer.');
  if (recipe === 'idea-prolin-pin-nord-120x28')
    return partial('Structure PROLIN spécifique', 'Pose sur lambourde bois autoclave avec clips invisibles documentée ; entraxes et références de clips restent à compléter.');
  return missing('Structure non mappée', 'Aucune recette structurelle validée n’est liée à cette référence.');
}

function fixingItem(board: BoardSpec): CompatibilityItem {
  const recipe = board.commercialRecipeId;
  if (recipe === 'silvadec-atmosphere-138x23')
    return validated('Clips SILVADEC', 'Clips + vis inox SILVADEC documentés.');
  if (['idea-pin-nord-145x27','idea-resineux-class4'].includes(recipe ?? ''))
    return validated('Vis inox bois', 'Vis inox A2 5 × 60 mm documentées pour le panier actuel.');
  if (['idea-cumaru-145x21','idea-garapa-145x21','idea-padouk-120x21','idea-ipe-140x20'].includes(recipe ?? ''))
    return validated('Vis inox bois dur', 'Vis terrasse inox A2 5 × 60 mm bois dur documentées.');
  if (recipe === 'idea-bamboo-137x20' && board.id === 'IDEA-TERR-G002')
    return validated('Clips MOSO', 'Fixation par clips MOSO documentée, environ 20 clips/m² pour cette lame. Le prix du conditionnement reste à référencer.');
  if (recipe === 'idea-bamboo-137x20')
    return partial('Clips DASSO documentés', 'La fixation par clips DASSO est documentée ; la référence commerciale IDEA Bois et son prix restent à confirmer.');
  if (recipe === 'idea-prolin-pin-nord-120x28')
    return partial('Clips invisibles PROLIN', 'Le principe de fixation par clips est documenté ; référence et consommation exactes restent à confirmer.');
  return missing('Fixation non mappée', 'Aucune fixation commerciale validée n’est liée à cette référence.');
}

function supportItem(board: BoardSpec): CompatibilityItem {
  const recipe = board.commercialRecipeId;
  if (['idea-pin-nord-145x27','idea-resineux-class4','idea-cumaru-145x21','idea-garapa-145x21','idea-padouk-120x21','idea-ipe-140x20'].includes(recipe ?? ''))
    return validated('Plots bois référencés', 'Le moteur dispose de plots bois tarifés et de règles d’espacement documentées, sous réserve des hauteurs réellement couvertes.');
  if (recipe === 'silvadec-atmosphere-138x23')
    return partial('Appuis Réversil documentés', 'Entraxe d’appuis de 600 mm maximum en résidentiel documenté ; la référence commerciale du plot reste à confirmer.');
  if (recipe === 'idea-bamboo-137x20' && board.id === 'IDEA-TERR-G002')
    return partial('Appuis MOSO calculables', 'Implantation fabricant documentée ; la référence commerciale des appuis reste à confirmer.');
  if (recipe === 'idea-bamboo-137x20')
    return partial('Appuis DASSO à confirmer', 'La structure bambou est identifiée mais la règle précise des appuis n’est pas assez documentée pour un plan définitif.');
  if (recipe === 'idea-prolin-pin-nord-120x28')
    return partial('Appuis PROLIN à confirmer', 'Le support bois est connu mais la règle d’appuis n’est pas encore suffisamment documentée.');
  return missing('Appuis non mappés', 'Aucune règle d’appuis validée n’est liée à cette référence.');
}

function edgeItem(board: BoardSpec): CompatibilityItem {
  const recipe = board.commercialRecipeId;
  if (recipe === 'silvadec-atmosphere-138x23')
    return partial('Jupe SILVADEC partiellement référencée', 'La finition dédiée est identifiée ; certaines références/angles restent à confirmer.');
  if (recipe && board.technical.materialFamily === 'solid-wood' && board.gapMm != null && board.priceTtcPerM2 != null)
    return validated('Habillage avec lame identique', 'Le moteur peut chiffrer l’habillage avec la même lame lorsque la géométrie est droite.');
  if (recipe)
    return partial('Rive partielle', 'Une règle produit manque encore pour figer automatiquement la finition.');
  return missing('Finition non mappée', 'Aucune finition de rive validée n’est liée à cette référence.');
}

export function getProductCompatibility(board: BoardSpec): ProductCompatibilityProfile {
  const variantCount = board.catalog?.variants?.length ?? 0;
  const exactVariantRefs = board.catalog?.variants?.filter((variant) => Boolean(variant.productRef)).length ?? 0;
  const catalog = board.priceTtcPerM2 != null && board.availableLengthsMm?.length
    ? variantCount && exactVariantRefs === variantCount
      ? validated('Catalogue vérifié', 'Prix, longueurs et SKU sont tous associés aux variantes actuellement vérifiées.')
      : partial('Catalogue exploitable', 'Prix et longueurs sont connus ; certains SKU restent volontairement non associés.')
    : partial('Catalogue partiel', 'Une donnée commerciale manque encore pour une commande exacte.');

  const layout = board.gapMm != null && Number.isFinite(board.gapMm)
    ? validated('Calepinage calculable', `Jeu de pose exact : ${board.gapMm} mm.`)
    : board.gapRangeMm
      ? partial('Jeu sous forme de plage', `Jeu publié : ${board.gapRangeMm[0]}–${board.gapRangeMm[1]} mm ; aucune valeur unique n’est imposée.`)
      : missing('Jeu de pose manquant', 'Le moteur ne peut pas calculer le calepinage final sans jeu validé.');

  const structure = structureItem(board);
  const fixings = fixingItem(board);
  const supports = supportItem(board);
  const edgeFinish = edgeItem(board);
  const systemKey = recipeSystemKey(board);
  const zoneProduct = systemKey && layout.state === 'validated' && structure.state === 'validated' && fixings.state === 'validated'
    ? validated('Produit utilisable par zone', 'Autorisé uniquement avec une autre lame du même système constructif validé.')
    : partial('Produit de zone limité', 'Le produit ne peut pas être mélangé à une autre famille tant que ses règles ne sont pas complètes.');

  const states = [catalog, layout, structure, fixings, supports, edgeFinish];
  const overall: CompatibilityState = states.some((item) => item.state === 'missing')
    ? 'missing'
    : states.some((item) => item.state === 'partial')
      ? 'partial'
      : 'validated';

  return {
    boardId: board.id,
    boardLabel: board.label,
    recipeId: board.commercialRecipeId,
    systemKey,
    catalog,
    layout,
    structure,
    fixings,
    supports,
    edgeFinish,
    zoneProduct,
    overall,
  };
}

export function compatibilityMatrix(): ProductCompatibilityProfile[] {
  return ideaBoisBoards.map(getProductCompatibility);
}

export function findBoard(boardId: string | undefined): BoardSpec | undefined {
  if (!boardId) return undefined;
  return ideaBoisBoards.find((board) => board.id === boardId);
}

export function boardForZone(primary: BoardSpec, boardId?: string): BoardSpec {
  return findBoard(boardId) ?? primary;
}

export function canUseBoardInZone(primary: BoardSpec, candidate: BoardSpec): { allowed: boolean; reason: string } {
  if (candidate.id === primary.id) return { allowed: true, reason: 'Produit principal.' };
  const a = getProductCompatibility(primary);
  const b = getProductCompatibility(candidate);
  if (!a.systemKey || !b.systemKey || a.systemKey !== b.systemKey) {
    return { allowed: false, reason: 'Systèmes constructifs différents : jonction inter-systèmes non validée.' };
  }
  if (a.layout.state !== 'validated' || b.layout.state !== 'validated') {
    return { allowed: false, reason: 'Le jeu de pose exact doit être validé pour les deux produits.' };
  }
  if (a.structure.state !== 'validated' || b.structure.state !== 'validated' || a.fixings.state !== 'validated' || b.fixings.state !== 'validated') {
    return { allowed: false, reason: 'Structure et fixations doivent être validées pour les deux produits.' };
  }
  if (primary.thicknessMm !== candidate.thicknessMm) {
    return { allowed: false, reason: 'Épaisseurs différentes : transition de niveau non validée.' };
  }
  return { allowed: true, reason: 'Même système constructif validé ; calcul par zone autorisé.' };
}

export function compatibleZoneBoards(primary: BoardSpec): BoardSpec[] {
  return ideaBoisBoards.filter((candidate) => canUseBoardInZone(primary, candidate).allowed);
}
