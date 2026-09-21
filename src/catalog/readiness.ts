import type { BoardSpec, ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';

export type ProductReadiness = 'complete' | 'calculable' | 'partial' | 'price-only';

export interface ProductReadinessInfo {
  level: ProductReadiness;
  label: string;
  detail: string;
}

export function getProductReadiness(board: BoardSpec): ProductReadinessInfo {
  if (board.commercialRecipeId === 'idea-pin-nord-145x27' || board.commercialRecipeId === 'idea-cumaru-145x21') {
    return { level: 'complete', label: 'Panier calculable', detail: 'Jeu, structure et fixations commerciales documentés.' };
  }
  if (board.commercialRecipeId === 'silvadec-atmosphere-138x23') {
    return { level: 'calculable', label: 'Calcul avancé', detail: 'Lames et clips calculables ; structure à finaliser.' };
  }
  if (board.commercialRecipeId === 'idea-garapa-145x21' || board.commercialRecipeId === 'idea-padouk-120x21' || board.commercialRecipeId === 'idea-ipe-140x20') {
    return { level: 'partial', label: 'Calcul partiel', detail: 'Composition commerciale documentée ; jeu final encore à confirmer.' };
  }
  if (board.priceTtcPerM2 != null) {
    return { level: 'price-only', label: 'Prix disponible', detail: 'Prix catalogue connu, règles techniques incomplètes.' };
  }
  return { level: 'price-only', label: 'À compléter', detail: 'Données insuffisantes pour un calcul commercial complet.' };
}

export function readinessRank(level: ProductReadiness): number {
  return level === 'complete' ? 0 : level === 'calculable' ? 1 : level === 'partial' ? 2 : 3;
}

export interface VariantComparison {
  board: BoardSpec;
  readiness: ProductReadinessInfo;
  budgetLabel: string;
  budgetValue?: number;
  budgetMin?: number;
  budgetMax?: number;
  basketStatus?: 'complete' | 'range' | 'partial';
}

export function buildVariantComparison(project: ProjectInput, boards: BoardSpec[]): VariantComparison[] {
  return boards.map((board) => {
    const result = runConfigurator({ ...project, board });
    const basket = result.basket;
    return {
      board,
      readiness: getProductReadiness(board),
      budgetLabel: basket?.status === 'complete' ? 'Total matériel TTC' : basket?.status === 'range' ? 'Budget TTC' : 'Sous-total chiffré',
      budgetValue: basket?.status === 'complete' ? basket.totalTtc : basket?.knownSubtotalTtc,
      budgetMin: basket?.totalMinTtc,
      budgetMax: basket?.totalMaxTtc,
      basketStatus: basket?.status,
    };
  });
}
