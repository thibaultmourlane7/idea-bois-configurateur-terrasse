import { useEffect, useRef } from 'react';
import type { ProjectInput } from '../domain/types';

export function Preview3D({ input }: { input: ProjectInput }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1, width = 560, height = 330;
    canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = '100%'; canvas.style.height = 'auto';
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
    const { lengthM: L, widthM: W } = input.dimensions;
    const sx = 340 / Math.max(1, L), sy = 170 / Math.max(1, W), ox = 110, oy = 80;
    const iso = (x: number, y: number) => ({ x: ox + x * sx + y * sy * .55, y: oy + y * sy * .48 + x * sx * .03 });
    const [p1,p2,p3,p4] = [iso(0,0),iso(L,0),iso(L,W),iso(0,W)];
    ctx.fillStyle='#c99c6b'; ctx.strokeStyle='#18324d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y); ctx.lineTo(p4.x,p4.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(47,54,61,.55)'; ctx.lineWidth=1;
    const pitchM=(input.board.widthMm+input.board.gapMm)/1000;
    if(input.orientation==='length') for(let y=pitchM;y<W;y+=pitchM){const a=iso(0,y),b=iso(L,y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    else for(let x=pitchM;x<L;x+=pitchM){const a=iso(x,0),b=iso(x,W);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.fillStyle='#49647f'; ctx.font='13px system-ui'; ctx.fillText('Aperçu isométrique — prototype',16,310);
  }, [input]);

  return <div className="visual-card"><div className="visual-title">Aperçu 3D <code>IB-TERR-UI-3D-001</code></div><canvas ref={ref}/></div>;
}
