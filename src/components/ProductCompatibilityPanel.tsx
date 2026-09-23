import type { BoardSpec } from '../domain/types';
import { getProductCompatibility, type CompatibilityItem } from '../catalog/compatibility';

function StateBadge({ item }: { item: CompatibilityItem }) {
  const label = item.state === 'validated' ? 'Validé' : item.state === 'partial' ? 'Partiel' : 'Manquant';
  return <span className={`compat-state ${item.state}`}>{label}</span>;
}

export function ProductCompatibilityPanel({ board }: { board: BoardSpec }) {
  const profile = getProductCompatibility(board);
  const rows = [
    ['Catalogue', profile.catalog],
    ['Calepinage', profile.layout],
    ['Structure', profile.structure],
    ['Fixations', profile.fixings],
    ['Plots / appuis', profile.supports],
    ['Rives / finitions', profile.edgeFinish],
    ['Produit par zone', profile.zoneProduct],
  ] as const;

  return (
    <section className="compatibility-panel">
      <div className="compatibility-heading">
        <div>
          <span className="cut-kicker">SPRINT D — MATRICE PRODUIT</span>
          <h3>Compatibilités de {board.label}</h3>
          <p>Chaque état provient des données et règles présentes dans le référentiel. Une donnée manquante reste explicitement non validée.</p>
        </div>
        <span className={`compat-overall ${profile.overall}`}>
          {profile.overall === 'validated' ? 'Complet' : profile.overall === 'partial' ? 'Partiel' : 'À compléter'}
        </span>
      </div>
      <div className="compatibility-grid">
        {rows.map(([label, item]) => (
          <article key={label}>
            <div><strong>{label}</strong><StateBadge item={item} /></div>
            <span>{item.label}</span>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
