import type { BasketLine, ConfiguratorResult, ProjectInput } from '../domain/types';

const number = (value: number, digits = 1) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const lengthLabel = (lengthMm: number) => `${number(lengthMm / 1000, 2)} m`;

function stockBreakdownLabel(line: BasketLine): string | null {
  if (!line.stockBreakdown?.length) return null;
  return line.stockBreakdown
    .map((item) => `${item.quantity} × ${lengthLabel(item.lengthMm)}${item.productRef ? ` (${item.productRef})` : ''}`)
    .join(' + ');
}

function hasUnmappedStockReference(line: BasketLine): boolean {
  return Boolean(line.stockBreakdown?.some((item) => !item.productRef));
}


const familyLabel: Record<BasketLine['family'], string> = {
  decking: 'Lames',
  joists: 'Lambourdes',
  supports: 'Plots / appuis',
  fixings: 'Fixations',
  protection: 'Protection',
  accessories: 'Accessoires',
};

function quantityLabel(line: BasketLine) {
  if (line.quantity != null) return `${number(line.quantity, 2)} ${line.unit}`;
  if (line.quantityMin != null && line.quantityMax != null) return `${number(line.quantityMin, 2)}–${number(line.quantityMax, 2)} ${line.unit}`;
  return 'À confirmer';
}

function priceLabel(line: BasketLine) {
  if (line.totalTtc != null) return euro(line.totalTtc);
  if (line.totalMinTtc != null && line.totalMaxTtc != null) return `${euro(line.totalMinTtc)} – ${euro(line.totalMaxTtc)}`;
  return line.status === 'informative' ? 'Prix indicatif' : 'À confirmer';
}

export function Results({ input, result }: { input: ProjectInput; result: ConfiguratorResult }) {
  if (!result.geometry) return null;

  const basket = result.basket;
  const headline = basket?.status === 'complete'
    ? { label: 'TOTAL MATÉRIEL TTC', value: euro(basket.totalTtc ?? 0), tone: 'complete' }
    : basket?.status === 'range'
      ? { label: 'BUDGET MATÉRIEL TTC', value: `${euro(basket.totalMinTtc ?? 0)} – ${euro(basket.totalMaxTtc ?? 0)}`, tone: 'range' }
      : { label: 'SOUS-TOTAL DÉJÀ CHIFFRÉ', value: euro(basket?.knownSubtotalTtc ?? 0), tone: 'partial' };

  return (
    <section className="material-result">
      <div className="project-summary-grid">
        <article className="result-card highlight">
          <span>Surface</span>
          <strong>{number(result.geometry.areaM2, 2)} m²</strong>
          <small>surface nette du projet</small>
          {result.geometry.excludedAreaM2 > 0 && (
            <div className="geometry-breakdown">
              <span>Brute {number(result.geometry.grossAreaM2, 2)} m²</span>
              <span>Exclue {number(result.geometry.excludedAreaM2, 2)} m²</span>
            </div>
          )}
        </article>
        <article className="result-card">
          <span>Produit</span>
          <strong className="product-result-name">{input.board.label}</strong>
          <small>
            {result.layout && result.layout.productSummaries.length > 1
              ? `${result.layout.productSummaries.length} références de lame utilisées par zone`
              : input.board.catalog?.material ?? input.board.subtitle}
          </small>
        </article>
        {result.supportPlan && result.supportPlan.status !== 'unavailable' && (
          <article className="result-card">
            <span>Structure V1.6.1</span>
            <strong>
              {result.supportPlan.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0)} plots
            </strong>
            <small>
              {result.supportPlan.minRequiredPlotHeightMm?.toFixed(0) ?? '?'}–{result.supportPlan.maxRequiredPlotHeightMm?.toFixed(0) ?? '?'} mm
              {' • '}{result.supportPlan.joistStockBoards.length} lambourdes à acheter
              {(result.supportPlan.buttJointAxisCount ?? result.supportPlan.buttJointAxisPositionsMm.length) ? input.doubleJoistsAtButtJoints ? ` • ${result.supportPlan.buttJointAxisCount ?? result.supportPlan.buttJointAxisPositionsMm.length} axe(s) doublé(s)` : ` • ${result.supportPlan.buttJointAxisCount ?? result.supportPlan.buttJointAxisPositionsMm.length} axe(s) de jonction` : ''}
            </small>
          </article>
        )}
        <article className={`result-card total-card ${headline.tone}`}>
          <span>{headline.label}</span>
          <strong>{headline.value}</strong>
          <small>{basket?.status === 'complete' ? 'panier de base calculé' : 'aucun montant manquant n’est inventé'}</small>
        </article>
      </div>

      <div className="basket-panel">
        <div className="basket-heading">
          <div><h3>Votre panier matériaux</h3><p>Lames, structure, appuis et fixations réunis au même endroit.</p></div>
          <span className={`basket-status ${basket?.status ?? 'partial'}`}>
            {basket?.status === 'complete' ? 'Panier calculé' : basket?.status === 'range' ? 'Fourchette calculée' : 'À compléter'}
          </span>
        </div>

        <div className="basket-lines">
          {(basket?.lines ?? []).map((line) => {
            const breakdown = stockBreakdownLabel(line);
            return (
            <article className={`basket-line ${line.status}`} key={line.id}>
              <div className="basket-family">{familyLabel[line.family]}</div>
              <div className="basket-product">
                <strong>{line.label}</strong>
                {line.productRef && <small>{breakdown ? 'Réf. produit sélectionnées : ' : 'Réf. '}{line.productRef}</small>}
                {breakdown && (
                  <div className="stock-breakdown">
                    <b>Longueurs à commander</b>
                    <span>{breakdown}</span>
                    <small>
                      {hasUnmappedStockReference(line)
                        ? 'Les longueurs sans SKU affiché restent volontairement non associées tant que la page produit exacte n’est pas vérifiée.'
                        : 'Chaque SKU affiché est associé à sa longueur à partir d’une page produit vérifiée.'}
                    </small>
                  </div>
                )}
                {line.note && <p>{line.note}</p>}
              </div>
              <div className="basket-qty">{quantityLabel(line)}</div>
              <div className="basket-price">
                <strong>{priceLabel(line)}</strong>
                {line.unitPriceTtc != null && <small>{euro(line.unitPriceTtc)} / {line.family === 'decking' ? 'm²' : line.unit}</small>}
              </div>
              <div className={`line-state ${line.status}`}>
                {line.status === 'exact' ? '✓' : line.status === 'range' ? '≈' : line.status === 'informative' ? 'i' : '…'}
              </div>
            </article>
            );
          })}
        </div>

        <div className={`basket-total ${basket?.status ?? 'partial'}`}>
          <div>
            <span>{headline.label}</span>
            {basket?.status === 'partial' && <small>Les lignes « À confirmer » ne sont pas ajoutées au montant.</small>}
            {basket?.status === 'range' && <small>La fourchette provient d’une consommation fabricant publiée sous forme de plage.</small>}
          </div>
          <strong>{headline.value}</strong>
        </div>
      </div>

      {!result.valid && (
        <div className="customer-check-note">
          <span>i</span>
          <div><strong>Votre panier est préparé.</strong><p>Certaines vérifications techniques restent nécessaires avant de permettre la commande en ligne. Elles sont détaillées plus bas pour le conseiller.</p></div>
        </div>
      )}
    </section>
  );
}
