import type { ConfiguratorResult, ProjectInput } from '../domain/types';

const number = (value: number, digits = 1) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function Results({ input, result }: { input: ProjectInput; result: ConfiguratorResult }) {
  if (!result.geometry) return null;

  const pricing = result.pricing;
  const displayedBoardPrice = pricing?.boardPurchaseTtc ?? pricing?.surfaceNetTtc;

  if (!result.valid || !result.layout || !result.structure) {
    return (
      <section className="partial-results">
        <div className="results-grid">
          <article className="result-card highlight">
            <span>Surface</span>
            <strong>{number(result.geometry.areaM2, 2)} m²</strong>
            <small>surface nette du projet</small>
          </article>
          <article className="result-card">
            <span>Produit</span>
            <strong className="product-result-name">{input.board.label}</strong>
            <small>{input.board.catalog?.material ?? input.board.subtitle}</small>
          </article>
          <article className="result-card price-card">
            <span>Prix des lames</span>
            <strong>{displayedBoardPrice != null ? euro(displayedBoardPrice) : 'À confirmer'}</strong>
            <small>{pricing?.unitPriceTtcPerM2 != null ? `${euro(pricing.unitPriceTtcPerM2)} / m² • surface nette` : 'aucun prix inventé'}</small>
          </article>
        </div>
        <div className="price-status warning">
          <strong>Le prix affiché concerne les lames sur la surface nette.</strong>
          <span>Le total matériel final ajoutera sous-structure, appuis, fixations et accessoires après validation des règles techniques IDEA Bois. Les longueurs commerciales seront alors optimisées automatiquement.</span>
        </div>
      </section>
    );
  }

  const fixing = result.structure.fixingCount == null
    ? 'À finaliser'
    : `${result.structure.fixingCount.toLocaleString('fr-FR')} vis`;

  return (
    <section className="partial-results">
      <div className="results-grid">
        <article className="result-card highlight">
          <span>Surface</span>
          <strong>{number(result.geometry.areaM2, 2)} m²</strong>
          <small>surface de votre projet</small>
        </article>
        <article className="result-card">
          <span>Lames</span>
          <strong>{result.layout.stockBoards.length}</strong>
          <small>longueurs commerciales optimisées</small>
        </article>
        <article className="result-card price-card">
          <span>Prix lames à acheter</span>
          <strong>{pricing?.boardPurchaseTtc != null ? euro(pricing.boardPurchaseTtc) : 'À confirmer'}</strong>
          <small>{pricing?.unitPriceTtcPerM2 != null ? `${euro(pricing.unitPriceTtcPerM2)} / m²` : 'prix catalogue requis'}</small>
        </article>
        <article className="result-card">
          <span>Lambourdes</span>
          <strong>{number(result.structure.joistLinearM)} ml</strong>
          <small>structure calculée automatiquement</small>
        </article>
        <article className="result-card">
          <span>Points d’appui</span>
          <strong>{result.structure.supportPointCount}</strong>
          <small>plots, cales ou appuis selon le support</small>
        </article>
        <article className="result-card">
          <span>Fixations</span>
          <strong>{fixing}</strong>
          <small>{result.structure.fixingStatus === 'exact' ? 'calcul selon les croisements' : 'calepinage des raccords à finaliser'}</small>
        </article>
        <article className="result-card">
          <span>Chutes</span>
          <strong>{number(result.layout.wastePercent)} %</strong>
          <small>optimisation matière multi-longueurs</small>
        </article>
      </div>
      <div className="price-status">
        <strong>Total matériel complet : en préparation.</strong>
        <span>Les lames sont chiffrées. Les autres familles seront ajoutées uniquement avec leurs références, prix et règles compatibles validés.</span>
      </div>
    </section>
  );
}
