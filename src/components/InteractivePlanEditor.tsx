import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectInput, TerraceObstacle } from '../domain/types';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from '../engine/geometry';
import {
  addVertexOnLongestEdge,
  moveObstacle,
  moveVertex,
  polygonEdgeLengths,
  removeVertex,
  resizeObstacle,
} from '../editor/interactiveGeometry';

type Tool = 'select' | 'pan';

type DragState =
  | { kind: 'move-obstacle'; id: string; offsetXM: number; offsetYM: number }
  | { kind: 'resize-obstacle'; id: string }
  | { kind: 'vertex'; index: number }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | null;

type Props = {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
  onBeginEdit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

const WIDTH = 760;
const HEIGHT = 490;
const PAD = 70;

function obstacleFill(kind: TerraceObstacle['kind']) {
  if (kind === 'pool') return '#bfe8fb';
  if (kind === 'tree') return '#d8ecd0';
  if (kind === 'post') return '#e5e8eb';
  if (kind === 'manhole') return '#d9dde1';
  return '#efe9dc';
}

export function InteractivePlanEditor({
  project,
  onChange,
  onBeginEdit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragState>(null);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState(0.34);

  useEffect(() => () => {
    if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
  }, [referenceImageUrl]);

  const bounds = getDeckBoundingSizeM(project);
  const outline = getDeckOutlinePointsM(project);
  const baseScale = Math.min(
    (WIDTH - PAD * 2) / Math.max(0.1, bounds.lengthM),
    (HEIGHT - PAD * 2) / Math.max(0.1, bounds.widthM),
  );
  const originX = (WIDTH - bounds.lengthM * baseScale) / 2;
  const originY = (HEIGHT - bounds.widthM * baseScale) / 2;
  const edgeLengths = useMemo(() => polygonEdgeLengths(project.freeformPoints ?? []), [project.freeformPoints]);
  const selectedObstacle = project.obstacles.find((obstacle) => obstacle.id === selectedObstacleId) ?? null;

  const screenPoint = (event: React.PointerEvent<SVGSVGElement | SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const mapped = point.matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  };

  const modelPoint = (event: React.PointerEvent<SVGSVGElement | SVGElement>) => {
    const point = screenPoint(event);
    return {
      xM: Math.max(0, (point.x - originX - pan.x) / (baseScale * zoom)),
      yM: Math.max(0, (point.y - originY - pan.y) / (baseScale * zoom)),
    };
  };

  const updateObstacle = (id: string, nextObstacle: TerraceObstacle) => {
    onChange({
      ...project,
      obstacles: project.obstacles.map((obstacle) => obstacle.id === id ? nextObstacle : obstacle),
    });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;

    if (drag.kind === 'pan') {
      const point = screenPoint(event);
      setPan({
        x: drag.panX + point.x - drag.startX,
        y: drag.panY + point.y - drag.startY,
      });
      return;
    }

    const point = modelPoint(event);

    if (drag.kind === 'move-obstacle') {
      const obstacle = project.obstacles.find((item) => item.id === drag.id);
      if (!obstacle) return;
      updateObstacle(drag.id, moveObstacle(obstacle, point.xM - drag.offsetXM, point.yM - drag.offsetYM));
      return;
    }

    if (drag.kind === 'resize-obstacle') {
      const obstacle = project.obstacles.find((item) => item.id === drag.id);
      if (!obstacle) return;
      updateObstacle(drag.id, resizeObstacle(obstacle, point.xM, point.yM));
      return;
    }

    if (drag.kind === 'vertex') {
      const points = project.freeformPoints ?? [];
      onChange({ ...project, freeformPoints: moveVertex(points, drag.index, point.xM, point.yM) });
    }
  };

  const stopDrag = () => setDrag(null);

  const startBackgroundPointer = (event: React.PointerEvent<SVGRectElement>) => {
    setSelectedObstacleId(null);
    setSelectedVertexIndex(null);
    if (tool !== 'pan') return;
    const point = screenPoint(event);
    setDrag({ kind: 'pan', startX: point.x, startY: point.y, panX: pan.x, panY: pan.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startObstacleMove = (event: React.PointerEvent<SVGGElement>, obstacle: TerraceObstacle) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    const point = modelPoint(event);
    onBeginEdit();
    setSelectedObstacleId(obstacle.id);
    setSelectedVertexIndex(null);
    setDrag({
      kind: 'move-obstacle',
      id: obstacle.id,
      offsetXM: point.xM - obstacle.xM,
      offsetYM: point.yM - obstacle.yM,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startResize = (event: React.PointerEvent<SVGCircleElement>, obstacle: TerraceObstacle) => {
    event.stopPropagation();
    onBeginEdit();
    setDrag({ kind: 'resize-obstacle', id: obstacle.id });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startVertexMove = (event: React.PointerEvent<SVGCircleElement>, index: number) => {
    event.stopPropagation();
    onBeginEdit();
    setSelectedVertexIndex(index);
    setSelectedObstacleId(null);
    setDrag({ kind: 'vertex', index });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const addVertex = () => {
    const points = project.freeformPoints ?? [];
    if (points.length < 3) return;
    onBeginEdit();
    onChange({ ...project, freeformPoints: addVertexOnLongestEdge(points) });
    setSelectedVertexIndex(null);
  };

  const deleteVertex = () => {
    if (selectedVertexIndex == null) return;
    const points = project.freeformPoints ?? [];
    if (points.length <= 3) return;
    onBeginEdit();
    onChange({ ...project, freeformPoints: removeVertex(points, selectedVertexIndex) });
    setSelectedVertexIndex(null);
  };

  const setReference = (file?: File) => {
    if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
    setReferenceImageUrl(file ? URL.createObjectURL(file) : null);
  };

  const gridX = Array.from({ length: Math.floor(bounds.lengthM / 0.5) + 1 }, (_, index) => index * 0.5);
  const gridY = Array.from({ length: Math.floor(bounds.widthM / 0.5) + 1 }, (_, index) => index * 0.5);
  const outlinePoints = outline.map((point) => `${point.x * baseScale},${point.y * baseScale}`).join(' ');

  return (
    <section className="interactive-editor">
      <div className="editor-toolbar">
        <div className="editor-tool-group">
          <button type="button" className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')}>Sélection</button>
          <button type="button" className={tool === 'pan' ? 'active' : ''} onClick={() => setTool('pan')}>Déplacer le plan</button>
        </div>
        <div className="editor-tool-group">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.65, +(value - 0.2).toFixed(2)))}>−</button>
          <span>{Math.round(zoom * 100)} %</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(3.5, +(value + 0.2).toFixed(2)))}>+</button>
          <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Centrer</button>
        </div>
        <div className="editor-tool-group">
          <button type="button" disabled={!canUndo} onClick={onUndo}>↶ Annuler</button>
          <button type="button" disabled={!canRedo} onClick={onRedo}>↷ Rétablir</button>
        </div>
      </div>

      <div className="editor-reference-row">
        <label className="reference-upload">
          Fond plan / photo
          <input type="file" accept="image/*" onChange={(event) => setReference(event.target.files?.[0])} />
        </label>
        {referenceImageUrl && (
          <>
            <label className="reference-opacity">Opacité
              <input type="range" min="0.08" max="0.8" step="0.02" value={referenceOpacity} onChange={(event) => setReferenceOpacity(+event.target.value)} />
            </label>
            <button type="button" onClick={() => setReference()}>Retirer le fond</button>
          </>
        )}
        <small>Le fond sert uniquement de référence visuelle : aucune cote n’est déduite automatiquement.</small>
      </div>

      {project.shape === 'freeform' && (
        <div className="freeform-toolbar">
          <strong>Forme libre</strong>
          <button type="button" onClick={addVertex}>+ Ajouter un sommet</button>
          <button type="button" disabled={selectedVertexIndex == null || (project.freeformPoints?.length ?? 0) <= 3} onClick={deleteVertex}>Supprimer le sommet</button>
          <span>{project.freeformPoints?.length ?? 0} sommets</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`interactive-plan-svg tool-${tool}`}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} className="editor-hitbox" onPointerDown={startBackgroundPointer} />

        <g transform={`translate(${originX + pan.x} ${originY + pan.y}) scale(${zoom})`}>
          {referenceImageUrl && (
            <image
              href={referenceImageUrl}
              x="0"
              y="0"
              width={bounds.lengthM * baseScale}
              height={bounds.widthM * baseScale}
              preserveAspectRatio="none"
              opacity={referenceOpacity}
              pointerEvents="none"
            />
          )}

          <g className="editor-grid" pointerEvents="none">
            {gridX.map((meter) => <line key={`x-${meter}`} x1={meter * baseScale} y1="0" x2={meter * baseScale} y2={bounds.widthM * baseScale} />)}
            {gridY.map((meter) => <line key={`y-${meter}`} x1="0" y1={meter * baseScale} x2={bounds.lengthM * baseScale} y2={meter * baseScale} />)}
          </g>

          {outline.length >= 3 && (
            <polygon points={outlinePoints} className="editor-deck-shape" />
          )}

          <g className="overall-dimensions" pointerEvents="none">
            <line x1="0" y1={-22 / zoom} x2={bounds.lengthM * baseScale} y2={-22 / zoom} />
            <line x1="0" y1={-28 / zoom} x2="0" y2={-16 / zoom} />
            <line x1={bounds.lengthM * baseScale} y1={-28 / zoom} x2={bounds.lengthM * baseScale} y2={-16 / zoom} />
            <text x={bounds.lengthM * baseScale / 2} y={-27 / zoom}>{bounds.lengthM.toFixed(2)} m</text>

            <line x1={-22 / zoom} y1="0" x2={-22 / zoom} y2={bounds.widthM * baseScale} />
            <line x1={-28 / zoom} y1="0" x2={-16 / zoom} y2="0" />
            <line x1={-28 / zoom} y1={bounds.widthM * baseScale} x2={-16 / zoom} y2={bounds.widthM * baseScale} />
            <text x={-29 / zoom} y={bounds.widthM * baseScale / 2} transform={`rotate(-90 ${-29 / zoom} ${bounds.widthM * baseScale / 2})`}>{bounds.widthM.toFixed(2)} m</text>
          </g>

          {project.shape === 'freeform' && (project.freeformPoints ?? []).map((point, index) => {
            const next = project.freeformPoints?.[(index + 1) % (project.freeformPoints?.length ?? 1)];
            const length = edgeLengths[index];
            const mx = next ? ((point.xM + next.xM) / 2) * baseScale : point.xM * baseScale;
            const my = next ? ((point.yM + next.yM) / 2) * baseScale : point.yM * baseScale;
            return (
              <g key={index}>
                <text className="edge-dimension" x={mx} y={my - 6 / zoom} pointerEvents="none">{length?.toFixed(2)} m</text>
                <circle
                  cx={point.xM * baseScale}
                  cy={point.yM * baseScale}
                  r={selectedVertexIndex === index ? 8 / zoom : 6 / zoom}
                  className={selectedVertexIndex === index ? 'vertex-handle selected' : 'vertex-handle'}
                  onPointerDown={(event) => startVertexMove(event, index)}
                />
                <text className="vertex-index" x={point.xM * baseScale + 8 / zoom} y={point.yM * baseScale - 8 / zoom} pointerEvents="none">{index + 1}</text>
              </g>
            );
          })}

          {project.obstacles.map((obstacle) => {
            const selected = obstacle.id === selectedObstacleId;
            const width = obstacle.shape === 'circle' ? obstacle.diameterM ?? 0 : obstacle.widthM ?? 0;
            const height = obstacle.shape === 'circle' ? obstacle.diameterM ?? 0 : obstacle.heightM ?? 0;
            const x = obstacle.xM * baseScale;
            const y = obstacle.yM * baseScale;
            const w = width * baseScale;
            const h = height * baseScale;

            return (
              <g key={obstacle.id} className={selected ? 'interactive-obstacle selected' : 'interactive-obstacle'} onPointerDown={(event) => startObstacleMove(event, obstacle)}>
                {obstacle.shape === 'circle' ? (
                  <circle cx={x + w / 2} cy={y + h / 2} r={w / 2} fill={obstacleFill(obstacle.kind)} />
                ) : (
                  <rect x={x} y={y} width={w} height={h} rx={4 / zoom} fill={obstacleFill(obstacle.kind)} />
                )}
                <text x={x + w / 2} y={y + h / 2 - 2 / zoom} className="interactive-obstacle-label" pointerEvents="none">{obstacle.label}</text>
                <text x={x + w / 2} y={y + h / 2 + 11 / zoom} className="interactive-obstacle-size" pointerEvents="none">
                  {obstacle.shape === 'circle' ? `Ø ${width.toFixed(2)} m` : `${width.toFixed(2)} × ${height.toFixed(2)} m`}
                </text>

                {selected && tool === 'select' && (
                  <circle
                    cx={x + w}
                    cy={obstacle.shape === 'circle' ? y + h / 2 : y + h}
                    r={7 / zoom}
                    className="resize-handle"
                    onPointerDown={(event) => startResize(event, obstacle)}
                  />
                )}
              </g>
            );
          })}

          {selectedObstacle && (
            <g className="obstacle-distance-guides" pointerEvents="none">
              <line x1="0" y1={selectedObstacle.yM * baseScale} x2={selectedObstacle.xM * baseScale} y2={selectedObstacle.yM * baseScale} />
              <text x={(selectedObstacle.xM * baseScale) / 2} y={selectedObstacle.yM * baseScale - 5 / zoom}>gauche {selectedObstacle.xM.toFixed(2)} m</text>
              <line x1={selectedObstacle.xM * baseScale} y1="0" x2={selectedObstacle.xM * baseScale} y2={selectedObstacle.yM * baseScale} />
              <text x={selectedObstacle.xM * baseScale + 5 / zoom} y={(selectedObstacle.yM * baseScale) / 2}>haut {selectedObstacle.yM.toFixed(2)} m</text>
            </g>
          )}
        </g>
      </svg>

      <div className="editor-help">
        <span>Glissez une réservation pour la déplacer.</span>
        <span>Sélectionnez-la puis utilisez la poignée ronde pour la redimensionner.</span>
        {project.shape === 'freeform' && <span>Glissez directement les sommets numérotés pour modifier le contour.</span>}
      </div>
    </section>
  );
}
