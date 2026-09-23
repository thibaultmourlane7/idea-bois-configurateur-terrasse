import { useState } from 'react';
import type { LayoutResult } from '../domain/types';

const mm = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} mm`;
const metres = (value: number) => `${(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m`;

export function CutOptimizationView({ layout }: { layout?: LayoutResult }) {
  const [open, setOpen] = useState(false);
  if (!layout) return null;
  const optimization = layout.cutOptimization;
  const remainingOffcuts = optimization.offcuts.filter((item) => item.status === 'remaining' && item.lengthMm > 0.0001);

  return (
    <>
      <section className="cut-optimization-launch">
        <div>
          <span className="cut-kicker">SPRINT B — V0.21</span>
          <h3>Optimisation des chutes</h3>
          <p>Ouvrez une vue séparée pour suivre lame stock, pièces, chutes réemployées et restes finaux.</p>
        </div>
        <button type="button" className="cut-open-button" onClick={() => setOpen(true)}>Optimisation des chutes <span>→</span></button>
      </section>

      {open && (
        <div className="cut-optimization-overlay" role="dialog" aria-modal="true" aria-label="Optimisation des chutes">
          <div className="cut-optimization-screen">
            <header className="cut-screen-header">
              <div><span className="cut-kicker">IDEA BOIS × SPEEDARTI</span><h2>Optimisation des chutes</h2><p>Lame stock → pièce → chute → réemploi → reste final.</p></div>
              <button type="button" className="cut-close-button" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            </header>
            <div className="cut-summary-grid">
              <article><span>Lames à acheter</span><strong>{optimization.boards.length}</strong></article>
              <article><span>Longueur achetée</span><strong>{metres(optimization.totalStockMm)}</strong></article>
              <article><span>Longueur posée</span><strong>{metres(optimization.totalRequiredMm)}</strong></article>
              <article><span>Réemplois de chute</span><strong>{optimization.reusedOffcutCount}</strong></article>
              <article><span>Reste final brut</span><strong>{metres(optimization.finalRemainingMm)}</strong></article>
            </div>
            <div className="cut-rule-warning">
              <strong>Règles de réemploi : À confirmer fabricant / atelier</strong>
              <p>{optimization.rules.note}</p>
              <small>Aucune longueur minimale, distance minimale entre joints ou largeur de trait de scie n’est inventée.</small>
            </div>
            <div className="cut-board-list">
              {optimization.boards.map((board) => (
                <article className="cut-board-card" key={board.id}>
                  <div className="cut-board-heading">
                    <div><span>{board.id}</span><strong>Lame commerciale {metres(board.stockLengthMm)}</strong></div>
                    <small>{board.reuseCount} réemploi{board.reuseCount > 1 ? 's' : ''} • reste {mm(board.remainingMm)}</small>
                  </div>
                  <div className="cut-chain">
                    {board.cuts.map((cut, index) => (
                      <div className="cut-chain-row" key={cut.id}>
                        <div className="cut-step-index">{index + 1}</div>
                        <div className="cut-step-source"><span>Source</span><strong>{cut.sourceId}</strong><small>{cut.sourceType === 'stock-board' ? 'lame neuve' : 'chute réemployée'} • {mm(cut.sourceLengthBeforeMm)}</small></div>
                        <div className="cut-arrow">→</div>
                        <div className="cut-step-piece"><span>Pièce</span><strong>{cut.pieceId}</strong><small>{cut.id} • {mm(cut.lengthMm)}</small></div>
                        <div className="cut-arrow">→</div>
                        <div className="cut-step-rest"><span>Reste</span><strong>{cut.resultingOffcutId ?? '0'}</strong><small>{mm(cut.remainingAfterMm)}</small></div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <section className="cut-final-remnants">
              <div className="cut-final-heading"><div><h3>Restes finaux</h3><p>Ils restent identifiés et ne sont pas classés « déchets » sans règle validée.</p></div><strong>{remainingOffcuts.length}</strong></div>
              {remainingOffcuts.length > 0 ? (
                <div className="cut-remnant-grid">{remainingOffcuts.map((offcut) => (
                  <div key={offcut.id}><strong>{offcut.id}</strong><span>{mm(offcut.lengthMm)}</span><small>origine {offcut.stockBoardId} • créée par {offcut.createdByCutId}</small></div>
                ))}</div>
              ) : <p className="cut-no-remnant">Aucun reste final sur ce plan de coupe.</p>}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
