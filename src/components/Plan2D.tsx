import type { ProjectInput } from '../domain/types';

export function Plan2D({ input }: { input: ProjectInput }) {
  const { lengthM: L, widthM: W, notchLengthM: nL, notchWidthM: nW } = input.dimensions;
  const pad = 26, maxW = 560, maxH = 330;
  const scale = Math.min((maxW - pad * 2) / L, (maxH - pad * 2) / W);
  const x = pad, y = pad, pxL = L * scale, pxW = W * scale;
  const pitchM = (input.board.widthMm + input.board.gapMm) / 1000;
  const polygon = input.shape === 'rectangle'
    ? `${x},${y} ${x + pxL},${y} ${x + pxL},${y + pxW} ${x},${y + pxW}`
    : `${x},${y} ${x + pxL},${y} ${x + pxL},${y + (W - nW) * scale} ${x + (L - nL) * scale},${y + (W - nW) * scale} ${x + (L - nL) * scale},${y + pxW} ${x},${y + pxW}`;

  const lines = [];
  if (input.orientation === 'length') {
    for (let yy = 0; yy <= W; yy += pitchM) lines.push(<line key={yy} x1={x} y1={y + yy * scale} x2={x + pxL} y2={y + yy * scale} />);
  } else {
    for (let xx = 0; xx <= L; xx += pitchM) lines.push(<line key={xx} x1={x + xx * scale} y1={y} x2={x + xx * scale} y2={y + pxW} />);
  }

  return <div className="visual-card">
    <div className="visual-title">Plan 2D <code>IB-TERR-UI-2D-001</code></div>
    <svg viewBox={`0 0 ${maxW} ${maxH}`} className="plan">
      <defs><clipPath id="deckClip"><polygon points={polygon} /></clipPath></defs>
      <polygon points={polygon} className="deck-shape" />
      <g clipPath="url(#deckClip)" className="board-lines">{lines}</g>
      <polygon points={polygon} className="deck-outline" />
    </svg>
  </div>;
}
