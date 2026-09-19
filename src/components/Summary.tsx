import type { ConfiguratorResult } from '../domain/types';

const fmt = (v: number, n = 2) => v.toLocaleString('fr-FR', { maximumFractionDigits: n, minimumFractionDigits: n });

export function Summary({ result }: { result: ConfiguratorResult }) {
  if (!result.valid || !result.geometry || !result.layout) return null;
  const { geometry: g, layout: l, pricing: p } = result;
  return <section className="summary">
    <div className="kpi"><span>Surface projet</span><strong>{fmt(g.areaM2)} m²</strong></div>
    <div className="kpi"><span>Périmètre</span><strong>{fmt(g.perimeterM)} m</strong></div>
    <div className="kpi"><span>Rangées</span><strong>{l.rowCount}</strong></div>
    <div className="kpi"><span>Lames à acheter</span><strong>{l.stockBoards.length}</strong></div>
    <div className="kpi"><span>Surface achetée</span><strong>{fmt(l.purchasedAreaM2)} m²</strong></div>
    <div className="kpi"><span>Chute linéaire</span><strong>{fmt(l.wastePercent)} %</strong></div>
    <div className="kpi accent"><span>Matériel TTC</span><strong>{p?.materialTtc == null ? 'Non chiffré' : `${fmt(p.materialTtc)} €`}</strong></div>
  </section>;
}
