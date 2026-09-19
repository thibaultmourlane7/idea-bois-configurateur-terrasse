import type { ConfiguratorResult, ProjectInput } from '../domain/types';
import { validateProject } from '../domain/validation';
import { computeGeometry, GEOMETRY_TAG } from './geometry';
import { computeLayout, LAYOUT_TAG } from './layout';
import { CUT_TAG } from './cuts';
import { computePricing, PRICE_TAG } from './pricing';

export const MATERIAL_TAG = 'IB-TERR-MAT-001';

export function runConfigurator(input: ProjectInput): ConfiguratorResult {
  const diagnostics = validateProject(input);
  const blocked = diagnostics.some((d) => d.severity === 'blocking');
  const trace: string[] = [];

  if (blocked) return { valid: false, diagnostics, trace: ['Calcul bloqué : données critiques invalides.'] };

  const geometry = computeGeometry(input);
  trace.push(`[${GEOMETRY_TAG}] Surface = ${geometry.areaM2.toFixed(3)} m² ; périmètre = ${geometry.perimeterM.toFixed(3)} m.`);

  const layout = computeLayout(input);
  trace.push(`[${LAYOUT_TAG}] ${layout.rowCount} rangées ; ${layout.totalRequiredLinearM.toFixed(3)} ml nécessaires.`);
  trace.push(`[${CUT_TAG}] ${layout.stockBoards.length} lames de stock ; chute ${layout.wastePercent.toFixed(2)} %.`);
  trace.push(`[${MATERIAL_TAG}] Surface achetée = ${layout.purchasedAreaM2.toFixed(3)} m².`);

  const pricing = computePricing(input, layout);
  if (pricing.materialTtc != null) trace.push(`[${PRICE_TAG}] Fournitures lames = ${pricing.materialTtc.toFixed(2)} € TTC.`);
  else trace.push(`[${PRICE_TAG}] Prix non calculé : prix réel non fourni.`);

  trace.push('[IB-TERR-SCOPE-001] Aucun temps de pose ni coût de main-d’œuvre calculé.');
  return { valid: true, diagnostics, geometry, layout, pricing, trace };
}
