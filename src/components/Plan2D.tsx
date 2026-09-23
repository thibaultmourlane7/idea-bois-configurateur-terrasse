import { useId, type ReactNode } from 'react';
import type { BasketResult, LayoutResult, ProjectInput, SupportPlanResult, TerraceObstacle } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { computeLayout } from '../engine/layout';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';
import { computeTerraceEdges, EDGE_CONTEXT_LABELS, EDGE_TREATMENT_LABELS } from '../engine/edges';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';
import { resolveBoardTexture, textureStatusLabel } from '../visual/resolveBoardTexture';
import { resolveMaterialProfile } from '../visual/materialProfiles';
import { resolveTextureVariant } from '../visual/textureVariants';
import { boardOffsetFromRatio, buildGrooveLines, shouldRenderKnots } from '../visual/texturePainter';
import { findBoard } from '../catalog/compatibility';
import { computeStairs } from '../engine/stairs';
import { vertexLabel } from '../editor/interactiveGeometry';

function obstacleFill(kind: TerraceObstacle['kind']) {
  if (kind === 'pool') return '#cfeeff';
  if (kind === 'tree') return '#dff2df';
  if (kind === 'post') return '#eceff2';
  if (kind === 'manhole') return '#e5e7ea';
  return '#f4f5f7';
}

function obstacleSize(obstacle: TerraceObstacle) {
  if (obstacle.shape === 'circle') {
    const diameterM = obstacle.diameterM ?? 0;
    return { widthM: diameterM, heightM: diameterM };
  }
  return { widthM: obstacle.widthM ?? 0, heightM: obstacle.heightM ?? 0 };
}

