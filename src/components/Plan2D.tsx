import { useId, type ReactNode } from 'react';
import type { ProjectInput, TerraceObstacle } from '../domain/types';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getDeckOutlinePointsM } from '../engine/geometry';

function obstacleFill(kind: TerraceObstacle['kind']) {
  if (kind === 'pool') return '#cfeeff';
  if (kind === 'tree') return '#dff2df';
  if (kind === 'post') return '#eceff2';
  if (kind === 'manhole') return '#e5e7ea';
  return '#f4f5f7';
}

export function Plan2D({ input }: { input: ProjectInput }) {
  const clipId = useId().replace(/:/g, '');
  const bounds = getDeckBoundingSizeM(input);
  const outline = getDeckOutlinePointsM(input);
  const pad = 34;
  const maxW = 640;
  const maxH = 390;
  const scale = Math.min((maxW - pad * 2) / bounds.lengthM, (maxH - pad * 2) / bounds.widthM);
  const x = pad + (maxW - pad * 2 - bounds.lengthM * scale) / 2;
  const y = pad + (maxH - pad * 2 - bounds.widthM * scale) / 2;
  const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;

  const boardLines: ReactNode[] = [];
  if (pitchMm > 0) {
    let row = 0;
    for (let center = input.board.widthMm / 2; center <= transverseMm + 0.001; center += pitchMm) {
      const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
      intervals.forEach(([start, end], segment) => {
        if (input.orientation === 'length') {
          boardLines.push(
            <line
              key={`r-${row}-s-${segment}`}
              x1={x + (start / 1000) * scale}
              y1={y + (center / 1000) * scale}
              x2={x + (end / 1000) * scale}
              y2={y + (center / 1000) * scale}
            />,
          );
        } else {
          boardLines.push(
            <line
              key={`r-${row}-s-${segment}`}
              x1={x + (center / 1000) * scale}
              y1={y + (start / 1000) * scale}
              x2={x + (center / 1000) * scale}
              y2={y + (end / 1000) * scale}
            />,
          );
        }
      });
      row += 1;
    }
  }

  const points = outline.map((point) => `${x + point.x * scale},${y + point.y * scale}`).join(' ');

  return (
    <div className="visual-card">
      <div className="visual-title"><span>Vue de dessus</span><code>IB-TERR-UI-2D-013</code></div>
      <svg viewBox={`0 0 ${maxW} ${maxH}`} className="plan" role="img" aria-label="Aperçu 2D de la terrasse et de ses réservations">
        <defs>
          <clipPath id={clipId}><polygon points={points} /></clipPath>
        </defs>
        <polygon points={points} className="deck-shape" />
        <g clipPath={`url(#${clipId})`} className="board-lines">{boardLines}</g>

        {input.obstacles.map((obstacle) => {
          const fill = obstacleFill(obstacle.kind);
          if (obstacle.shape === 'circle') {
            const d = obstacle.diameterM ?? 0;
            return (
              <g key={obstacle.id}>
                <circle
                  cx={x + (obstacle.xM + d / 2) * scale}
                  cy={y + (obstacle.yM + d / 2) * scale}
                  r={(d / 2) * scale}
                  fill={fill}
                  className="obstacle-shape"
                />
                <text x={x + (obstacle.xM + d / 2) * scale} y={y + (obstacle.yM + d / 2) * scale} className="obstacle-label">{obstacle.label}</text>
              </g>
            );
          }
          return (
            <g key={obstacle.id}>
              <rect
                x={x + obstacle.xM * scale}
                y={y + obstacle.yM * scale}
                width={(obstacle.widthM ?? 0) * scale}
                height={(obstacle.heightM ?? 0) * scale}
                fill={fill}
                className="obstacle-shape"
              />
              <text
                x={x + (obstacle.xM + (obstacle.widthM ?? 0) / 2) * scale}
                y={y + (obstacle.yM + (obstacle.heightM ?? 0) / 2) * scale}
                className="obstacle-label"
              >{obstacle.label}</text>
            </g>
          );
        })}

        <polygon points={points} className="deck-outline" />
      </svg>
    </div>
  );
}
