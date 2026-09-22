import type { BasketResult, ProjectInput } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';

export function SideView({
  input,
  basket,
  layers = FINISHED_LAYERS,
}: {
  input: ProjectInput;
  basket?: BasketResult;
  layers?: ConstructionLayers;
}) {
  const construction = buildConstructionVisual(input, basket);
  const totalHeightCm = Math.max(8, input.heightCm);
  const deckThicknessCm = input.board.thicknessMm / 10;
  const joistHeightCm = 4;
  const usefulSupportCm = Math.max(0, totalHeightCm - deckThicknessCm - joistHeightCm);
  const claddingHeightCm = input.edgeFinishMode === 'full-perimeter' ? input.edgeCladdingHeightCm : 0;
  const scaleY = 1.55;
  const groundY = 150;
  const deckY = groundY - totalHeightCm * scaleY;
  const joistY = deckY + deckThicknessCm * scaleY + 3;
  const supportTopY = joistY + joistHeightCm * scaleY;
  const claddingBottomY = deckY + claddingHeightCm * scaleY;
  const visual = input.board.visual;

  return (
    <div className="visual-card side-view-card">
      <div className="visual-title"><span>Vue de côté</span><code>IB-TERR-SIDE-014</code></div>
      <svg viewBox="0 0 640 210" className="side-view-svg" role="img" aria-label="Coupe latérale de la terrasse">
        {layers.support && (
          <>
            <rect x="52" y={groundY} width="530" height="18" rx="3" fill="#e8ecee" />
            <line x1="52" y1={groundY} x2="582" y2={groundY} stroke="#aab6be" strokeWidth="2" />
          </>
        )}

        {layers.plots && construction.plotsStatus !== 'none' && (
          <g>
            {[120, 250, 380, 510].map((x) => (
              <g key={x}>
                <rect x={x - 10} y={supportTopY} width="20" height={Math.max(4, groundY - supportTopY)} rx="5" fill="#3d4b55" />
                <rect x={x - 17} y={groundY - 5} width="34" height="7" rx="3" fill="#2d3942" />
                <rect x={x - 15} y={supportTopY - 4} width="30" height="6" rx="2" fill="#556772" />
              </g>
            ))}
          </g>
        )}

        {layers.joists && (
          <rect x="72" y={joistY} width="490" height={Math.max(7, joistHeightCm * scaleY)} rx="2" fill="#66482f" stroke="#4b3424" />
        )}

        {layers.verticalJoists && input.edgeFinishMode === 'full-perimeter' && (
          <g>
            {[88, 168, 248, 328, 408, 488, 552].map((x) => (
              <rect
                key={x}
                x={x - 4}
                y={deckY + deckThicknessCm * scaleY}
                width="8"
                height={Math.max(7, claddingHeightCm * scaleY - deckThicknessCm * scaleY)}
                fill="#513824"
              />
            ))}
          </g>
        )}

        {layers.edgeCladding && input.edgeFinishMode === 'full-perimeter' && (
          <g>
            <rect
              x="70"
              y={deckY + 2}
              width="494"
              height={Math.max(5, claddingHeightCm * scaleY)}
              fill={visual?.baseColor ?? '#9a7554'}
              stroke={visual?.grainColor ?? '#644a34'}
              opacity="0.94"
            />
            {Array.from({ length: Math.max(1, construction.cladding.rowCount ?? 1) }, (_, index) => {
              const rows = Math.max(1, construction.cladding.rowCount ?? 1);
              const rowH = (claddingHeightCm * scaleY) / rows;
              return <line key={index} x1="70" x2="564" y1={deckY + rowH * (index + 1)} y2={deckY + rowH * (index + 1)} stroke={visual?.grainColor ?? '#644a34'} opacity="0.65" />;
            })}
          </g>
        )}

        {layers.decking && (
          <rect
            x="62"
            y={deckY}
            width="510"
            height={Math.max(5, deckThicknessCm * scaleY)}
            rx="2"
            fill={visual?.baseColor ?? '#b4936d'}
            stroke={visual?.grainColor ?? '#72583f'}
          />
        )}

        <g className="side-dimensions">
          <line x1="600" y1={deckY} x2="600" y2={groundY} stroke="#1976d2" strokeWidth="1.4" />
          <line x1="593" y1={deckY} x2="607" y2={deckY} stroke="#1976d2" />
          <line x1="593" y1={groundY} x2="607" y2={groundY} stroke="#1976d2" />
          <text x="592" y={(deckY + groundY) / 2} textAnchor="end" fill="#1976d2" fontSize="11" fontWeight="800">{input.heightCm.toFixed(0)} cm fini</text>
          {input.edgeFinishMode === 'full-perimeter' && (
            <text x="74" y={Math.min(194, claddingBottomY + 16)} fill="#5c7182" fontSize="10">Habillage {input.edgeCladdingHeightCm.toFixed(0)} cm • supports verticaux {construction.cladding.verticalSupportCount ?? 'à confirmer'}</text>
          )}
          {layers.plots && <text x="74" y="190" fill="#768895" fontSize="9">Hauteur utile appui ≈ {usefulSupportCm.toFixed(1)} cm</text>}
        </g>
      </svg>
    </div>
  );
}
