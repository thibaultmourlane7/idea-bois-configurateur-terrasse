import type { BoardSpec, ProjectInput } from '../domain/types';
import { buildVariantComparison } from '../catalog/readiness';

const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function VariantComparator({
  project,
  boards,
  onChoose,
  onRemove,
}: {
  project: ProjectInput;
  boards: BoardSpec[];
  onChoose: (board: BoardSpec) => void;
  onRemove: (id: string) => void;
}) {
  if (boards.length < 2) return null;
  const variants = buildVariantComparison(project, boards);

  return (
    <section className="variant-comparator">
      <div className="variant-heading">
        <div><span>Comparateur</span><h3>Comparez vos variantes</h3></div>
        <small>Même terrasse, même support, seule la lame change.</small>
      </div>
      <div className="variant-grid">
        {variants.map((variant) => {
          const budget = variant.budgetMin != null && variant.budgetMax != null
            ? `${euro(variant.budgetMin)} – ${euro(variant.budgetMax)}`
            : variant.budgetValue != null ? euro(variant.budgetValue) : 'À compléter';
          return (
            <article className="variant-card" key={variant.board.id}>
              <button type="button" className="variant-remove" onClick={() => onRemove(variant.board.id)} aria-label="Retirer">×</button>
              <span className={`readiness-badge ${variant.readiness.level}`}>{variant.readiness.label}</span>
              <h4>{variant.board.label}</h4>
              <p>{variant.board.subtitle}</p>
              <dl>
                <div><dt>Prix lame</dt><dd>{variant.board.priceTtcPerM2 != null ? `${euro(variant.board.priceTtcPerM2)} / m²` : 'À confirmer'}</dd></div>
                <div><dt>{variant.budgetLabel}</dt><dd>{budget}</dd></div>
                <div><dt>Longueurs</dt><dd>{variant.board.availableLengthsMm?.map((v) => `${(v/1000).toLocaleString('fr-FR')} m`).join(' • ') ?? '—'}</dd></div>
                <div><dt>Disponibilité</dt><dd>{variant.board.catalog?.availabilitySnapshot ?? 'À confirmer'}</dd></div>
              </dl>
              <button type="button" className="choose-variant" onClick={() => onChoose(variant.board)}>Choisir cette lame</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
