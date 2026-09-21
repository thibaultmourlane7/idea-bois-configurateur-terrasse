import { useEffect, useRef } from 'react';
import type { ProjectInput } from '../domain/types';

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
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { lengthM: L, widthM: W } = input.dimensions;
    const sx = 380 / Math.max(1, L);
    const sy = 190 / Math.max(1, W);
    const ox = 105;
    const oy = 75;
    const iso = (x: number, y: number) => ({ x: ox + x * sx + y * sy * 0.58, y: oy + y * sy * 0.5 + x * sx * 0.035 });
    const [p1, p2, p3, p4] = [iso(0, 0), iso(L, 0), iso(L, W), iso(0, W)];

    ctx.fillStyle = '#d7ae7d';
    ctx.strokeStyle = '#173e65';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(78,61,43,.5)';
    ctx.lineWidth = 1;
    const pitchM = (input.board.widthMm + input.board.gapMm) / 1000;
    if (input.orientation === 'length') {
      for (let y = pitchM; y < W; y += pitchM) {
        const a = iso(0, y); const b = iso(L, y);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    } else {
      for (let x = pitchM; x < L; x += pitchM) {
        const a = iso(x, 0); const b = iso(x, W);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }, [input]);

  return (
    <div className="visual-card">
      <div className="visual-title"><span>Aperçu 3D</span><code>IB-TERR-UI-3D-006</code></div>
      <canvas ref={ref} />
    </div>
  );
}
