import type { ConfiguratorResult, ProjectInput } from '../domain/types';

const number = (value: number, digits = 1) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });

export function Results({ input, result }: { input: ProjectInput; result: ConfiguratorResult }) {
  if (!result.geometry) return null;

  if (!result.valid || !result.layout || !result.structure) {
    return (
      <section className="result-empty">
        <div className="result-icon">!</div>
        <h2>Quelques informations sont encore nécessaires</h2>
        <p>Le configurateur ne complète jamais un calcul technique avec une valeur inventée.</p>
      </section>
    );
  }

  const fixing = result.structure.fixingCount == null
    ? 'À finaliser'
    : `${result.structure.fixingCount.toLocaleString('fr-FR')} vis`;

  return (
    <section className="results-grid">
      <article className="result-card highlight">
        <span>Surface</span>
        <strong>{number(result.geometry.areaM2, 2)} m²</strong>
        <small>surface de votre projet</small>
      </article>
      <article className="result-card">
        <span>Lames</span>
        <strong>{result.layout.stockBoards.length}</strong>
        <small>{input.board.subtitle}</small>
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
        <small>optimisation matière V0.6</small>
      </article>
    </section>
  );
}
