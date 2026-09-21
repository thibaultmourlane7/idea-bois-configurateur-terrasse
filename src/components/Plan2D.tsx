import type { ProjectInput } from '../domain/types';

export function Plan2D({ input }: { input: ProjectInput }) {
  const { lengthM: L, widthM: W, notchLengthM: nL, notchWidthM: nW } = input.dimensions;
  const pad = 30;
  const maxW = 640;
  const maxH = 390;
  const scale = Math.min((maxW - pad * 2) / L, (maxH - pad * 2) / W);
  const x = pad;
  const y = pad;
  const pxL = L * scale;
  const pxW = W * scale;
  const pitchM = (input.board.widthMm + input.board.gapMm) / 1000;
  const polygon = input.shape === 'rectangle'
    ? `${x},${y} ${x + pxL},${y} ${x + pxL},${y + pxW} ${x},${y + pxW}`
    : `${x},${y} ${x + pxL},${y} ${x + pxL},${y + (W - nW) * scale} ${x + (L - nL) * scale},${y + (W - nW) * scale} ${x + (L - nL) * scale},${y + pxW} ${x},${y + pxW}`;

  const lines = [];
  if (input.orientation === 'length') {
    for (let yy = 0; yy <= W; yy += pitchM) {
      lines.push(<line key={`y-${yy}`} x1={x} y1={y + yy * scale} x2={x + pxL} y2={y + yy * scale} />);
    }
  } else {
    for (let xx = 0; xx <= L; xx += pitchM) {
      lines.push(<line key={`x-${xx}`} x1={x + xx * scale} y1={y} x2={x + xx * scale} y2={y + pxW} />);
    }
  }

  return (
    <div className="visual-card">
      <div className="visual-title"><span>Vue de dessus</span><code>IB-TERR-UI-2D-006</code></div>
      <svg viewBox={`0 0 ${maxW} ${maxH}`} className="plan" role="img" aria-label="Aperçu 2D de la terrasse">
        <defs><clipPath id="deckClip"><polygon points={polygon} /></clipPath></defs>
        <polygon points={polygon} className="deck-shape" />
        <g clipPath="url(#deckClip)" className="board-lines">{lines}</g>
        <polygon points={polygon} className="deck-outline" />
      </svg>
    </div>
  );
}
