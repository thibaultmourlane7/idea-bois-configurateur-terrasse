import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectInput, ReferencePlanTransform, TerraceObstacle, TerracePoint } from '../domain/types';
import { calibrateReferencePlan, fitReferencePlan, referencePlanDiagnostics, zoomReferencePlan } from '../domain/referencePlan';
import { getDeckBoundingSizeM, getDeckOutlinePointsM, isSimplePolygon } from '../engine/geometry';
import {
  addVertexOnLongestEdge,
  isOrthogonalPolygon,
  moveObstacle,
  moveVertex,
  polygonEdgeLengths,
  removeVertex,
  resizeFreeformEdge,
  resizeOrthogonalFreeformEdge,
  resizeObstacle,
  vertexLabel,
} from '../editor/interactiveGeometry';

type Tool = 'select' | 'pan' | 'draw' | 'reference' | 'calibrate';

type DragState =
  | { kind: 'move-obstacle'; id: string; offsetXM: number; offsetYM: number }
  | { kind: 'resize-obstacle'; id: string }
  | { kind: 'vertex'; index: number }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { kind: 'move-reference'; startXM: number; startYM: number; offsetXM: number; offsetYM: number }
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
  const [calibrationPoints, setCalibrationPoints] = useState<TerracePoint[]>([]);
  const [calibrationDistanceM, setCalibrationDistanceM] = useState('');
  const [drawPoints, setDrawPoints] = useState<TerracePoint[]>([]);
  const [orthogonalMode, setOrthogonalMode] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);

  useEffect(() => () => {
    if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
  }, [referenceImageUrl]);

  const bounds = getDeckBoundingSizeM(project);
  const outline = getDeckOutlinePointsM(project);
  const viewport = useMemo(() => {
    // Marge fixe autour du contour : le repère ne saute pas pendant le déplacement d'une réservation.
    // Le panoramique permet d'aller chercher une réservation volontairement placée plus loin.
    const marginM = Math.max(0.75, Math.max(bounds.lengthM, bounds.widthM) * 0.25);
    return {
      minX: -marginM,
      minY: -marginM,
      maxX: bounds.lengthM + marginM,
      maxY: bounds.widthM + marginM,
      widthM: Math.max(0.1, bounds.lengthM + marginM * 2),
      heightM: Math.max(0.1, bounds.widthM + marginM * 2),
    };
  }, [bounds.lengthM, bounds.widthM]);

  const baseScale = Math.min(
    (WIDTH - PAD * 2) / viewport.widthM,
    (HEIGHT - PAD * 2) / viewport.heightM,
  );
  const originX = (WIDTH - viewport.widthM * baseScale) / 2 - viewport.minX * baseScale;
  const originY = (HEIGHT - viewport.heightM * baseScale) / 2 - viewport.minY * baseScale;
  const edgeLengths = useMemo(() => polygonEdgeLengths(project.freeformPoints ?? []), [project.freeformPoints]);
  const selectedObstacle = project.obstacles.find((obstacle) => obstacle.id === selectedObstacleId) ?? null;
  const referencePlan = project.referencePlan;
  const referenceDiagnostics = referencePlanDiagnostics(referencePlan);

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
      xM: (point.x - originX - pan.x) / (baseScale * zoom),
      yM: (point.y - originY - pan.y) / (baseScale * zoom),
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

    if (tool === 'draw' && project.shape === 'freeform') {
      const raw = modelPoint(event);
      const point = { xM: Math.max(0, raw.xM), yM: Math.max(0, raw.yM) };
      setDrawPoints((current) => {
        if (!orthogonalMode || current.length === 0) return [...current, point];
        const previous = current[current.length - 1];
        const dx = Math.abs(point.xM - previous.xM);
        const dy = Math.abs(point.yM - previous.yM);
        const snapped = dx >= dy
          ? { xM: point.xM, yM: previous.yM }
          : { xM: previous.xM, yM: point.yM };
        return [...current, snapped];
      });
      setEditorMessage(null);
      return;
    }

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
    if (tool !== 'select') return;
    event.stopPropagation();
    if (orthogonalMode) {
      setEditorMessage('Mode 90° actif : modifiez les longueurs des côtés ou désactivez ce mode pour déplacer librement un sommet.');
      return;
    }
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

  const beginDrawing = () => {
    onBeginEdit();
    setDrawPoints([]);
    setEditorMessage('Cliquez successivement sur le plan pour créer les sommets A, B, C…');
    setTool('draw');
    setSelectedObstacleId(null);
    setSelectedVertexIndex(null);
  };

  const finishDrawing = () => {
    if (drawPoints.length < 3) {
      setEditorMessage('Ajoutez au moins trois sommets avant de fermer le contour.');
      return;
    }
    if (!isSimplePolygon(drawPoints)) {
      setEditorMessage('Le contour dessiné se croise ou n’est pas valide. Corrigez le dessin avant de le valider.');
      return;
    }
    if (orthogonalMode && !isOrthogonalPolygon(drawPoints)) {
      setEditorMessage('Mode 90° : le dernier côté doit lui aussi être horizontal ou vertical. Ajoutez un sommet pour fermer le contour sans angle inventé.');
      return;
    }
    onChange({ ...project, freeformPoints: drawPoints.map((point) => ({ ...point })) });
    setDrawPoints([]);
    setTool('select');
    setEditorMessage(null);
  };

  const cancelDrawing = () => {
    setDrawPoints([]);
    setTool('select');
    setEditorMessage(null);
  };

  const setEdgeLength = (edgeIndex: number, rawValue: string) => {
    const target = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(target) || target < 0.05) {
      setEditorMessage('La longueur du côté doit être au moins de 0,05 m.');
      return;
    }
    const current = project.freeformPoints ?? [];
    if (orthogonalMode && !isOrthogonalPolygon(current)) {
      setEditorMessage('Le contour actuel contient des côtés inclinés. Désactivez le mode 90° pour modifier cette cote sans inventer d’angle.');
      return;
    }
    const next = orthogonalMode
      ? resizeOrthogonalFreeformEdge(current, edgeIndex, target)
      : resizeFreeformEdge(current, edgeIndex, target);
    if (next === current || !isSimplePolygon(next)) {
      setEditorMessage('Cette cote créerait un contour invalide ou croisé. La modification est refusée.');
      return;
    }
    onBeginEdit();
    onChange({ ...project, freeformPoints: next });
    setEditorMessage(null);
  };

  const setReference = (file?: File) => {
    if (referenceImageUrl) URL.revokeObjectURL(referenceImageUrl);
    setReferenceImageUrl(file ? URL.createObjectURL(file) : null);
  };

  const gridX = Array.from({ length: Math.floor(bounds.lengthM / 0.5) + 1 }, (_, index) => index * 0.5);
  const gridY = Array.from({ length: Math.floor(bounds.widthM / 0.5) + 1 }, (_, index) => index * 0.5);
  const outlinePoints = outline.map((point) => `${point.x * baseScale},${point.y * baseScale}`).join(' ');
  const draftPolyline = drawPoints.map((point) => `${point.xM * baseScale},${point.yM * baseScale}`).join(' ');

  return (
    <section className="interactive-editor">
      <div className="editor-toolbar">
        <div className="editor-tool-group">
          <button type="button" className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')}>Sélection</button>
          <button type="button" className={tool === 'pan' ? 'active' : ''} onClick={() => setTool('pan')}>Déplacer le plan</button>
          {project.shape === 'freeform' && <button type="button" className={tool === 'draw' ? 'active' : ''} onClick={beginDrawing}>Dessiner un nouveau contour</button>}
          {project.shape === 'freeform' && (
            <button type="button" className={orthogonalMode ? 'active' : ''} onClick={() => setOrthogonalMode((value) => !value)}>
              Angles à 90° {orthogonalMode ? 'ON' : 'OFF'}
            </button>
          )}
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
          {tool === 'draw' ? (
            <>
              <button type="button" disabled={drawPoints.length < 3} onClick={finishDrawing}>Fermer et utiliser ce contour</button>
              <button type="button" onClick={cancelDrawing}>Annuler le dessin</button>
              <span>{drawPoints.length} sommet{drawPoints.length > 1 ? 's' : ''} placé{drawPoints.length > 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <button type="button" onClick={addVertex}>+ Ajouter un sommet</button>
              <button type="button" disabled={selectedVertexIndex == null || (project.freeformPoints?.length ?? 0) <= 3} onClick={deleteVertex}>Supprimer le sommet</button>
              <span>{project.freeformPoints?.length ?? 0} sommets</span>
            </>
          )}
        </div>
      )}

      {editorMessage && <div className="editor-message">{editorMessage}</div>}

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

          {outline.length >= 3 && tool !== 'draw' && (
            <polygon points={outlinePoints} className="editor-deck-shape" />
          )}

          {tool === 'draw' && drawPoints.length > 0 && (
            <g className="draw-freeform-preview">
              <polyline points={draftPolyline} fill="none" />
              {drawPoints.map((point, index) => (
                <g key={index}>
                  <circle cx={point.xM * baseScale} cy={point.yM * baseScale} r={5 / zoom} />
                  <text x={point.xM * baseScale + 7 / zoom} y={point.yM * baseScale - 7 / zoom}>{vertexLabel(index)}</text>
                </g>
              ))}
            </g>
          )}

          {tool !== 'draw' && (
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
          )}

          {tool !== 'draw' && project.shape === 'freeform' && (project.freeformPoints ?? []).map((point, index) => {
            const points = project.freeformPoints ?? [];
            const next = points[(index + 1) % points.length];
            const length = edgeLengths[index] ?? 0;
            const mx = ((point.xM + next.xM) / 2) * baseScale;
            const my = ((point.yM + next.yM) / 2) * baseScale;
            const label = `${vertexLabel(index)}${vertexLabel((index + 1) % points.length)}`;
            return (
              <g key={index}>
                <foreignObject
                  x={mx - 34 / zoom}
                  y={my - 15 / zoom}
                  width={68 / zoom}
                  height={28 / zoom}
                  className="edge-dimension-editor"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <div className="edge-dimension-input-wrap">
                    <b>{label}</b>
                    <input
                      key={`${label}-${length.toFixed(3)}`}
                      type="number"
                      min="0.05"
                      step="0.01"
                      defaultValue={length.toFixed(2)}
                      aria-label={`Longueur ${label} en mètres`}
                      onBlur={(event) => setEdgeLength(index, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                      }}
                    />
                    <span>m</span>
                  </div>
                </foreignObject>
                <circle
                  cx={point.xM * baseScale}
                  cy={point.yM * baseScale}
                  r={selectedVertexIndex === index ? 8 / zoom : 6 / zoom}
                  className={selectedVertexIndex === index ? 'vertex-handle selected' : 'vertex-handle'}
                  onPointerDown={(event) => startVertexMove(event, index)}
                />
                <text className="vertex-index" x={point.xM * baseScale + 8 / zoom} y={point.yM * baseScale - 8 / zoom} pointerEvents="none">{vertexLabel(index)}</text>
              </g>
            );
          })}

          {tool !== 'draw' && project.obstacles.map((obstacle) => {
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

          {tool !== 'draw' && selectedObstacle && (
            <g className="obstacle-distance-guides" pointerEvents="none">
              <line x1="0" y1={selectedObstacle.yM * baseScale} x2={selectedObstacle.xM * baseScale} y2={selectedObstacle.yM * baseScale} />
              <text x={(selectedObstacle.xM * baseScale) / 2} y={selectedObstacle.yM * baseScale - 5 / zoom}>X {selectedObstacle.xM.toFixed(2)} m</text>
              <line x1={selectedObstacle.xM * baseScale} y1="0" x2={selectedObstacle.xM * baseScale} y2={selectedObstacle.yM * baseScale} />
              <text x={selectedObstacle.xM * baseScale + 5 / zoom} y={(selectedObstacle.yM * baseScale) / 2}>Y {selectedObstacle.yM.toFixed(2)} m</text>
            </g>
          )}
        </g>
      </svg>

      <div className="editor-help">
        <span>Une réservation peut dépasser du contour de la terrasse : seule la partie en intersection impacte les calculs.</span>
        <span>Glissez une réservation pour la déplacer et utilisez la poignée ronde pour la redimensionner.</span>
        {project.shape === 'freeform' && <span>Modifiez les cotes directement sur le plan ou dessinez un nouveau contour point par point. Le mode 90° aligne les nouveaux côtés horizontalement/verticalement et verrouille le déplacement libre des sommets.</span>}
      </div>
    </section>
  );
}