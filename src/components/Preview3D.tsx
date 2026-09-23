import { useEffect, useRef } from 'react';
import type { BasketResult, LayoutResult, ProjectInput, SupportPlanResult, TerraceObstacle } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';
import { computeTerraceEdges } from '../engine/edges';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';
import { resolveBoardTexture, textureStatusLabel } from '../visual/resolveBoardTexture';
import { resolveMaterialProfile } from '../visual/materialProfiles';
import { buildGrooveLines } from '../visual/texturePainter';
import { findBoard } from '../catalog/compatibility';

function obstacleColor(kind: TerraceObstacle['kind']) {
  if (kind === 'pool') return '#bfe8fb';
  if (kind === 'tree') return '#cfe8c8';
  if (kind === 'post') return '#d9dde1';
  if (kind === 'manhole') return '#cfd4d8';
  return '#e7eaed';
}

export function Preview3D({
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
  const ref = useRef<HTMLCanvasElement>(null);
  const texture = resolveBoardTexture(input.board);
  const materialProfile = resolveMaterialProfile(input.board);
  const grooveLines = buildGrooveLines(materialProfile);
  const businessEdges = computeTerraceEdges(input);
  const claddingEdges = businessEdges.filter((edge) => edge.treatment === 'cladding');
  const edgeCladdingRequested = claddingEdges.length > 0;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 640;
    const height = 390;
    const construction = buildConstructionVisual(input, basket, supportPlan);
    const bounds = getDeckBoundingSizeM(input);
    const deckLift = exploded ? -26 : 0;
    const joistLift = exploded ? 4 : 0;
    const plotDrop = exploded ? 14 : 0;
    const minPlotHeight = supportPlan?.minRequiredPlotHeightMm ?? 0;
    const maxPlotHeight = supportPlan?.maxRequiredPlotHeightMm ?? minPlotHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = 350 / Math.max(1, bounds.lengthM);
    const sy = 175 / Math.max(1, bounds.widthM);
    const ox = 92;
    const oy = 78;
    const iso = (xM: number, yM: number, zPx = 0) => ({
      x: ox + xM * sx + yM * sy * 0.58,
      y: oy + yM * sy * 0.5 + xM * sx * 0.035 + zPx,
    });

    const outline = getDeckOutlinePointsM(input);

    const drawPolygon = (
      points: Array<{ x: number; y: number }>,
      fill: string | CanvasPattern,
      stroke: string,
      lineWidth = 1.5,
      z = 0,
      alpha = 1,
    ) => {
      if (!points.length) return;
      const first = iso(points[0].x, points[0].y, z);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i += 1) {
        const point = iso(points[i].x, points[i].y, z);
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    };

    const paint = (photo?: HTMLImageElement) => {
      ctx.clearRect(0, 0, width, height);

      const ground = [
        { x: -0.7, y: -0.7 },
        { x: bounds.lengthM + 0.7, y: -0.7 },
        { x: bounds.lengthM + 0.7, y: bounds.widthM + 0.7 },
        { x: -0.7, y: bounds.widthM + 0.7 },
      ];
      drawPolygon(ground, '#f5f3ea', '#d8d3c6', 1, 31 + plotDrop, 0.96);

      if (layers.support) {
        const shifted = outline.map((point) => ({ x: point.x + 0.08, y: point.y + 0.08 }));
        drawPolygon(shifted, '#eef1f2', '#c7d0d6', 1, 18 + plotDrop, 0.9);
      }

      if (layers.plots) {
        construction.plots.forEach((plot) => {
          const range = Math.max(1, maxPlotHeight - minPlotHeight);
          const heightRatio = plot.requiredHeightMm == null ? 0.5 : (plot.requiredHeightMm - minPlotHeight) / range;
          const stemPx = 7 + Math.max(0, Math.min(1, heightRatio)) * 13;
          const p = iso(plot.xM, plot.yM, 15 + plotDrop);
          ctx.fillStyle = plot.status === 'unsupported' ? '#b64c45' : '#2f3e49';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 5.5, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9cabb5';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y - stemPx);
          ctx.stroke();
        });
      }

      if (layers.joists) {
        construction.joists.forEach((joist) => {
          const a = iso(joist.x1M, joist.y1M, 7 + joistLift);
          const b = iso(joist.x2M, joist.y2M, 7 + joistLift);
          const perimeter = joist.role === 'perimeter';
          ctx.strokeStyle = perimeter ? '#365f7a' : joist.multiplicity === 2 ? '#935a2f' : '#62442e';
          ctx.lineWidth = perimeter ? 8 : joist.multiplicity === 2 ? 11 : 7;
          ctx.lineCap = 'square';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.strokeStyle = '#8e6848';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - 1);
          ctx.lineTo(b.x, b.y - 1);
          ctx.stroke();
        });
      }

      if (layers.verticalJoists && edgeCladdingRequested) {
        construction.verticalJoists.forEach((support) => {
          const top = iso(support.xM, support.yM, 8);
          const bottom = { x: top.x, y: top.y + Math.min(54, 15 + input.edgeCladdingHeightCm * 0.75) };
          ctx.strokeStyle = '#503824';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.stroke();
        });
      }

      if (layers.edgeCladding && edgeCladdingRequested) {
        const frontEdges = input.shape === 'circle'
          ? outline.map((point, index) => ({ start: point, end: outline[(index + 1) % outline.length] }))
          : claddingEdges.map((edge) => ({
              start: { x: edge.start.xM, y: edge.start.yM },
              end: { x: edge.end.xM, y: edge.end.yM },
            }));
        const depth = Math.min(60, 12 + input.edgeCladdingHeightCm * 0.8);
        frontEdges.forEach(({ start, end }) => {
          const a = iso(start.x, start.y, 1);
          const b = iso(end.x, end.y, 1);
          const face = [
            { x: a.x, y: a.y },
            { x: b.x, y: b.y },
            { x: b.x, y: b.y + depth },
            { x: a.x, y: a.y + depth },
          ];
          ctx.beginPath();
          ctx.moveTo(face[0].x, face[0].y);
          face.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          const edgePattern = photo ? ctx.createPattern(photo, 'repeat') : null;
          ctx.fillStyle = edgePattern ?? '#e7ecef';
          ctx.fill();
          if (photo && (texture.tintOpacity ?? 0) > 0) {
            ctx.save();
            ctx.globalAlpha = texture.tintOpacity ?? 0;
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = texture.tintColor ?? '#ffffff';
            ctx.fill();
            ctx.restore();
          }
          ctx.strokeStyle = photo ? '#786553' : '#c4cfd5';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      if (layers.decking) {
        let fill: string | CanvasPattern = '#edf1f3';
        if (photo) {
          const pattern = ctx.createPattern(photo, 'repeat');
          if (pattern) fill = pattern;
        }
        drawPolygon(outline, fill, '#173e65', 2, deckLift, exploded ? 0.78 : 1);
        if (photo && (texture.tintOpacity ?? 0) > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          drawPolygon(outline, texture.tintColor ?? '#ffffff', 'transparent', 0, deckLift, texture.tintOpacity ?? 0);
          ctx.restore();
        }

        if (layout?.boardSegments?.length) {
          for (const segment of layout.boardSegments) {
            if (segment.x1M == null || segment.y1M == null || segment.x2M == null || segment.y2M == null) continue;
            const segmentBoard = findBoard(segment.boardId) ?? input.board;
            const segmentProfile = resolveMaterialProfile(segmentBoard);
            const segmentGrooves = buildGrooveLines(segmentProfile);
            const normalX = segment.normalX ?? (input.orientation === 'length' ? 0 : 1);
            const normalY = segment.normalY ?? (input.orientation === 'length' ? 1 : 0);
            const drawParallel = (offsetMm: number, stroke: string, lineWidth: number) => {
              const offsetM = offsetMm / 1000;
              const a = iso(segment.x1M! + normalX * offsetM, segment.y1M! + normalY * offsetM, deckLift);
              const b = iso(segment.x2M! + normalX * offsetM, segment.y2M! + normalY * offsetM, deckLift);
              ctx.strokeStyle = stroke;
              ctx.lineWidth = lineWidth;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            };

            const halfWidth = segmentBoard.widthMm / 2;
            const edgeOpacity = segmentProfile?.boardEdgeOpacity ?? 0.50;
            if (segmentBoard.id !== input.board.id) {
              drawParallel(0, segmentBoard.visual?.baseColor ?? '#c7ab82', Math.max(3.5, Math.min(9, segmentBoard.widthMm / 18)));
            }
            drawParallel(-halfWidth, `rgba(42,34,28,${edgeOpacity})`, 0.85);
            drawParallel(halfWidth, `rgba(42,34,28,${edgeOpacity})`, 0.85);

            if (segmentGrooves.length) {
              for (const groove of segmentGrooves) {
                const offsetMm = (groove.ratio - 0.5) * segmentBoard.widthMm;
                drawParallel(offsetMm, `rgba(37,30,25,${groove.shadowOpacity})`, 0.62);
                drawParallel(offsetMm - 1.15, `rgba(237,226,201,${groove.highlightOpacity})`, 0.34);
              }
            } else {
              drawParallel(0, segmentBoard.id === input.board.id && photo ? 'rgba(78,61,43,.35)' : '#ccd5da', 0.55);
            }
          }
        }
      }

      if (layers.decking && layout?.buttJoints?.length) {
        ctx.save();
        ctx.strokeStyle = '#17212a';
        ctx.lineWidth = 1.8;
        for (const joint of layout.buttJoints) {
          const halfM = Math.max(0.035, input.board.widthMm / 1000 * 0.55);
          const cx = joint.xM ?? (input.orientation === 'length' ? joint.axisPositionMm : joint.transverseCenterMm) / 1000;
          const cy = joint.yM ?? (input.orientation === 'length' ? joint.transverseCenterMm : joint.axisPositionMm) / 1000;
          const nx = joint.normalX ?? (input.orientation === 'length' ? 0 : 1);
          const ny = joint.normalY ?? (input.orientation === 'length' ? 1 : 0);
          const a = iso(cx - nx * halfM, cy - ny * halfM, deckLift - 0.5);
          const b = iso(cx + nx * halfM, cy + ny * halfM, deckLift - 0.5);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (layers.obstacles) {
        for (const obstacle of input.obstacles) {
          if (obstacle.shape === 'circle') {
            const d = obstacle.diameterM ?? 0;
            const r = d / 2;
            const cx = obstacle.xM + r;
            const cy = obstacle.yM + r;
            const points = Array.from({ length: 32 }, (_, i) => {
              const angle = (Math.PI * 2 * i) / 32;
              return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
            });
            drawPolygon(points, obstacleColor(obstacle.kind), '#6b7e8d', 1.2, deckLift - 1);
            const center = iso(cx, cy, deckLift - 2);
            if (obstacle.kind === 'tree') {
              ctx.strokeStyle = '#76543b';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.moveTo(center.x, center.y + 3);
              ctx.lineTo(center.x, center.y - 24);
              ctx.stroke();
              ctx.fillStyle = '#9bc58f';
              ctx.beginPath();
              ctx.ellipse(center.x, center.y - 28, Math.max(8, r * sx * 0.35), Math.max(5, r * sy * 0.2), 0, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            const w = obstacle.widthM ?? 0;
            const h = obstacle.heightM ?? 0;
            const shape = [
              { x: obstacle.xM, y: obstacle.yM },
              { x: obstacle.xM + w, y: obstacle.yM },
              { x: obstacle.xM + w, y: obstacle.yM + h },
              { x: obstacle.xM, y: obstacle.yM + h },
            ];
            const obstacleZ = obstacle.kind === 'pool' ? deckLift + 5 : deckLift - 1;
            drawPolygon(shape, obstacleColor(obstacle.kind), '#6b7e8d', 1.2, obstacleZ);
            const center = iso(obstacle.xM + w / 2, obstacle.yM + h / 2, deckLift - 1);
            if (obstacle.kind === 'post') {
              ctx.strokeStyle = '#727a80';
              ctx.lineWidth = 6;
              ctx.beginPath();
              ctx.moveTo(center.x, center.y + 2);
              ctx.lineTo(center.x, center.y - 30);
              ctx.stroke();
            } else if (obstacle.kind === 'pool') {
              ctx.strokeStyle = 'rgba(255,255,255,.85)';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(center.x - Math.max(4, w * sx * 0.18), center.y);
              ctx.lineTo(center.x + Math.max(4, w * sx * 0.18), center.y);
              ctx.stroke();
            }
          }
        }
      }
    };

    paint();

    if ((layers.decking || layers.edgeCladding) && texture.textureImageUrl) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => paint(image);
      image.onerror = () => paint();
      image.src = texture.textureImageUrl;
    }
  }, [input, basket, supportPlan, layout, layers, exploded, texture, materialProfile, grooveLines]);

  return (
    <div className="visual-card">
      <div className="visual-title"><span>Aperçu 3D construction</span><code>IB-TERR-UI-3D-019</code></div>
      <canvas ref={ref} />
      <div className="construction-legend">
        {layers.decking && <span><i className="legend-decking" />Lames</span>}
        {layers.decking && (layout?.buttJoints?.length ?? 0) > 0 && <span><i className="legend-joint" />Raccords</span>}
        {layers.joists && <span><i className="legend-joist" />Lambourdes</span>}
        {layers.joists && (supportPlan?.joistSegments.some((segment) => segment.role === 'perimeter') ?? false) && <span><i className="legend-perimeter" />Contour</span>}
        {layers.plots && <span><i className="legend-plot" />Plots</span>}
        {layers.edgeCladding && edgeCladdingRequested && <span><i className="legend-edge" />Rives</span>}
        {layers.verticalJoists && edgeCladdingRequested && <span><i className="legend-vertical" />Supports verticaux</span>}
      </div>
      <div className={`texture-quality-note ${texture.status}`}>
        <strong>{textureStatusLabel(texture)}</strong>
        <span>{texture.label}</span>
        {materialProfile ? <small>Profil B1 : rainures représentées sur la géométrie de la lame.</small> : texture.status === 'close' && <small>Rendu de projection. Les textures réalistes ne sont pas modifiées dans cette phase.</small>}
      </div>
    </div>
  );
}
