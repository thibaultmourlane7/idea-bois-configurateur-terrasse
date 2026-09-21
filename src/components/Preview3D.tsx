import { useEffect, useRef } from 'react';
import type { ProjectInput, TerraceObstacle } from '../domain/types';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';

function obstacleColor(kind: TerraceObstacle['kind']) {
  if (kind === 'pool') return '#bfe8fb';
  if (kind === 'tree') return '#cfe8c8';
  if (kind === 'post') return '#d9dde1';
  if (kind === 'manhole') return '#cfd4d8';
  return '#e7eaed';
}

export function Preview3D({ input }: { input: ProjectInput }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 640;
    const height = 390;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const bounds = getDeckBoundingSizeM(input);
    const sx = 365 / Math.max(1, bounds.lengthM);
    const sy = 180 / Math.max(1, bounds.widthM);
    const ox = 95;
    const oy = 72;
    const iso = (x: number, y: number) => ({
      x: ox + x * sx + y * sy * 0.58,
      y: oy + y * sy * 0.5 + x * sx * 0.035,
    });

    const drawPolygon = (points: Array<{ x: number; y: number }>, fill: string, stroke: string, lineWidth = 1.5) => {
      if (!points.length) return;
      const first = iso(points[0].x, points[0].y);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i += 1) {
        const point = iso(points[i].x, points[i].y);
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    drawPolygon(getDeckOutlinePointsM(input), '#d7ae7d', '#173e65', 2);

    const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
    const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
    if (pitchMm > 0) {
      ctx.strokeStyle = 'rgba(78,61,43,.5)';
      ctx.lineWidth = 1;
      for (let center = input.board.widthMm / 2; center <= transverseMm + 0.001; center += pitchMm) {
        const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
        for (const [start, end] of intervals) {
          const a = input.orientation === 'length' ? iso(start / 1000, center / 1000) : iso(center / 1000, start / 1000);
          const b = input.orientation === 'length' ? iso(end / 1000, center / 1000) : iso(center / 1000, end / 1000);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const obstacle of input.obstacles) {
      if (obstacle.shape === 'circle') {
        const d = obstacle.diameterM ?? 0;
        const r = d / 2;
        const points = Array.from({ length: 32 }, (_, i) => {
          const angle = (Math.PI * 2 * i) / 32;
          return {
            x: obstacle.xM + r + Math.cos(angle) * r,
            y: obstacle.yM + r + Math.sin(angle) * r,
          };
        });
        drawPolygon(points, obstacleColor(obstacle.kind), '#6b7e8d', 1.2);
      } else {
        const w = obstacle.widthM ?? 0;
        const h = obstacle.heightM ?? 0;
        drawPolygon([
          { x: obstacle.xM, y: obstacle.yM },
          { x: obstacle.xM + w, y: obstacle.yM },
          { x: obstacle.xM + w, y: obstacle.yM + h },
          { x: obstacle.xM, y: obstacle.yM + h },
        ], obstacleColor(obstacle.kind), '#6b7e8d', 1.2);
      }
    }
  }, [input]);

  return (
    <div className="visual-card">
      <div className="visual-title"><span>Aperçu 3D</span><code>IB-TERR-UI-3D-013</code></div>
      <canvas ref={ref} />
    </div>
  );
}
