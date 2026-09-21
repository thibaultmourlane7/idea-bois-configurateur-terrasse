import type { Diagnostic, ProjectInput } from '../domain/types';
import { RULE_TAGS } from '../domain/rules';
import { NF_DTU_51_4_2018 } from '../referentials/nf-dtu-51-4-2018';

export function validateScope(input: ProjectInput): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (input.heightCm > NF_DTU_51_4_2018.scope.maxDeckHeightCm) {
    diagnostics.push({
      tag: RULE_TAGS.scopeHeight,
      severity: 'blocking',
      message: 'Cette terrasse nécessite une étude de structure spécifique.',
      technicalMessage: `Hauteur ${input.heightCm} cm > domaine courant NF DTU 51.4 (${NF_DTU_51_4_2018.scope.maxDeckHeightCm} cm).`,
      source: 'NF DTU 51.4 / Guide terrasse bois V4',
    });
  }

  if (input.heightCm > NF_DTU_51_4_2018.scope.maxPolymerPedestalHeightCm) {
    diagnostics.push({
      tag: RULE_TAGS.polymerPedestalHeight,
      severity: 'warning',
      message: 'La hauteur demandée nécessite de vérifier le système de support avant validation.',
      technicalMessage: `La solution courante sur plots polymères est limitée à ${NF_DTU_51_4_2018.scope.maxPolymerPedestalHeightCm} cm sous les lames dans le référentiel utilisé.`,
      source: 'NF DTU 51.4 / Guide terrasse bois V4',
    });
  }

  if (input.supportType === 'existing-concrete-slab' || input.supportType === 'new-concrete-slab') {
    if (input.drainage === 'no') {
      diagnostics.push({
        tag: RULE_TAGS.drainage,
        severity: 'blocking',
        message: "L'eau doit pouvoir s'évacuer avant de valider la terrasse.",
        technicalMessage: 'Support béton déclaré sans évacuation correcte des eaux.',
        source: 'NF DTU 51.4 / Guide terrasse bois V4',
      });
    } else if (input.drainage === 'unknown') {
      diagnostics.push({
        tag: RULE_TAGS.drainage,
        severity: 'warning',
        message: "La pente et l'évacuation de l'eau devront être vérifiées avant la pose.",
        technicalMessage: 'Pente exacte non demandée dans le parcours particulier. Contrôle chantier requis.',
        source: 'NF DTU 51.4 / Guide terrasse bois V4',
      });
    }
  }

  return diagnostics;
}