function edgeLength(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function Plan2D({
  input,
  basket,
  supportPlan,
  layout,
  layers = FINISHED_LAYERS,
  exploded = false,
}: {
  input: ProjectInput;
  basket?: BasketResult;
  supportPlan?: SupportPlanResult;
  layout?: LayoutResult;
  layers?: ConstructionLayers;
  exploded?: boolean;
}) {
  const baseId = useId().replace(/:/g, '');
  const clipId = `deck-${baseId}`;
  const bounds = getDeckBoundingSizeM(input);
  const outline = getDeckOutlinePointsM(input);
  const construction = buildConstructionVisual(input, basket, supportPlan);
  const effectiveLayout = layout ?? (input.board.gapMm != null && Number.isFinite(input.board.gapMm) && input.board.gapMm >= 0
    ? computeLayout(input)
    : undefined);
  const texture = resolveBoardTexture(input.board);
  const materialProfile = resolveMaterialProfile(input.board);
  const grooveLines = buildGrooveLines(materialProfile);
  const variantCount = materialProfile?.variantCount ?? 4;
  const businessEdges = computeTerraceEdges(input);
  const claddingEdges = businessEdges.filter((edge) => edge.treatment === 'cladding');
  const edgeCladdingRequested = claddingEdges.length > 0;
  const stairs = computeStairs(input).filter((stair) => stair.status === 'ready');

  const viewport = (() => {
    let minX = 0;
    let minY = 0;
    let maxX = bounds.lengthM;
    let maxY = bounds.widthM;
    for (const obstacle of input.obstacles) {
      const size = obstacleSize(obstacle);
      minX = Math.min(minX, obstacle.xM);
      minY = Math.min(minY, obstacle.yM);
      maxX = Math.max(maxX, obstacle.xM + size.widthM);
      maxY = Math.max(maxY, obstacle.yM + size.heightM);
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      widthM: Math.max(0.1, maxX - minX),
      heightM: Math.max(0.1, maxY - minY),
    };
  })();

  const pad = 58;
  const maxW = 640;
  const maxH = 390;
  const scale = Math.min(
    (maxW - pad * 2) / viewport.widthM,
    (maxH - pad * 2) / viewport.heightM,
  );
  const x = pad + (maxW - pad * 2 - viewport.widthM * scale) / 2 - viewport.minX * scale;
  const y = pad + (maxH - pad * 2 - viewport.heightM * scale) / 2 - viewport.minY * scale;
  const points = outline.map((point) => `${x + point.x * scale},${y + point.y * scale}`).join(' ');
  const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const boardWidthPx = Math.max(2.2, (input.board.widthMm / 1000) * scale);
  const textureWidthPx = Math.max(110, (texture.textureScaleMmX / 1000) * scale);
  const textureHeightPx = Math.max(boardWidthPx * 1.08, (texture.textureScaleMmY / 1000) * scale);
  const patternIds = Array.from({ length: variantCount }, (_, index) => `texture-${baseId}-${index}`);

  const boardLines: ReactNode[] = [];
  if (layers.decking && effectiveLayout?.boardSegments?.length) {
    for (const segment of effectiveLayout.boardSegments) {
      if (segment.x1M == null || segment.y1M == null || segment.x2M == null || segment.y2M == null) continue;
      const segmentBoard = findBoard(segment.boardId) ?? input.board;
      const segmentProfile = resolveMaterialProfile(segmentBoard);
      const segmentGrooves = buildGrooveLines(segmentProfile);
      const segmentWidthPx = Math.max(2.2, (segmentBoard.widthMm / 1000) * scale);
      const variant = resolveTextureVariant(segment.rowIndex, segment.segmentIndex, variantCount);
      const patternId = patternIds[variant.index % patternIds.length];
      const edgeOpacity = segmentProfile?.boardEdgeOpacity ?? 0.50;
      const isPrimaryTexture = segmentBoard.id === input.board.id;
      const boardStroke = isPrimaryTexture ? `url(#${patternId})` : (segmentBoard.visual?.baseColor ?? '#d7c4a6');
      const x1 = x + segment.x1M * scale;
      const y1 = y + segment.y1M * scale;
      const x2 = x + segment.x2M * scale;
      const y2 = y + segment.y2M * scale;
      const normalX = segment.normalX ?? (input.orientation === 'length' ? 0 : 1);
      const normalY = segment.normalY ?? (input.orientation === 'length' ? 1 : 0);
      const offsetPoint = (offsetPx: number) => ({
        ax: x1 + normalX * offsetPx,
        ay: y1 + normalY * offsetPx,
        bx: x2 + normalX * offsetPx,
        by: y2 + normalY * offsetPx,
      });
      const edgeA = offsetPoint(-segmentWidthPx * 0.49);
      const edgeB = offsetPoint(segmentWidthPx * 0.49);

      boardLines.push(
        <g key={segment.id}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={boardStroke} strokeWidth={segmentWidthPx} strokeLinecap="butt" />
          <line x1={edgeA.ax} y1={edgeA.ay} x2={edgeA.bx} y2={edgeA.by} stroke={`rgba(46,39,31,${edgeOpacity})`} strokeWidth="0.7" />
          <line x1={edgeB.ax} y1={edgeB.ay} x2={edgeB.bx} y2={edgeB.by} stroke={`rgba(46,39,31,${edgeOpacity})`} strokeWidth="0.7" />
          {segmentGrooves.map((groove, grooveIndex) => {
            const grooveLine = offsetPoint(boardOffsetFromRatio(groove.ratio, segmentWidthPx));
            const highlight = offsetPoint(boardOffsetFromRatio(groove.ratio, segmentWidthPx) - 0.55);
            return (
              <g key={grooveIndex}>
                <line x1={grooveLine.ax} y1={grooveLine.ay} x2={grooveLine.bx} y2={grooveLine.by} stroke={`rgba(38,32,27,${groove.shadowOpacity})`} strokeWidth="0.72" />
                <line x1={highlight.ax} y1={highlight.ay} x2={highlight.bx} y2={highlight.by} stroke={`rgba(236,226,202,${groove.highlightOpacity})`} strokeWidth="0.42" />
              </g>
            );
          })}
          {shouldRenderKnots(segmentProfile) && variant.knotRatios.map((ratio, knotIndex) => {
            const cx = x1 + (x2 - x1) * ratio;
            const cy = y1 + (y2 - y1) * ratio;
            return (
              <g key={`k-${knotIndex}`} opacity="0.42">
                <ellipse cx={cx} cy={cy} rx={Math.max(2.2, segmentWidthPx * 0.18)} ry={Math.max(1.2, segmentWidthPx * 0.10)} fill="rgba(66,49,34,.42)" />
                <ellipse cx={cx} cy={cy} rx={Math.max(1.2, segmentWidthPx * 0.09)} ry={Math.max(0.7, segmentWidthPx * 0.05)} fill="rgba(38,29,22,.38)" />
              </g>
            );
          })}
        </g>,
      );
    }
  }

  const deckingOpacity = exploded ? 0.62 : 1;
  const tint = texture.tintColor ?? '#ffffff';
  const tintOpacity = texture.tintOpacity ?? 0;
  const centroid = outline.length
    ? outline.reduce((acc, point) => ({ x: acc.x + point.x / outline.length, y: acc.y + point.y / outline.length }), { x: 0, y: 0 })
    : { x: bounds.lengthM / 2, y: bounds.widthM / 2 };

  return (
    <div className="visual-card construction-plan-card">
      <div className="visual-title">
        <span>Vue de dessus</span>
        <code>IB-TERR-UI-2D-016-STAB</code>
      </div>
      <svg viewBox={`0 0 ${maxW} ${maxH}`} className="plan" role="img" aria-label="Plan 2D coté de la construction de terrasse">
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
                    <image href={texture.textureImageUrl} x="0" y="0" width={textureWidthPx} height={textureHeightPx} preserveAspectRatio="xMidYMid slice" />
                    {tintOpacity > 0 && <rect width={textureWidthPx} height={textureHeightPx} fill={tint} opacity={tintOpacity} style={{ mixBlendMode: 'multiply' }} />}
                    {bright !== 0 && <rect width={textureWidthPx} height={textureHeightPx} fill={bright > 0 ? '#ffffff' : '#000000'} opacity={Math.abs(bright)} />}
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
            {plot.multiplicity === 2 && <text x={x + plot.xM * scale + 7} y={y + plot.yM * scale - 5} fontSize="7" fontWeight="900" fill="#7a4b27">×2</text>}
          </g>
        ))}

        {layers.joists && (
          <g className="joist-lines">
            {construction.joists.map((joist) => {
              const isPerimeter = joist.role === 'perimeter';
              const isDouble = joist.multiplicity === 2;
              return (
                <g key={joist.id}>
                  <line
                    x1={x + joist.x1M * scale}
                    y1={y + joist.y1M * scale}
                    x2={x + joist.x2M * scale}
                    y2={y + joist.y2M * scale}
                    stroke={isPerimeter ? '#365f7a' : isDouble ? '#9b5f2f' : '#6c4d31'}
                    strokeWidth={Math.max(4, Math.min(isPerimeter ? 9 : isDouble ? 12 : 8, scale * (isDouble ? 0.07 : 0.045)))}
                    strokeLinecap="square"
                    opacity="0.9"
                  />
                  {isDouble && (
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
              );
            })}
          </g>
        )}

        {layers.verticalJoists && construction.verticalJoists.map((support) => (
          <rect key={support.id} x={x + support.xM * scale - 3.5} y={y + support.yM * scale - 3.5} width="7" height="7" rx="1" fill="#4f3826" stroke="#fff" strokeWidth="1" />
        ))}

        {layers.decking && (
          <g opacity={deckingOpacity} clipPath={`url(#${clipId})`}>
            <polygon points={points} fill="#f4f1ed" />
            {boardLines}
          </g>
        )}

        {layers.decking && (effectiveLayout?.buttJoints ?? []).map((joint) => {
          const cx = joint.xM != null
            ? x + joint.xM * scale
            : x + (input.orientation === 'length' ? joint.axisPositionMm : joint.transverseCenterMm) / 1000 * scale;
          const cy = joint.yM != null
            ? y + joint.yM * scale
            : y + (input.orientation === 'length' ? joint.transverseCenterMm : joint.axisPositionMm) / 1000 * scale;
          const half = Math.max(3, boardWidthPx * 0.58);
          const nx = joint.normalX ?? (input.orientation === 'length' ? 0 : 1);
          const ny = joint.normalY ?? (input.orientation === 'length' ? 1 : 0);
          return (
            <g key={joint.id} className="board-joint-marker">
              <line x1={cx - nx * half} y1={cy - ny * half} x2={cx + nx * half} y2={cy + ny * half} className="board-butt-joint-gap" />
              <line x1={cx - nx * half} y1={cy - ny * half} x2={cx + nx * half} y2={cy + ny * half} className="board-butt-joint" />
            </g>
          );
        })}

        {layers.decking && (input.layingZones ?? []).map((zone) => {
          const zonePoints = zone.points.map((point) => `${x + point.xM * scale},${y + point.yM * scale}`).join(' ');
          const cx = zone.points.reduce((sum, point) => sum + point.xM, 0) / Math.max(1, zone.points.length);
          const cy = zone.points.reduce((sum, point) => sum + point.yM, 0) / Math.max(1, zone.points.length);
          return (
            <g key={`zone-outline-${zone.id}`} className="laying-zone-overlay">
              <polygon points={zonePoints} fill="none" stroke="#1876c9" strokeWidth="1.3" strokeDasharray="7 5" />
              <text x={x + cx * scale} y={y + cy * scale} textAnchor="middle" fontSize="8" fontWeight="900" fill="#155b92">{zone.label}</text>
            </g>
          );
        })}

        {layers.decking && stairs.map((stair) => (
          <g key={`stair-${stair.id}`} className="stair-plan-overlay">
            {stair.treads.map((tread) => {
              const treadPoints = tread.top.map((point) => `${x + point.xM * scale},${y + point.yM * scale}`).join(' ');
              return (
                <polygon
                  key={tread.id}
                  points={treadPoints}
                  fill="rgba(187,137,87,.34)"
                  stroke="#8b5a32"
                  strokeWidth="1.2"
                />
              );
            })}
            {stair.footprint && (
              <polygon
                points={stair.footprint.map((point) => `${x + point.xM * scale},${y + point.yM * scale}`).join(' ')}
                fill="none"
                stroke="#7b4c29"
                strokeWidth="1.6"
                strokeDasharray="5 3"
              />
            )}
            {stair.footprint && (
              <text
                x={x + stair.footprint.reduce((sum, point) => sum + point.xM, 0) / stair.footprint.length * scale}
                y={y + stair.footprint.reduce((sum, point) => sum + point.yM, 0) / stair.footprint.length * scale}
                textAnchor="middle"
                className="stair-plan-label"
              >
                {stair.label} · {stair.stepCount} marches
              </text>
            )}
          </g>
        ))}

        {input.edgeFinishMode === 'per-edge' && input.shape !== 'circle' && businessEdges.map((edge) => {
          const mx = x + ((edge.start.xM + edge.end.xM) / 2) * scale;
          const my = y + ((edge.start.yM + edge.end.yM) / 2) * scale;
          return (
            <g key={`business-edge-${edge.id}`} className={`business-edge treatment-${edge.treatment}`}>
              <line
                x1={x + edge.start.xM * scale}
                y1={y + edge.start.yM * scale}
                x2={x + edge.end.xM * scale}
                y2={y + edge.end.yM * scale}
                className="business-edge-line"
              />
              <text x={mx} y={my - 8} textAnchor="middle" className="business-edge-label">
                {edge.label} · {EDGE_CONTEXT_LABELS[edge.context]} · {EDGE_TREATMENT_LABELS[edge.treatment]}
              </text>
            </g>
          );
        })}

        {input.edgeFinishMode === 'per-edge' && input.shape === 'circle' && businessEdges[0] && (
          <text x={x + bounds.lengthM * scale / 2} y={y + bounds.widthM * scale / 2} textAnchor="middle" className="business-edge-label">
            {businessEdges[0].label} · {EDGE_CONTEXT_LABELS[businessEdges[0].context]} · {EDGE_TREATMENT_LABELS[businessEdges[0].treatment]}
          </text>
        )}

        {layers.edgeCladding && edgeCladdingRequested && input.shape === 'circle' && (
          <polygon points={points} fill="none" stroke={`url(#${patternIds[1 % patternIds.length]})`} strokeWidth={Math.max(7, boardWidthPx * 0.78)} strokeLinejoin="round" opacity="0.98" />
        )}

        {layers.edgeCladding && input.shape !== 'circle' && claddingEdges.map((edge) => (
          <line
            key={`edge-cladding-${edge.id}`}
            x1={x + edge.start.xM * scale}
            y1={y + edge.start.yM * scale}
            x2={x + edge.end.xM * scale}
            y2={y + edge.end.yM * scale}
            stroke={`url(#${patternIds[1 % patternIds.length]})`}
            strokeWidth={Math.max(7, boardWidthPx * 0.78)}
            strokeLinecap="square"
            opacity="0.98"
          />
        ))}

        {layers.obstacles && input.obstacles.map((obstacle) => {
          const fill = obstacleFill(obstacle.kind);
          const posLabel = `X ${obstacle.xM.toFixed(2)} • Y ${obstacle.yM.toFixed(2)} m`;
          if (obstacle.shape === 'circle') {
            const d = obstacle.diameterM ?? 0;
            const cx = x + (obstacle.xM + d / 2) * scale;
            const cy = y + (obstacle.yM + d / 2) * scale;
            return (
              <g key={obstacle.id}>
                <circle cx={cx} cy={cy} r={(d / 2) * scale} fill={fill} className="obstacle-shape" />
                <text x={cx} y={cy - 6} className="obstacle-label">{obstacle.label}</text>
                <text x={cx} y={cy + 7} className="obstacle-plan-dimension">Ø {d.toFixed(2)} m</text>
                <text x={cx} y={cy + 18} className="obstacle-plan-position">{posLabel}</text>
              </g>
            );
          }
          const widthM = obstacle.widthM ?? 0;
          const heightM = obstacle.heightM ?? 0;
          const cx = x + (obstacle.xM + widthM / 2) * scale;
          const cy = y + (obstacle.yM + heightM / 2) * scale;
          return (
            <g key={obstacle.id}>
              <rect x={x + obstacle.xM * scale} y={y + obstacle.yM * scale} width={widthM * scale} height={heightM * scale} fill={fill} className="obstacle-shape" />
              <text x={cx} y={cy - 6} className="obstacle-label">{obstacle.label}</text>
              <text x={cx} y={cy + 7} className="obstacle-plan-dimension">{widthM.toFixed(2)} × {heightM.toFixed(2)} m</text>
              <text x={cx} y={cy + 18} className="obstacle-plan-position">{posLabel}</text>
            </g>
          );
        })}

        <polygon points={points} className="deck-outline" fill="none" />

        {input.shape === 'circle' ? (
          <g className="plan-dimensions">
            <line x1={x} y1={y + bounds.widthM * scale / 2} x2={x + bounds.lengthM * scale} y2={y + bounds.widthM * scale / 2} />
            <line x1={x} y1={y + bounds.widthM * scale / 2 - 5} x2={x} y2={y + bounds.widthM * scale / 2 + 5} />
            <line x1={x + bounds.lengthM * scale} y1={y + bounds.widthM * scale / 2 - 5} x2={x + bounds.lengthM * scale} y2={y + bounds.widthM * scale / 2 + 5} />
            <text x={x + bounds.lengthM * scale / 2} y={y + bounds.widthM * scale / 2 - 7}>Ø {input.dimensions.circleDiameterM.toFixed(2)} m</text>
          </g>
        ) : (
          <g className="plan-dimensions">
            {outline.map((point, index) => {
              const next = outline[(index + 1) % outline.length];
              const mx = (point.x + next.x) / 2;
              const my = (point.y + next.y) / 2;
              const dx = mx - centroid.x;
              const dy = my - centroid.y;
              const norm = Math.hypot(dx, dy) || 1;
              const offsetPx = 20;
              const ox = (dx / norm) * offsetPx;
              const oy = (dy / norm) * offsetPx;
              const x1 = x + point.x * scale;
              const y1 = y + point.y * scale;
              const x2 = x + next.x * scale;
              const y2 = y + next.y * scale;
              const dx1 = x1 + ox;
              const dy1 = y1 + oy;
              const dx2 = x2 + ox;
              const dy2 = y2 + oy;
              const tx = (dx1 + dx2) / 2;
              const ty = (dy1 + dy2) / 2 - 3;
              const a = vertexLabel(index);
              const b = vertexLabel((index + 1) % outline.length);
              return (
                <g key={`dim-${index}`} className="plan-edge-dimension-group">
                  <line x1={x1} y1={y1} x2={dx1} y2={dy1} />
                  <line x1={x2} y1={y2} x2={dx2} y2={dy2} />
                  <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} className="dimension-main-line" />
                  <text x={tx} y={ty} className="plan-edge-dimension">{a}{b} {edgeLength(point, next).toFixed(2)} m</text>
                  <text x={x1 + 7} y={y1 - 7} className="plan-vertex-label">{a}</text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      <div className="construction-legend">
        {layers.decking && <span><i className="legend-decking" />Lames</span>}
        {layers.decking && (effectiveLayout?.buttJoints?.length ?? 0) > 0 && <span><i className="legend-joint" />Raccords de lames</span>}
        {layers.joists && <span><i className="legend-joist" />Lambourdes</span>}
        {layers.joists && construction.joists.some((joist) => joist.role === 'perimeter') && <span><i className="legend-perimeter" />Lambourdes de contour</span>}
        {layers.plots && <span><i className="legend-plot" />Plots</span>}
        {layers.edgeCladding && edgeCladdingRequested && <span><i className="legend-edge" />Rives</span>}
        {layers.verticalJoists && edgeCladdingRequested && <span><i className="legend-vertical" />Supports verticaux</span>}
        {layers.decking && stairs.length > 0 && <span><i className="legend-stair" />{stairs.length} escalier(s)</span>}
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