import { useId, type ReactNode } from 'react';
import type { BasketResult, ProjectInput, SupportPlanResult, TerraceObstacle } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';
import { resolveBoardTexture, textureStatusLabel } from '../visual/resolveBoardTexture';
import { resolveMaterialProfile } from '../visual/materialProfiles';
import { resolveTextureVariant } from '../visual/textureVariants';
import { boardOffsetFromRatio, buildGrooveLines, shouldRenderKnots } from '../visual/texturePainter';

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
  supportPlan,
  layers = FINISHED_LAYERS,
  exploded = false,
}: {
  input: ProjectInput;
  basket?: BasketResult;
  supportPlan?: SupportPlanResult;
  layers?: ConstructionLayers;
  exploded?: boolean;
}) {
  const baseId = useId().replace(/:/g, '');
  const clipId = `deck-${baseId}`;
  const bounds = getDeckBoundingSizeM(input);
  const outline = getDeckOutlinePointsM(input);
  const construction = buildConstructionVisual(input, basket, supportPlan);
  const texture = resolveBoardTexture(input.board);
  const materialProfile = resolveMaterialProfile(input.board);
  const grooveLines = buildGrooveLines(materialProfile);
  const variantCount = materialProfile?.variantCount ?? 4;

  const pad = 34;
  const maxW = 640;
  const maxH = 390;
  const scale = Math.min((maxW - pad * 2) / Math.max(0.1, bounds.lengthM), (maxH - pad * 2) / Math.max(0.1, bounds.widthM));
  const x = pad + (maxW - pad * 2 - bounds.lengthM * scale) / 2;
  const y = pad + (maxH - pad * 2 - bounds.widthM * scale) / 2;
  const points = outline.map((point) => `${x + point.x * scale},${y + point.y * scale}`).join(' ');
  const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const boardWidthPx = Math.max(2.2, (input.board.widthMm / 1000) * scale);
  const textureWidthPx = Math.max(110, (texture.textureScaleMmX / 1000) * scale);
  const textureHeightPx = Math.max(boardWidthPx * 1.08, (texture.textureScaleMmY / 1000) * scale);
  const patternIds = Array.from({ length: variantCount }, (_, index) => `texture-${baseId}-${index}`);

  const boardLines: ReactNode[] = [];
  if (layers.decking && pitchMm > 0) {
    let row = 0;
    for (let center = input.board.widthMm / 2; center <= transverseMm + 0.001; center += pitchMm) {
      const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
      intervals.forEach(([start, end], segment) => {
        const variant = resolveTextureVariant(row, segment, variantCount);
        const patternId = patternIds[variant.index % patternIds.length];
        const commonKey = `r-${row}-s-${segment}`;
        const edgeOpacity = materialProfile?.boardEdgeOpacity ?? 0.50;

        if (input.orientation === 'length') {
          const x1 = x + (start / 1000) * scale;
          const x2 = x + (end / 1000) * scale;
          const yc = y + (center / 1000) * scale;

          boardLines.push(
            <g key={commonKey}>
              <line x1={x1} y1={yc} x2={x2} y2={yc} stroke={`url(#${patternId})`} strokeWidth={boardWidthPx} strokeLinecap="butt" />
              <line x1={x1} y1={yc - boardWidthPx * 0.49} x2={x2} y2={yc - boardWidthPx * 0.49} stroke={`rgba(46,39,31,${edgeOpacity})`} strokeWidth="0.7" />
              <line x1={x1} y1={yc + boardWidthPx * 0.49} x2={x2} y2={yc + boardWidthPx * 0.49} stroke={`rgba(46,39,31,${edgeOpacity})`} strokeWidth="0.7" />
              {grooveLines.map((groove, grooveIndex) => {
                const offset = boardOffsetFromRatio(groove.ratio, boardWidthPx);
                return (
                  <g key={grooveIndex}>
                    <line x1={x1} y1={yc + offset} x2={x2} y2={yc + offset} stroke={`rgba(38,32,27,${groove.shadowOpacity})`} strokeWidth="0.72" />
                    <line x1={x1} y1={yc + offset - 0.55} x2={x2} y2={yc + offset - 0.55} stroke={`rgba(236,226,202,${groove.highlightOpacity})`} strokeWidth="0.42" />
                  </g>
                );
              })}
              {shouldRenderKnots(materialProfile) && variant.knotRatios.map((ratio, knotIndex) => {
                const cx = x1 + (x2 - x1) * ratio;
                const ry = Math.max(1.2, boardWidthPx * 0.13);
                const rx = Math.max(3.5, Math.min(8, (x2 - x1) * 0.018));
                return (
                  <g key={`k-${knotIndex}`} opacity="0.42">
                    <ellipse cx={cx} cy={yc} rx={rx} ry={ry} fill="rgba(66,49,34,.42)" />
                    <ellipse cx={cx} cy={yc} rx={rx * 0.55} ry={ry * 0.55} fill="rgba(38,29,22,.38)" />
                  </g>
                );
              })}
            </g>,
          );
        } else {
          const xc = x + (center / 1000) * scale;
          const y1 = y + (start / 1000) * scale;
          const y2 = y + (end / 1000) * scale;

          boardLines.push(
            <g key={commonKey}>
              <line x1={xc} y1={y1} x2={xc} y2={y2} stroke={`url(#${patternId})`} strokeWidth={boardWidthPx} strokeLinecap="butt" />
              <line x1={xc - boardWidthPx * 0.49} y1={y1} x2={xc - boardWidthPx * 0.49} y2={y2} stroke={`rgba(46,39,31,${edgeOpacity})`} strokeWidth="0.7" />
              <line x1={xc + boardWidthPx * 0.49} y1={y1} x2={xc + boardWidthPx * 0.49} y2={y2} stroke={`rgba(46,39,31,${edgeOpacity})`} strokeWidth="0.7" />
              {grooveLines.map((groove, grooveIndex) => {
                const offset = boardOffsetFromRatio(groove.ratio, boardWidthPx);
                return (
                  <g key={grooveIndex}>
                    <line x1={xc + offset} y1={y1} x2={xc + offset} y2={y2} stroke={`rgba(38,32,27,${groove.shadowOpacity})`} strokeWidth="0.72" />
                    <line x1={xc + offset - 0.55} y1={y1} x2={xc + offset - 0.55} y2={y2} stroke={`rgba(236,226,202,${groove.highlightOpacity})`} strokeWidth="0.42" />
                  </g>
                );
              })}
              {shouldRenderKnots(materialProfile) && variant.knotRatios.map((ratio, knotIndex) => {
                const cy = y1 + (y2 - y1) * ratio;
                const rx = Math.max(1.2, boardWidthPx * 0.13);
                const ry = Math.max(3.5, Math.min(8, (y2 - y1) * 0.018));
                return (
                  <g key={`k-${knotIndex}`} opacity="0.42">
                    <ellipse cx={xc} cy={cy} rx={rx} ry={ry} fill="rgba(66,49,34,.42)" />
                    <ellipse cx={xc} cy={cy} rx={rx * 0.55} ry={ry * 0.55} fill="rgba(38,29,22,.38)" />
                  </g>
                );
              })}
            </g>,
          );
        }
      });
      row += 1;
    }
  }

  const deckingOpacity = exploded ? 0.62 : 1;
  const tint = texture.tintColor ?? '#ffffff';
  const tintOpacity = texture.tintOpacity ?? 0;

  return (
    <div className="visual-card construction-plan-card">
      <div className="visual-title">
        <span>Vue de dessus</span>
        <code>IB-TERR-UI-2D-016</code>
      </div>
      <svg viewBox={`0 0 ${maxW} ${maxH}`} className="plan" role="img" aria-label="Plan 2D de la construction de terrasse">
        <defs>
          <clipPath id={clipId}><polygon points={points} /></clipPath>
          {patternIds.map((patternId, index) => {
            const variant = resolveTextureVariant(index, 0, variantCount);
            const bright = variant.brightnessOverlay;
            return (
              <pattern
                key={patternId}
                id={patternId}
                width={textureWidthPx}
                height={textureHeightPx}
                patternUnits="userSpaceOnUse"
                x={-(variant.offsetXRatio * textureWidthPx)}
                y={-(variant.offsetYRatio * textureHeightPx)}
                patternTransform={input.orientation === 'width' ? 'rotate(90)' : undefined}
              >
                {texture.textureImageUrl ? (
                  <>
                    <rect width={textureWidthPx} height={textureHeightPx} fill="#d8d2ca" />
                    <image
                      href={texture.textureImageUrl}
                      x="0"
                      y="0"
                      width={textureWidthPx}
                      height={textureHeightPx}
                      preserveAspectRatio="xMidYMid slice"
                    />
                    {tintOpacity > 0 && (
                      <rect
                        width={textureWidthPx}
                        height={textureHeightPx}
                        fill={tint}
                        opacity={tintOpacity}
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    )}
                    {bright !== 0 && (
                      <rect
                        width={textureWidthPx}
                        height={textureHeightPx}
                        fill={bright > 0 ? '#ffffff' : '#000000'}
                        opacity={Math.abs(bright)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <rect width={textureWidthPx} height={textureHeightPx} fill="#edf1f3" />
                    <path d={`M0 0 L${textureWidthPx} ${textureHeightPx} M-${textureWidthPx / 2} 0 L${textureWidthPx / 2} ${textureHeightPx}`} stroke="#d2dbe0" strokeWidth="5" />
                  </>
                )}
              </pattern>
            );
          })}
        </defs>

        {layers.support && <polygon points={points} fill="#f2f4f5" stroke="#cbd4da" strokeWidth="3" strokeDasharray="7 5" />}

        {layers.plots && construction.plots.map((plot) => (
          <g key={plot.id} className="plot-symbol">
            <circle
              cx={x + plot.xM * scale}
              cy={y + plot.yM * scale}
              r={plot.multiplicity === 2 ? 6.2 : 5.2}
              fill={plot.status === 'unsupported' ? '#b64c45' : '#2f3f4b'}
              stroke="#fff"
              strokeWidth="1.8"
            />
            <circle cx={x + plot.xM * scale} cy={y + plot.yM * scale} r="2" fill={plot.status === 'unsupported' ? '#ffd2ce' : '#8fa1ad'} />
            {plot.multiplicity === 2 && (
              <text x={x + plot.xM * scale + 7} y={y + plot.yM * scale - 5} fontSize="7" fontWeight="900" fill="#7a4b27">×2</text>
            )}
          </g>
        ))}

        {layers.joists && (
          <g className="joist-lines">
            {construction.joists.map((joist) => (
              <g key={joist.id}>
                <line
                  x1={x + joist.x1M * scale}
                  y1={y + joist.y1M * scale}
                  x2={x + joist.x2M * scale}
                  y2={y + joist.y2M * scale}
                  stroke={joist.multiplicity === 2 ? '#9b5f2f' : '#6c4d31'}
                  strokeWidth={Math.max(4, Math.min(joist.multiplicity === 2 ? 12 : 8, scale * (joist.multiplicity === 2 ? 0.07 : 0.045)))}
                  strokeLinecap="square"
                  opacity="0.88"
                />
                {joist.multiplicity === 2 && (
                  <line
                    x1={x + joist.x1M * scale}
                    y1={y + joist.y1M * scale}
                    x2={x + joist.x2M * scale}
                    y2={y + joist.y2M * scale}
                    stroke="#f0c38f"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                    opacity="0.9"
                  />
                )}
              </g>
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
          <g opacity={deckingOpacity} clipPath={`url(#${clipId})`}>
            <polygon points={points} fill="#f4f1ed" />
            {boardLines}
          </g>
        )}

        {layers.edgeCladding && input.edgeFinishMode === 'full-perimeter' && (
          <polygon
            points={points}
            fill="none"
            stroke={`url(#${patternIds[1 % patternIds.length]})`}
            strokeWidth={Math.max(7, boardWidthPx * 0.78)}
            strokeLinejoin="round"
            opacity="0.98"
          />
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

      <div className={`texture-quality-note ${texture.status}`}>
        <strong>{textureStatusLabel(texture)}</strong>
        <span>{texture.label}</span>
        {materialProfile && <small>Profil B1 : stries renforcées, bande centrale plus lisse et variations entre lames.</small>}
        {!materialProfile && texture.status === 'close' && <small>Rendu de projection, pas une photographie contractuelle du produit exact.</small>}
        {texture.status === 'neutral' && <small>Aucune texture suffisamment fiable n’est encore associée à cette lame.</small>}
      </div>
    </div>
  );
}
