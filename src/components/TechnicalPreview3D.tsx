import { useEffect, useMemo, useRef, useState } from 'react';
import type { BasketResult, LayoutResult, ProjectInput, SupportPlanResult } from '../domain/types';
import { buildProfessional3DScene, type Scene3DBoard, type Scene3DPoint } from '../engine/scene3d';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';
import { resolveBoardTexture, textureStatusLabel } from '../visual/resolveBoardTexture';
import { resolveMaterialProfile } from '../visual/materialProfiles';
import { findBoard } from '../catalog/compatibility';

type Projected = { x: number; y: number; depth: number };

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((part) => part + part).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const parsed = Number.parseInt(value, 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, Math.min(255, Math.round(r * factor)))}, ${Math.max(0, Math.min(255, Math.round(g * factor)))}, ${Math.max(0, Math.min(255, Math.round(b * factor)))})`;
}

function obstacleColor(kind: ProjectInput['obstacles'][number]['kind']) {
  if (kind === 'pool') return '#8fd3ef';
  if (kind === 'tree') return '#93bd83';
  if (kind === 'post') return '#9ca4aa';
  if (kind === 'manhole') return '#afb8be';
  return '#d9dfe3';
}

export function TechnicalPreview3D({
  input,
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
  const [azimuthDeg, setAzimuthDeg] = useState(35);
  const clientRender = false;
  const scene = useMemo(() => buildProfessional3DScene(input, layout, supportPlan), [input, layout, supportPlan]);
  const texture = resolveBoardTexture(input.board);
  const materialProfile = resolveMaterialProfile(input.board);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 760;
    const height = 470;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const angle = azimuthDeg * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const cx = (scene.bounds.minXM + scene.bounds.maxXM) / 2;
    const cy = (scene.bounds.minYM + scene.bounds.maxYM) / 2;
    const rotated = [
      { x: scene.bounds.minXM, y: scene.bounds.minYM },
      { x: scene.bounds.maxXM, y: scene.bounds.minYM },
      { x: scene.bounds.maxXM, y: scene.bounds.maxYM },
      { x: scene.bounds.minXM, y: scene.bounds.maxYM },
    ].map((point) => ({
      x: (point.x - cx) * cos - (point.y - cy) * sin,
      y: (point.x - cx) * sin + (point.y - cy) * cos,
    }));
    const minRX = Math.min(...rotated.map((point) => point.x));
    const maxRX = Math.max(...rotated.map((point) => point.x));
    const minRY = Math.min(...rotated.map((point) => point.y));
    const maxRY = Math.max(...rotated.map((point) => point.y));
    const spanX = Math.max(.5, maxRX - minRX);
    const spanY = Math.max(.5, maxRY - minRY);
    const verticalSpan = Math.max(.25, scene.bounds.maxZM - scene.bounds.minZM);
    const scale = Math.min(560 / spanX, 265 / (spanY * .48 + verticalSpan * 1.05));
    const centerX = width / 2;
    const centerY = clientRender ? 236 : 216;
    const zScale = scale * .88;

    const project = (point: Scene3DPoint, zOffsetM = 0): Projected => {
      const dx = point.xM - cx;
      const dy = point.yM - cy;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      const z = point.zM + zOffsetM;
      return {
        x: centerX + rx * scale,
        y: centerY + ry * scale * .48 - z * zScale,
        depth: ry + z * .1,
      };
    };

    const polygon = (
      points: Scene3DPoint[],
      fill: string | CanvasPattern,
      stroke: string,
      lineWidth = 1,
      zOffsetM = 0,
      alpha = 1,
    ) => {
      const screen = points.map((point) => project(point, zOffsetM));
      if (!screen.length) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(screen[0].x, screen[0].y);
      for (let index = 1; index < screen.length; index += 1) ctx.lineTo(screen[index].x, screen[index].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    };

    const line = (a: Scene3DPoint, b: Scene3DPoint, color: string, lineWidth: number, zOffsetM = 0) => {
      const pa = project(a, zOffsetM);
      const pb = project(b, zOffsetM);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    };

    const drawEnvironment = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, clientRender ? '#eef8fd' : '#f4f7f9');
      sky.addColorStop(.58, clientRender ? '#fbfdfe' : '#ffffff');
      sky.addColorStop(1, '#f4f1e8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      if (clientRender) {
        ctx.fillStyle = 'rgba(255,255,255,.72)';
        ctx.beginPath();
        ctx.ellipse(615, 76, 58, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(575, 86, 42, 17, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const margin = 1.1;
      const groundZ = scene.bounds.minZM - .03;
      const ground = [
        { xM: scene.bounds.minXM - margin, yM: scene.bounds.minYM - margin, zM: groundZ },
        { xM: scene.bounds.maxXM + margin, yM: scene.bounds.minYM - margin, zM: groundZ },
        { xM: scene.bounds.maxXM + margin, yM: scene.bounds.maxYM + margin, zM: groundZ },
        { xM: scene.bounds.minXM - margin, yM: scene.bounds.maxYM + margin, zM: groundZ },
      ];
      polygon(ground, clientRender ? '#e8e3d4' : '#edf1f3', clientRender ? '#d0c8b5' : '#d9e0e4', 1);

      const shadow = scene.deckOutline.map((point) => ({ ...point, zM: groundZ + .006 }));
      polygon(shadow, 'rgba(37,48,58,.12)', 'transparent', 0, 0, .9);
    };

    const deckOffset = exploded ? .34 : 0;
    const joistOffset = exploded ? .13 : 0;
    const supportOffset = exploded ? -.04 : 0;

    const drawSupport = (support: typeof scene.supports[number]) => {
      if (!layers.plots) return;
      const bottom = { xM: support.xM, yM: support.yM, zM: support.bottomZM };
      const top = { xM: support.xM, yM: support.yM, zM: support.topZM };
      line(bottom, top, support.status === 'unsupported' ? '#b54c47' : '#56636d', support.multiplicity === 2 ? 4.6 : 3.2, supportOffset);
      const p = project(bottom, supportOffset);
      ctx.fillStyle = support.status === 'unsupported' ? '#b54c47' : '#303d46';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 5.2, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawJoist = (joist: typeof scene.joists[number]) => {
      if (!layers.joists) return;
      const color = joist.role === 'perimeter'
        ? '#315d7a'
        : joist.role === 'zone-boundary'
          ? '#2b7499'
          : joist.multiplicity === 2
            ? '#8a552e'
            : '#674a32';
      line(joist.start, joist.end, shade(color, .72), joist.multiplicity === 2 ? 11 : 8, joistOffset);
      line(
        { ...joist.start, zM: joist.start.zM + joist.heightM * .22 },
        { ...joist.end, zM: joist.end.zM + joist.heightM * .22 },
        shade(color, 1.18),
        joist.multiplicity === 2 ? 5 : 3.6,
        joistOffset,
      );
    };

    const boardDepth = (board: Scene3DBoard) =>
      board.top.reduce((sum, point) => sum + project(point, deckOffset).depth, 0) / board.top.length;

    const drawBoard = (board: Scene3DBoard, photo?: HTMLImageElement) => {
      if (!layers.decking) return;
      const p0 = board.bottom[0];
      const p1 = board.bottom[1];
      const p2 = board.bottom[2];
      const p3 = board.bottom[3];
      polygon([p1, p2, board.top[2], board.top[1]], shade(board.baseColor, .68), shade(board.grainColor, .78), .55, deckOffset);
      polygon([p2, p3, board.top[3], board.top[2]], shade(board.baseColor, .78), shade(board.grainColor, .84), .55, deckOffset);

      let fill: string | CanvasPattern = board.baseColor;
      if (photo && board.boardId === input.board.id) {
        const pattern = ctx.createPattern(photo, 'repeat');
        if (pattern) fill = pattern;
      }
      polygon(board.top, fill, shade(board.grainColor, .84), .72, deckOffset);

      const startMid = {
        xM: (board.top[0].xM + board.top[1].xM) / 2,
        yM: (board.top[0].yM + board.top[1].yM) / 2,
        zM: (board.top[0].zM + board.top[1].zM) / 2 + .0008,
      };
      const endMid = {
        xM: (board.top[2].xM + board.top[3].xM) / 2,
        yM: (board.top[2].yM + board.top[3].yM) / 2,
        zM: (board.top[2].zM + board.top[3].zM) / 2 + .0008,
      };
      line(startMid, endMid, photo && board.boardId === input.board.id ? 'rgba(61,45,31,.25)' : shade(board.grainColor, 1.05), .48, deckOffset);

      if (materialProfile && board.boardId === input.board.id && materialProfile.grooveBands.length) {
        for (const band of materialProfile.grooveBands) {
          const count = Math.max(1, band.count);
          for (let i = 0; i < count; i += Math.max(1, Math.ceil(count / 5))) {
            const ratio = band.startRatio + (band.endRatio - band.startRatio) * ((i + .5) / count);
            const left = board.top[0];
            const right = board.top[1];
            const endRight = board.top[2];
            const endLeft = board.top[3];
            const a = {
              xM: left.xM + (right.xM - left.xM) * ratio,
              yM: left.yM + (right.yM - left.yM) * ratio,
              zM: left.zM + .001,
            };
            const b = {
              xM: endLeft.xM + (endRight.xM - endLeft.xM) * ratio,
              yM: endLeft.yM + (endRight.yM - endLeft.yM) * ratio,
              zM: endLeft.zM + .001,
            };
            line(a, b, 'rgba(46,34,24,.42)', .42, deckOffset);
          }
        }
      }
    };

    const drawStairs = (photo?: HTMLImageElement) => {
      for (const stair of scene.stairs) {
        const stairBoard = findBoard(stair.boardId) ?? input.board;
        const thicknessM = stairBoard.thicknessMm / 1000;
        if (layers.joists) {
          for (const axis of stair.structureAxes) {
            line(axis.start, axis.end, '#58412f', 8, joistOffset);
            line(
              { ...axis.start, zM: axis.start.zM + .015 },
              { ...axis.end, zM: axis.end.zM + .015 },
              '#8d6749',
              3.2,
              joistOffset,
            );
          }
        }

        if (!layers.decking) continue;
        for (const tread of stair.treads) {
          const bottom = tread.top.map((point) => ({ ...point, zM: point.zM - thicknessM })) as typeof tread.top;
          const baseColor = stairBoard.visual?.baseColor ?? '#d8c3a4';
          const grainColor = stairBoard.visual?.grainColor ?? '#8f775d';
          polygon([bottom[1], bottom[2], tread.top[2], tread.top[1]], shade(baseColor, .68), shade(grainColor, .78), .6, deckOffset);
          polygon([bottom[2], bottom[3], tread.top[3], tread.top[2]], shade(baseColor, .76), shade(grainColor, .82), .6, deckOffset);

          let fill: string | CanvasPattern = baseColor;
          if (photo && stairBoard.id === input.board.id) {
            const pattern = ctx.createPattern(photo, 'repeat');
            if (pattern) fill = pattern;
          }
          polygon(tread.top, fill, shade(grainColor, .82), .8, deckOffset);
        }
      }
    };

    const drawGuardrails = () => {
      if (!layers.edgeCladding) return;
      for (const guardrail of scene.guardrails) {
        const postWidthPx = guardrail.postSectionWidthMm != null
          ? Math.max(2.2, guardrail.postSectionWidthMm / 1000 * scale)
          : 2.2;
        for (const post of guardrail.posts) {
          line(post.base, post.top, '#344956', postWidthPx, deckOffset);
          line(
            { ...post.base, zM: post.base.zM + .006 },
            { ...post.top, zM: post.top.zM + .006 },
            '#6d8492',
            Math.max(1, postWidthPx * .35),
            deckOffset,
          );
        }
        for (const section of guardrail.sections) {
          line(section.startTop, section.endTop, '#304b5c', Math.max(2.4, postWidthPx * .85), deckOffset);
        }
      }
    };

    const drawEdges = () => {
      if (!layers.edgeCladding) return;
      for (const edge of scene.edges) {
        if (edge.treatment === 'none' || edge.curved) continue;
        const bottomA = { ...edge.start, zM: edge.start.zM - edge.heightM };
        const bottomB = { ...edge.end, zM: edge.end.zM - edge.heightM };
        const color = edge.treatment === 'cladding' ? '#9f7954'
          : edge.treatment === 'profile' ? '#735392'
            : edge.treatment === 'drainage' ? '#2d7d76'
              : '#7d5635';
        polygon([bottomA, bottomB, edge.end, edge.start], shade(color, .9), shade(color, .65), 1, deckOffset);
      }
    };

    const drawObstacles = () => {
      if (!layers.obstacles) return;
      for (const obstacle of scene.obstacles) {
        const color = obstacleColor(obstacle.kind);
        if (obstacle.shape === 'circle') {
          const r = (obstacle.diameterM ?? 0) / 2;
          const cxM = obstacle.xM + r;
          const cyM = obstacle.yM + r;
          const points = Array.from({ length: 32 }, (_, index) => {
            const a = Math.PI * 2 * index / 32;
            return { xM: cxM + Math.cos(a) * r, yM: cyM + Math.sin(a) * r, zM: obstacle.topZM + .003 };
          });
          polygon(points, color, shade(color, .72), 1, deckOffset);
          if (obstacle.kind === 'tree') {
            const base = { xM: cxM, yM: cyM, zM: obstacle.topZM };
            const trunk = { xM: cxM, yM: cyM, zM: obstacle.topZM + .9 };
            line(base, trunk, '#76543b', 7, deckOffset);
            const crown = project({ xM: cxM, yM: cyM, zM: obstacle.topZM + 1.12 }, deckOffset);
            ctx.fillStyle = '#78a96e';
            ctx.beginPath();
            ctx.ellipse(crown.x, crown.y, 25, 16, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const z = obstacle.kind === 'pool' ? obstacle.topZM - .025 : obstacle.topZM + .004;
          const rect = [
            { xM: obstacle.xM, yM: obstacle.yM, zM: z },
            { xM: obstacle.xM + obstacle.widthM, yM: obstacle.yM, zM: z },
            { xM: obstacle.xM + obstacle.widthM, yM: obstacle.yM + obstacle.heightM, zM: z },
            { xM: obstacle.xM, yM: obstacle.yM + obstacle.heightM, zM: z },
          ];
          polygon(rect, color, shade(color, .72), 1, deckOffset);
          if (obstacle.kind === 'post') {
            const cxM = obstacle.xM + obstacle.widthM / 2;
            const cyM = obstacle.yM + obstacle.heightM / 2;
            line({ xM: cxM, yM: cyM, zM: z }, { xM: cxM, yM: cyM, zM: z + .9 }, '#737b80', 7, deckOffset);
          }
        }
      }
    };

    const paint = (photo?: HTMLImageElement) => {
      ctx.clearRect(0, 0, width, height);
      drawEnvironment();

      [...scene.supports].sort((a, b) => project({ xM: a.xM, yM: a.yM, zM: a.bottomZM }).depth - project({ xM: b.xM, yM: b.yM, zM: b.bottomZM }).depth).forEach(drawSupport);
      [...scene.joists].sort((a, b) => project(a.start).depth - project(b.start).depth).forEach(drawJoist);
      drawEdges();

      [...scene.boards]
        .sort((a, b) => boardDepth(a) - boardDepth(b))
        .forEach((board) => drawBoard(board, photo));

      drawStairs(photo);
      drawGuardrails();
      drawObstacles();

      const title = clientRender ? 'RENDU CLIENT' : 'VUE TECHNIQUE';
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.roundRect(18, 18, 112, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#173e65';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText(title, 31, 36);

      if (scene.diagnostics.length) {
        ctx.fillStyle = 'rgba(255,248,230,.94)';
        ctx.roundRect(18, height - 52, Math.min(520, width - 36), 34, 8);
        ctx.fill();
        ctx.fillStyle = '#75581b';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillText(scene.diagnostics[0].slice(0, 88), 30, height - 31);
      }
    };

    paint();
    if (texture.textureImageUrl && layers.decking) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => paint(image);
      image.onerror = () => paint();
      image.src = texture.textureImageUrl;
    }
  }, [azimuthDeg, clientRender, exploded, input, layers, layout, materialProfile, scene, supportPlan, texture.textureImageUrl]);

  return (
    <div className="visual-card professional-3d">
      <div className="visual-title">
        <span>3D professionnelle</span>
        <code>SA-TERR-3D-110</code>
      </div>

      <div className="preview3d-toolbar">
        <div className="technical-view-label">Vue technique — structure et contrôles</div>
        <div className="preview3d-camera">
          <button type="button" onClick={() => setAzimuthDeg((value) => value - 20)} aria-label="Tourner la vue à gauche">↺</button>
          <span>{azimuthDeg}°</span>
          <button type="button" onClick={() => setAzimuthDeg((value) => value + 20)} aria-label="Tourner la vue à droite">↻</button>
        </div>
      </div>

      <canvas ref={ref} />

      <div className="construction-legend">
        {layers.decking && <span><i className="legend-decking" />{scene.boards.length} lames / segments réels</span>}
        {layers.joists && <span><i className="legend-joist" />{scene.joists.length} lambourdes</span>}
        {layers.plots && <span><i className="legend-plot" />{scene.supports.length} points d’appui</span>}
        {layers.edgeCladding && scene.edges.some((edge) => edge.treatment !== 'none') && <span><i className="legend-edge" />Rives configurées</span>}
        {scene.terrain.platforms.length > 1 && <span className="terrain-3d-badge">{scene.terrain.platforms.length} plateformes • {scene.terrain.transitionCount} transition(s)</span>}
        {scene.stairs.length > 0 && <span className="terrain-3d-badge">{scene.stairs.length} escalier(s) • {scene.stairs.reduce((sum, stair) => sum + (stair.stepCount ?? 0), 0)} marche(s)</span>}
        {scene.guardrails.length > 0 && <span className="terrain-3d-badge">{scene.guardrails.length} garde-corps • {scene.guardrails.reduce((sum, guardrail) => sum + (guardrail.postCount ?? 0), 0)} poteau(x)</span>}
      </div>

      <div className={`texture-quality-note ${texture.status}`}>
        <strong>{textureStatusLabel(texture)}</strong>
        <span>{texture.label}</span>
        <small>La géométrie 3D provient directement des segments calculés par le moteur V1 ; aucune trame de lames fictive n’est reconstruite.</small>
      </div>
    </div>
  );
}
