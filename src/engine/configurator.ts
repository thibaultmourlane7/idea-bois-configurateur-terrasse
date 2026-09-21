import type { ConfiguratorResult, Diagnostic, ProjectInput } from '../domain/types';
import { RULE_TAGS } from '../domain/rules';
import { validateProject } from '../domain/validation';
import { computeGeometry, GEOMETRY_TAG } from './geometry';
import { computeLayout, LAYOUT_TAG } from './layout';
import { CUT_TAG } from './cuts';
import { computePricing, PRICE_TAG } from './pricing';
import { validateScope } from './scope';
import { computeTechnicalSizing } from './technical';
import { computeStructure } from './structure';

export const VERSION_TAG = 'IB-TERR-VERSION-006';

export function runConfigurator(input: ProjectInput): ConfiguratorResult {
  const diagnostics: Diagnostic[] = [
    ...validateProject(input),
    ...validateScope(input),
  ];
  const trace: string[] = [`[${VERSION_TAG}] Parcours particulier résidentiel.`];

  if (diagnostics.some((d) => d.severity === 'blocking')) {
    return { valid: false, diagnostics, trace: [...trace, 'Calcul bloqué avant dimensionnement.'] };
  }

  const geometry = computeGeometry(input);
  trace.push(`[${GEOMETRY_TAG}] Surface ${geometry.areaM2.toFixed(3)} m² ; périmètre ${geometry.perimeterM.toFixed(3)} m.`);

  const technical = computeTechnicalSizing(input);
  if (!technical) return { valid: false, diagnostics, geometry, trace };
  diagnostics.push(...technical.diagnostics);
  if (diagnostics.some((d) => d.severity === 'blocking')) {
    return { valid: false, diagnostics, geometry, trace: [...trace, 'Dimensionnement technique bloqué : données produit insuffisantes.'] };
  }

  const structure = computeStructure(input, technical.boardMaxSupportSpacingMm, technical.joistMaxSupportSpacingMm);
  trace.push(`[${RULE_TAGS.boardSpan}] Entraxe maxi lame ${technical.boardMaxSupportSpacingMm} mm ; entraxe réel ${structure.joistActualSpacingMm.toFixed(1)} mm.`);
  trace.push(`[${RULE_TAGS.joistSpan}] Appuis lambourdes ≤ ${structure.joistSupportMaxSpacingMm} mm ; ${structure.supportPointCount} appuis calculés.`);

  const layout = computeLayout(input);
  trace.push(`[${LAYOUT_TAG}] ${layout.rowCount} rangées ; ${layout.totalRequiredLinearM.toFixed(3)} ml de lames nécessaires.`);
  trace.push(`[${CUT_TAG}] ${layout.stockBoards.length} lames de stock ; chute matière ${layout.wastePercent.toFixed(2)} %.`);

  if (layout.hasButtJoints) {
    diagnostics.push({
      tag: RULE_TAGS.joints,
      severity: 'warning',
      message: 'Le plan de coupe contient des raccords de lames : leur position sera finalisée avec le calepinage de pose.',
      technicalMessage: 'V0.6 optimise la matière mais ne verrouille pas encore chaque aboutage sur une lambourde dédiée/doublée. Le quantitatif de fixations reste indicatif dans ce cas.',
    });
    structure.fixingCount = undefined;
    structure.fixingStatus = 'pending-joint-layout';
  }

  const pricing = computePricing(input, layout);
  if (pricing.materialTtc != null) trace.push(`[${PRICE_TAG}] Fournitures lames ${pricing.materialTtc.toFixed(2)} € TTC.`);
  else trace.push(`[${PRICE_TAG}] Aucun prix inventé : catalogue IDEA Bois requis.`);

  trace.push('[SA-TERR-SCOPE-001] Aucun temps de pose, aucune heure de main-d’œuvre et aucun coût de main-d’œuvre.');

  return {
    valid: true,
    diagnostics,
    geometry,
    structure,
    layout,
    pricing,
    trace,
  };
}
