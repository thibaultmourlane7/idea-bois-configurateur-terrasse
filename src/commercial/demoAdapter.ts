import type { CommercialAdapter, CommercialProjectPayload, CommercialSubmitResult } from './types';

export const COMMERCIAL_CONNECTION_STATUS = 'demo-disabled' as const;

/**
 * Démo sans réseau.
 * Aucun e-mail, CRM, ERP ou panier IDEA Bois n'est appelé avant vente/connexion.
 * Les données client ne sont ni persistées ni transmises.
 */
export const demoCommercialAdapter: CommercialAdapter = {
  async submit(payload: CommercialProjectPayload): Promise<CommercialSubmitResult> {
    const suffix = payload.createdAt.replace(/\D/g, '').slice(-10) || '0000000000';
    return {
      status: 'prepared-demo',
      reference: `IB-DEMO-${suffix}`,
      message: 'Demande préparée dans la démo. Aucun envoi réseau ni stockage client n’a été effectué.',
    };
  },
};
