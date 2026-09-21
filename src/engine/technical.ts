import type { Diagnostic, ProjectInput } from '../domain/types';
import { RULE_TAGS } from '../domain/rules';
import { NF_DTU_51_4_2018 } from '../referentials/nf-dtu-51-4-2018';
import { getDeckBoundingSizeM } from './geometry';

export interface TechnicalSizing {
  boardMaxSupportSpacingMm: number;
  joistMaxSupportSpacingMm: number;
  diagnostics: Diagnostic[];
}

export function computeTechnicalSizing(input: ProjectInput): TechnicalSizing | null {
  const diagnostics: Diagnostic[] = [];
  const technical = input.board.technical;

  if (technical.technicalEngine === 'manufacturer-rules') {
    diagnostics.push({
      tag: RULE_TAGS.manufacturerRules,
      severity: 'blocking',
      message: 'Les données techniques du fabricant sont nécessaires pour calculer ce modèle.',
      technicalMessage: 'Produit composite / système propriétaire : aucun tableau bois du NF DTU 51.4 ne doit être extrapolé.',
      source: 'Règles fabricant / évaluation technique requise',
    });
    return { boardMaxSupportSpacingMm: 0, joistMaxSupportSpacingMm: 0, diagnostics };
  }

  const boardRule = NF_DTU_51_4_2018.residential.boardMaxSupportSpacing.find((rule) =>
    input.board.thicknessMm >= rule.minThicknessMm &&
    input.board.thicknessMm <= rule.maxThicknessMm &&
    input.board.widthMm === rule.widthMm &&
    technical.mechanicalClass === rule.mechanicalClass
  );

  if (!boardRule) {
    diagnostics.push({
      tag: RULE_TAGS.boardSpan,
      severity: 'blocking',
      message: 'Ce profil de lame doit être vérifié avant de calculer la structure.',
      technicalMessage: 'Aucune ligne validée du référentiel V0.6 ne correspond exactement à cette lame. Aucune interpolation n’est autorisée.',
      source: 'NF DTU 51.4 / Guide terrasse bois V4',
    });
    return { boardMaxSupportSpacingMm: 0, joistMaxSupportSpacingMm: 0, diagnostics };
  }

  const bounds = getDeckBoundingSizeM(input);
  const alongBoardMm = (input.orientation === 'length' ? bounds.lengthM : bounds.widthM) * 1000;
  const intervalCount = Math.max(1, Math.ceil(alongBoardMm / boardRule.maxSpacingMm));
  const actualJoistSpacingMm = alongBoardMm / intervalCount;

  const joistRule = NF_DTU_51_4_2018.residential.joistMaxSupportSpacing.find((rule) =>
    actualJoistSpacingMm >= rule.minJoistSpacingMm - 0.001 &&
    actualJoistSpacingMm <= rule.maxJoistSpacingMm + 0.001 &&
    input.joist.widthMm === rule.widthMm &&
    input.joist.heightMm === rule.heightMm &&
    input.joist.mechanicalClass === rule.mechanicalClass
  );

  if (!joistRule) {
    diagnostics.push({
      tag: RULE_TAGS.joistSpan,
      severity: 'blocking',
      message: 'La structure sélectionnée doit être vérifiée avant de continuer.',
      technicalMessage: 'Aucune ligne validée du référentiel V0.6 ne correspond à cette combinaison entraxe/section/classe de lambourde.',
      source: 'NF DTU 51.4 / Guide terrasse bois V4',
    });
    return { boardMaxSupportSpacingMm: boardRule.maxSpacingMm, joistMaxSupportSpacingMm: 0, diagnostics };
  }

  return {
    boardMaxSupportSpacingMm: boardRule.maxSpacingMm,
    joistMaxSupportSpacingMm: joistRule.maxSpacingMm,
    diagnostics,
  };
}
