import type { BasketLineStatus, ConfiguratorResult, ProjectInput } from '../domain/types';

export type CommercialIntent = 'receive-project' | 'quote-request' | 'advisor-callback' | 'cart';

export interface CustomerContact {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  postalCode: string;
  consent: boolean;
}

export interface CommercialBasketLine {
  family: string;
  label: string;
  productRef?: string;
  quantity?: number;
  quantityMin?: number;
  quantityMax?: number;
  unit: string;
  totalTtc?: number;
  totalMinTtc?: number;
  totalMaxTtc?: number;
  status: BasketLineStatus;
}

export interface CommercialProjectPayload {
  source: 'idea-bois-configurateur-terrasse';
  schemaVersion: '1.0';
  configuratorVersion: string;
  intent: CommercialIntent;
  createdAt: string;
  project: ProjectInput;
  resultSummary: {
    areaM2?: number;
    perimeterM?: number;
    basketStatus?: 'complete' | 'range' | 'partial';
    totalTtc?: number;
    totalMinTtc?: number;
    totalMaxTtc?: number;
    knownSubtotalTtc?: number;
    lines: CommercialBasketLine[];
  };
  customer?: CustomerContact;
  excludesLabor: true;
}

export interface CommercialSubmitResult {
  status: 'prepared-demo' | 'sent';
  reference: string;
  message: string;
}

export interface CommercialAdapter {
  submit(payload: CommercialProjectPayload): Promise<CommercialSubmitResult>;
}

export interface CartReadiness {
  ready: boolean;
  blockers: string[];
  exactLines: number;
  totalLines: number;
}

export function assessCartReadiness(result: ConfiguratorResult): CartReadiness {
  const lines = result.basket?.lines ?? [];
  const blockers: string[] = [];

  if (!result.basket || result.basket.status !== 'complete') {
    blockers.push('Le panier matériel n’est pas encore entièrement chiffré.');
  }

  for (const line of lines) {
    if (line.required && line.status !== 'exact') {
      blockers.push(`${line.label} : quantité ou prix encore à confirmer.`);
    }
    if (line.required && !line.productRef) {
      blockers.push(`${line.label} : référence produit à valider.`);
    }
  }

  const decking = lines.find((line) => line.family === 'decking');
  if (decking?.productRef?.includes(',')) {
    blockers.push('Les longueurs de lames doivent encore être mappées vers leurs SKU IDEA Bois exacts avant création du panier.');
  }

  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)],
    exactLines: lines.filter((line) => line.status === 'exact').length,
    totalLines: lines.length,
  };
}
