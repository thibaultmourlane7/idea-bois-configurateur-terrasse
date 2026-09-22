import { useEffect, useRef } from 'react';
import type { BasketResult, ProjectInput, TerraceObstacle } from '../domain/types';
import { buildConstructionVisual } from '../engine/constructionVisual';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';

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
  layers = FINISHED_LAYERS,
  exploded = false,
}: {
  input: ProjectInput;
  basket?: BasketResult;
  layers?: ConstructionLayers;
  exploded?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 640;
    const height = 390;
    const construction = buildConstructionVisual(input, basket);
    const bounds = getDeckBoundingSizeM(input);
    const visual = input.board.visual;
    const deckLift = exploded ? -26 : 0;
    const joistLift = exploded ? 4 : 0;
    const plotDrop = exploded ? 14 : 0;

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

      if (layers.support) {
        const shifted = outline.map((point) => ({ x: point.x + 0.08, y: point.y + 0.08 }));
        drawPolygon(shifted, '#eef1f2', '#c7d0d6', 1, 18 + plotDrop, 0.9);
      }

      if (layers.plots) {
        construction.plots.forEach((plot) => {
          const p = iso(plot.xM, plot.yM, 15 + plotDrop);
          ctx.fillStyle = '#2f3e49';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 5.5, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9cabb5';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y - 9);
          ctx.stroke();
        });
      }

      if (layers.joists) {
        construction.joists.forEach((joist) => {
          const a = iso(joist.x1M, joist.y1M, 7 + joistLift);
          const b = iso(joist.x2M, joist.y2M, 7 + joistLift);
          ctx.strokeStyle = '#62442e';
          ctx.lineWidth = 7;
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

      if (layers.verticalJoists && input.edgeFinishMode === 'full-perimeter') {
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

      if (layers.edgeCladding && input.edgeFinishMode === 'full-perimeter') {
        const frontEdges = outline.map((point, index) => ({ start: point, end: outline[(index + 1) % outline.length] }));
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
          ctx.fillStyle = visual?.imageStatus === 'verified-media' && photo ? '#d7d7d7' : '#e7ecef';
          ctx.fill();
          ctx.strokeStyle = visual?.imageStatus === 'verified-media' ? '#807060' : '#c4cfd5';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      if (layers.decking) {
        let fill: string | CanvasPattern = '#edf1f3';
        if (visual?.imageStatus === 'verified-media' && photo) {
          const pattern = ctx.createPattern(photo, 'repeat');
          if (pattern) fill = pattern;
        }
        drawPolygon(outline, fill, '#173e65', 2, deckLift, exploded ? 0.78 : 1);

        const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
        const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
        if (pitchMm > 0) {
          ctx.strokeStyle = visual?.imageStatus === 'verified-media' ? 'rgba(78,61,43,.55)' : '#ccd5da';
          ctx.lineWidth = 1;
          for (let center = input.board.widthMm / 2; center <= transverseMm + 0.001; center += pitchMm) {
            const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
            for (const [start, end] of intervals) {
              const a = input.orientation === 'length' ? iso(start / 1000, center / 1000, deckLift) : iso(center / 1000, start / 1000, deckLift);
              const b = input.orientation === 'length' ? iso(end / 1000, center / 1000, deckLift) : iso(center / 1000, end / 1000, deckLift);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      if (layers.obstacles) {
        for (const obstacle of input.obstacles) {
          if (obstacle.shape === 'circle') {
            const d = obstacle.diameterM ?? 0;
            const r = d / 2;
            const points = Array.from({ length: 32 }, (_, i) => {
              const angle = (Math.PI * 2 * i) / 32;
              return { x: obstacle.xM + r + Math.cos(angle) * r, y: obstacle.yM + r + Math.sin(angle) * r };
            });
            drawPolygon(points, obstacleColor(obstacle.kind), '#6b7e8d', 1.2, deckLift - 1);
          } else {
            const w = obstacle.widthM ?? 0;
            const h = obstacle.heightM ?? 0;
            drawPolygon([
              { x: obstacle.xM, y: obstacle.yM },
              { x: obstacle.xM + w, y: obstacle.yM },
              { x: obstacle.xM + w, y: obstacle.yM + h },
              { x: obstacle.xM, y: obstacle.yM + h },
            ], obstacleColor(obstacle.kind), '#6b7e8d', 1.2, deckLift - 1);
          }
        }
      }
    };

    paint();

    if (layers.decking && visual?.imageStatus === 'verified-media' && visual.imageUrl) {
      const image = new Image();
      image.onload = () => paint(image);
      image.onerror = () => paint();
      image.src = visual.imageUrl;
    }
  }, [input, basket, layers, exploded]);

  return (
    <div className="visual-card">
      <div className="visual-title"><span>Aperçu 3D construction</span><code>IB-TERR-UI-3D-014</code></div>
      <canvas ref={ref} />
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
          ? <div className="texture-source-note pending">Page produit IDEA Bois vérifiée — média direct non encore mappé, rendu neutre.</div>
          : <div className="texture-source-note pending">Visuel produit non encore vérifié — rendu neutre volontaire.</div>}
    </div>
  );
}
