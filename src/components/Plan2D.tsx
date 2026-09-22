import { useId, type ReactNode } from 'react';
import type { BasketResult, ProjectInput, TerraceObstacle } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';

function obstacleFill(kind: TerraceObstacle['kind']) {
  if (kind === 'pool') return '#cfeeff';
  if (kind === 'tree') return '#dff2df';
  if (kind === 'post') return '#eceff2';
  if (kind === 'manhole') return '#e5e7ea';
  return '#f4f5f7';
}

export function Plan2D({
  input,
  basket,
  layers = FINISHED_LAYERS,
  exploded = false,
}: {
  input: ProjectInput;
  basket?: BasketResult;
  layers?: ConstructionLayers;
  exploded?: boolean;
}) {
  const baseId = useId().replace(/:/g, '');
  const clipId = `deck-${baseId}`;
  const patternId = `wood-${baseId}`;
  const bounds = getDeckBoundingSizeM(input);
  const outline = getDeckOutlinePointsM(input);
  const construction = buildConstructionVisual(input, basket);
  const pad = 34;
  const maxW = 640;
  const maxH = 390;
  const scale = Math.min((maxW - pad * 2) / Math.max(0.1, bounds.lengthM), (maxH - pad * 2) / Math.max(0.1, bounds.widthM));
  const x = pad + (maxW - pad * 2 - bounds.lengthM * scale) / 2;
  const y = pad + (maxH - pad * 2 - bounds.widthM * scale) / 2;
  const points = outline.map((point) => `${x + point.x * scale},${y + point.y * scale}`).join(' ');
  const visual = input.board.visual;
  const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;

  const boardLines: ReactNode[] = [];
  if (layers.decking && pitchMm > 0) {
    let row = 0;
    for (let center = input.board.widthMm / 2; center <= transverseMm + 0.001; center += pitchMm) {
      const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
      intervals.forEach(([start, end], segment) => {
        if (input.orientation === 'length') {
          boardLines.push(
            <line key={`r-${row}-s-${segment}`} x1={x + (start / 1000) * scale} y1={y + (center / 1000) * scale} x2={x + (end / 1000) * scale} y2={y + (center / 1000) * scale} />,
          );
        } else {
          boardLines.push(
            <line key={`r-${row}-s-${segment}`} x1={x + (center / 1000) * scale} y1={y + (start / 1000) * scale} x2={x + (center / 1000) * scale} y2={y + (end / 1000) * scale} />,
          );
        }
      });
      row += 1;
    }
  }

  const deckingOpacity = exploded ? 0.58 : 1;

  return (
    <div className="visual-card construction-plan-card">
      <div className="visual-title">
        <span>Vue de dessus</span>
        <code>IB-TERR-UI-2D-014</code>
      </div>
      <svg viewBox={`0 0 ${maxW} ${maxH}`} className="plan" role="img" aria-label="Plan 2D de la construction de terrasse">
        <defs>
          <clipPath id={clipId}><polygon points={points} /></clipPath>
          <pattern id={patternId} width="140" height="70" patternUnits="userSpaceOnUse">
            {visual?.imageStatus === 'verified-media' && visual.imageUrl ? (
              <>
                <rect width="140" height="70" fill="#eef1f3" />
                <image href={visual.imageUrl} x="0" y="0" width="140" height="70" preserveAspectRatio="xMidYMid slice" opacity="1" />
              </>
            ) : (
              <>
                <rect width="140" height="70" fill="#edf1f3" />
                <path d="M0 0 L140 70 M-35 0 L105 70 M35 0 L175 70" fill="none" stroke="#d5dde2" strokeWidth="8" opacity="0.8" />
              </>
            )}
          </pattern>
        </defs>

        {layers.support && (
          <polygon points={points} fill="#f2f4f5" stroke="#cbd4da" strokeWidth="3" strokeDasharray="7 5" />
        )}

        {layers.plots && construction.plots.map((plot) => (
          <g key={plot.id} className="plot-symbol">
            <circle cx={x + plot.xM * scale} cy={y + plot.yM * scale} r="5.2" fill="#2f3f4b" stroke="#fff" strokeWidth="1.8" />
            <circle cx={x + plot.xM * scale} cy={y + plot.yM * scale} r="2" fill="#8fa1ad" />
          </g>
        ))}

        {layers.joists && (
          <g className="joist-lines">
            {construction.joists.map((joist) => (
              <line
                key={joist.id}
                x1={x + joist.x1M * scale}
                y1={y + joist.y1M * scale}
                x2={x + joist.x2M * scale}
                y2={y + joist.y2M * scale}
                stroke="#6c4d31"
                strokeWidth={Math.max(4, Math.min(8, scale * 0.045))}
                strokeLinecap="square"
                opacity="0.88"
              />
            ))}
          </g>
        )}

        {layers.verticalJoists && construction.verticalJoists.map((support) => (
          <rect
            key={support.id}
            x={x + support.xM * scale - 3.5}
            y={y + support.yM * scale - 3.5}
            width="7"
            height="7"
            rx="1"
            fill="#4f3826"
            stroke="#fff"
            strokeWidth="1"
          />
        ))}

        {layers.decking && (
          <g opacity={deckingOpacity}>
            <polygon points={points} fill={`url(#${patternId})`} />
            <g clipPath={`url(#${clipId})`} className="board-lines">{boardLines}</g>
            {visual?.imageStatus !== 'verified-media' && (
              <g className="visual-placeholder-label">
                <rect x={maxW / 2 - 86} y={maxH / 2 - 16} width="172" height="32" rx="8" fill="rgba(255,255,255,.92)" stroke="#cfd8de" />
                <text x={maxW / 2} y={maxH / 2 - 2} textAnchor="middle" fontSize="10" fontWeight="800" fill="#526979">Photo officielle IDEA Bois</text>
                <text x={maxW / 2} y={maxH / 2 + 10} textAnchor="middle" fontSize="9" fill="#7d8e9a">texture média à intégrer</text>
              </g>
            )}
          </g>
        )}

        {layers.edgeCladding && input.edgeFinishMode === 'full-perimeter' && (
          <polygon points={points} fill="none" stroke={`url(#${patternId})`} strokeWidth="11" strokeLinejoin="round" opacity="0.96" />
        )}

        {layers.obstacles && input.obstacles.map((obstacle) => {
          const fill = obstacleFill(obstacle.kind);
          if (obstacle.shape === 'circle') {
            const d = obstacle.diameterM ?? 0;
            return (
              <g key={obstacle.id}>
                <circle cx={x + (obstacle.xM + d / 2) * scale} cy={y + (obstacle.yM + d / 2) * scale} r={(d / 2) * scale} fill={fill} className="obstacle-shape" />
                <text x={x + (obstacle.xM + d / 2) * scale} y={y + (obstacle.yM + d / 2) * scale} className="obstacle-label">{obstacle.label}</text>
              </g>
            );
          }
          return (
            <g key={obstacle.id}>
              <rect x={x + obstacle.xM * scale} y={y + obstacle.yM * scale} width={(obstacle.widthM ?? 0) * scale} height={(obstacle.heightM ?? 0) * scale} fill={fill} className="obstacle-shape" />
              <text x={x + (obstacle.xM + (obstacle.widthM ?? 0) / 2) * scale} y={y + (obstacle.yM + (obstacle.heightM ?? 0) / 2) * scale} className="obstacle-label">{obstacle.label}</text>
            </g>
          );
        })}

        <polygon points={points} className="deck-outline" fill="none" />
      </svg>

      <div className="construction-legend">
        {layers.decking && <span><i className="legend-decking" />Lames</span>}
        {layers.joists && <span><i className="legend-joist" />Lambourdes</span>}
        {layers.plots && <span><i className="legend-plot" />Plots</span>}
        {layers.edgeCladding && input.edgeFinishMode === 'full-perimeter' && <span><i className="legend-edge" />Rives</span>}
        {layers.verticalJoists && input.edgeFinishMode === 'full-perimeter' && <span><i className="legend-vertical" />Supports verticaux</span>}
      </div>
      {visual?.imageStatus === 'verified-media'
        ? <div className="texture-source-note verified">Photo produit IDEA Bois vérifiée utilisée comme base visuelle.</div>
        : visual?.imageStatus === 'verified-product-page'
          ? <div className="texture-source-note pending">Page produit IDEA Bois vérifiée — média direct non encore mappé, aucun faux rendu appliqué.</div>
          : <div className="texture-source-note pending">Visuel produit non encore vérifié — rendu neutre volontaire.</div>}
    </div>
  );
}
