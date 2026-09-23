import type { BoardSpec, ProjectInput } from '../domain/types';
import { runConfigurator } from '../engine/configurator';
import { getProductCompatibility } from './compatibility';

export type ProductReadiness = 'complete' | 'calculable' | 'partial' | 'price-only';

export interface ProductReadinessInfo {
  level: ProductReadiness;
  label: string;
  detail: string;
}

export function getProductReadiness(board: BoardSpec): ProductReadinessInfo {
  const compatibility = getProductCompatibility(board);
  const core = [compatibility.layout, compatibility.structure, compatibility.fixings];
  const coreValidated = core.every((item) => item.state === 'validated');

  if (coreValidated && compatibility.supports.state === 'validated') {
    return { level: 'complete', label: 'Panier calculable', detail: 'Calepinage, structure, fixations et appuis sont documentés dans la matrice V0.23.' };
  }
  if (coreValidated) {
    return { level: 'calculable', label: 'Calcul avancé', detail: 'Le calepinage et la structure sont calculables ; une famille commerciale reste partielle.' };
  }
  if (board.commercialRecipeId) {
    return { level: 'partial', label: 'Calcul partiel', detail: 'La matrice identifie précisément les compatibilités encore incomplètes.' };
  }
  if (board.priceTtcPerM2 != null) {
    return { level: 'price-only', label: 'Prix disponible', detail: 'Prix catalogue connu, système constructif non mappé.' };
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
