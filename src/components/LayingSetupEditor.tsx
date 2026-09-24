import type {
  DeckLayingPattern,
  LayingDirection,
  LayingStart,
  LayingZone,
  ProjectInput,
  TerracePoint,
} from '../domain/types';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from '../engine/geometry';
import { vertexLabel } from '../editor/interactiveGeometry';
import { compatibleZoneBoards } from '../catalog/compatibility';

type Props = {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
};

const directionOptions: Array<{ value: LayingDirection; label: string; detail: string }> = [
  { value: 'length', label: 'Dans la longueur', detail: 'Lames parallèles à l’axe longueur.' },
  { value: 'width', label: 'Dans la largeur', detail: 'Lames parallèles à l’axe largeur.' },
  { value: 'diagonal-45', label: 'Diagonale +45°', detail: 'Intersection réelle avec le contour et les réservations.' },
  { value: 'diagonal--45', label: 'Diagonale −45°', detail: 'Intersection réelle dans le sens diagonal opposé.' },
];

const patternOptions: Array<{ value: DeckLayingPattern; label: string; detail: string }> = [
  { value: 'straight', label: 'Entière / droite', detail: 'Départ entier sur chaque rangée.' },
  { value: 'half', label: 'Décalage 1/2', detail: 'Cycle sur deux rangées.' },
  { value: 'third', label: 'Décalage 1/3', detail: 'Cycle entière, 2/3, 1/3.' },
];

const startOptions: Array<{ value: LayingStart; label: string }> = [
  { value: 'left', label: 'Gauche' },
  { value: 'right', label: 'Droite' },
  { value: 'top', label: 'Haut' },
  { value: 'bottom', label: 'Bas' },
  { value: 'edge', label: 'Rive choisie' },
];

function zoneBounds(zone: LayingZone) {
  const xs = zone.points.map((point) => point.xM);
  const ys = zone.points.map((point) => point.yM);
  return {
    xM: Math.min(...xs),
    yM: Math.min(...ys),
    widthM: Math.max(...xs) - Math.min(...xs),
    heightM: Math.max(...ys) - Math.min(...ys),
  };
}

function rectanglePoints(xM: number, yM: number, widthM: number, heightM: number): TerracePoint[] {
  return [
    { xM, yM },
    { xM: xM + widthM, yM },
    { xM: xM + widthM, yM: yM + heightM },
    { xM, yM: yM + heightM },
  ];
}

export function LayingSetupEditor({ project, onChange }: Props) {
  const outline = getDeckOutlinePointsM(project);
  const direction = project.layingDirection ?? project.orientation;
  const start = project.layingStart ?? 'left';
  const pattern = project.layingPattern ?? 'straight';
  const zones = project.layingZones ?? [];
  const zoneBoardOptions = compatibleZoneBoards(project.board);

  const setDirection = (value: LayingDirection) => {
    onChange({
      ...project,
      layingDirection: value,
      orientation: value === 'length' || value === 'width' ? value : project.orientation,
    });
  };

  const addZone = () => {
    const bounds = getDeckBoundingSizeM(project);
    const sizeX = Math.max(0.4, Math.min(1.5, bounds.lengthM * 0.32));
    const sizeY = Math.max(0.4, Math.min(1.5, bounds.widthM * 0.32));
    let xM = 0.2;
    let yM = 0.2;
    if (project.shape === 'circle') {
      xM = Math.max(0, (bounds.lengthM - sizeX) / 2);
      yM = Math.max(0, (bounds.widthM - sizeY) / 2);
    }
    const zone: LayingZone = {
      id: `ZONE-${Date.now()}`,
      label: `Zone ${zones.length + 2}`,
      points: rectanglePoints(xM, yM, sizeX, sizeY),
      direction: direction === 'length' ? 'width' : 'length',
      pattern,
      start: 'left',
    };
    onChange({ ...project, layingZones: [...zones, zone] });
  };

  const patchZone = (id: string, patch: Partial<LayingZone>) => {
    onChange({
      ...project,
      layingZones: zones.map((zone) => zone.id === id ? { ...zone, ...patch } : zone),
    });
  };

  const patchZoneRect = (zone: LayingZone, key: 'xM' | 'yM' | 'widthM' | 'heightM', value: number) => {
    const current = zoneBounds(zone);
    const next = { ...current, [key]: Number.isFinite(value) ? value : 0 };
    patchZone(zone.id, {
      points: rectanglePoints(
        next.xM,
        next.yM,
        Math.max(0.05, next.widthM),
        Math.max(0.05, next.heightM),
      ),
    });
  };

  const patchZonePoint = (zone: LayingZone, pointIndex: number, key: 'xM' | 'yM', value: number) => {
    const points = zone.points.map((point, index) => index === pointIndex
      ? { ...point, [key]: Number.isFinite(value) ? value : 0 }
      : point);
    patchZone(zone.id, { points });
  };

  const insertZonePoint = (zone: LayingZone, pointIndex: number) => {
    const a = zone.points[pointIndex];
    const b = zone.points[(pointIndex + 1) % zone.points.length];
    const next = [
      ...zone.points.slice(0, pointIndex + 1),
      { xM: (a.xM + b.xM) / 2, yM: (a.yM + b.yM) / 2 },
      ...zone.points.slice(pointIndex + 1),
    ];
    patchZone(zone.id, { points: next });
  };

  const removeZonePoint = (zone: LayingZone, pointIndex: number) => {
    if (zone.points.length <= 3) return;
    patchZone(zone.id, { points: zone.points.filter((_, index) => index !== pointIndex) });
  };

  const removeZone = (id: string) => {
    onChange({ ...project, layingZones: zones.filter((zone) => zone.id !== id) });
  };

  return (
    <div className="laying-setup">
      <div className="orientation-block">
        <h3>Dans quel sens souhaitez-vous poser les lames ?</h3>
        <div className="laying-direction-grid">
          {directionOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={direction === option.value ? 'active' : ''}
              onClick={() => setDirection(option.value)}
            >
              <span className={`direction-icon ${option.value}`}><i /><i /><i /><i /></span>
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="laying-pattern-block">
        <h3>Quel calepinage souhaitez-vous ?</h3>
        <p>Les raccords restent sur des axes globaux cohérents dans chaque zone.</p>
        <div className="laying-pattern-grid">
          {patternOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`choice-card ${pattern === option.value ? 'active' : ''}`}
              onClick={() => onChange({ ...project, layingPattern: option.value })}
            >
              <span className="choice-check">{pattern === option.value ? '✓' : ''}</span>
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="question-block laying-start-block">
        <h3>Depuis quel côté doit commencer le motif ?</h3>
        <p className="finish-help">Ce choix déplace réellement les raccords. Il ne retourne pas seulement le dessin.</p>
        <div className="laying-start-grid">
          {startOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={start === option.value ? 'active' : ''}
              onClick={() => onChange({ ...project, layingStart: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
        {start === 'edge' && (
          <label className="laying-edge-select">
            Rive de départ
            <select
              value={project.layingStartEdgeIndex ?? 0}
              onChange={(event) => onChange({ ...project, layingStartEdgeIndex: Number(event.target.value) })}
            >
              {outline.map((_, index) => (
                <option key={index} value={index}>
                  Rive {vertexLabel(index)}{vertexLabel((index + 1) % outline.length)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <details className="advanced-option laying-zones-option">
        <summary>
          <span><strong>Zones de pose supplémentaires</strong><small>Pour changer le sens, le motif ou le produit sur une partie de la terrasse.</small></span>
          <em>{zones.length ? `${zones.length} ajoutée${zones.length > 1 ? 's' : ''}` : 'Optionnel'}</em>
        </summary>
        <div className="advanced-option-body question-block laying-zones-block">
        <div className="zones-heading">
          <div>
            <h3>Zones de pose</h3>
            <p className="finish-help">La zone principale couvre tout ce qui n’est pas occupé par une zone ajoutée. Chaque zone peut changer de sens, motif et départ.</p>
          </div>
          <button type="button" className="ghost-button" onClick={addZone}>+ Ajouter une zone</button>
        </div>

        {zones.length === 0 && (
          <div className="zone-empty">Une seule zone utilise actuellement les réglages ci-dessus.</div>
        )}

        <div className="laying-zone-list">
          {zones.map((zone, zoneIndex) => {
            const rect = zoneBounds(zone);
            return (
              <article className="laying-zone-card" key={zone.id}>
                <div className="zone-card-heading">
                  <input
                    value={zone.label}
                    maxLength={40}
                    onChange={(event) => patchZone(zone.id, { label: event.target.value })}
                    aria-label={`Nom de la zone ${zoneIndex + 2}`}
                  />
                  <button type="button" onClick={() => removeZone(zone.id)}>Supprimer</button>
                </div>

                <div className="zone-rect-grid">
                  {([
                    ['xM', 'X', rect.xM],
                    ['yM', 'Y', rect.yM],
                    ['widthM', 'Largeur', rect.widthM],
                    ['heightM', 'Hauteur', rect.heightM],
                  ] as const).map(([key, label, value]) => (
                    <label key={key}>
                      {label}
                      <span><input type="number" step="0.05" value={Number(value.toFixed(2))} onChange={(event) => patchZoneRect(zone, key, Number(event.target.value))} /><em>m</em></span>
                    </label>
                  ))}
                </div>

                <div className="zone-settings-grid">
                  <label>Produit de lame
                    <select
                      value={zone.boardId ?? project.board.id}
                      onChange={(event) => patchZone(zone.id, { boardId: event.target.value === project.board.id ? undefined : event.target.value })}
                    >
                      {zoneBoardOptions.map((board) => (
                        <option key={board.id} value={board.id}>{board.label} — {board.subtitle}</option>
                      ))}
                    </select>
                    <small>Même système constructif uniquement. Les mélanges incompatibles sont bloqués.</small>
                  </label>
                  <label>Direction
                    <select value={zone.direction} onChange={(event) => patchZone(zone.id, { direction: event.target.value as LayingDirection })}>
                      {directionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Motif
                    <select value={zone.pattern} onChange={(event) => patchZone(zone.id, { pattern: event.target.value as DeckLayingPattern })}>
                      {patternOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Départ
                    <select value={zone.start} onChange={(event) => patchZone(zone.id, { start: event.target.value as LayingStart })}>
                      {startOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  {zone.start === 'edge' && (
                    <label>Rive de zone
                      <select value={zone.startEdgeIndex ?? 0} onChange={(event) => patchZone(zone.id, { startEdgeIndex: Number(event.target.value) })}>
                        {zone.points.map((_, index) => (
                          <option key={index} value={index}>Rive {vertexLabel(index)}{vertexLabel((index + 1) % zone.points.length)}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <details className="zone-points-editor">
                  <summary>Ajuster la forme de la zone — {zone.points.length} sommets</summary>
                  <div className="zone-point-list">
                    {zone.points.map((point, pointIndex) => (
                      <div className="zone-point-row" key={`${zone.id}-point-${pointIndex}`}>
                        <strong>{vertexLabel(pointIndex)}</strong>
                        <label>X
                          <span><input type="number" step="0.05" value={Number(point.xM.toFixed(2))} onChange={(event) => patchZonePoint(zone, pointIndex, 'xM', Number(event.target.value))} /><em>m</em></span>
                        </label>
                        <label>Y
                          <span><input type="number" step="0.05" value={Number(point.yM.toFixed(2))} onChange={(event) => patchZonePoint(zone, pointIndex, 'yM', Number(event.target.value))} /><em>m</em></span>
                        </label>
                        <button type="button" onClick={() => insertZonePoint(zone, pointIndex)}>+ sommet après</button>
                        <button type="button" className="danger" disabled={zone.points.length <= 3} onClick={() => removeZonePoint(zone, pointIndex)}>Retirer</button>
                      </div>
                    ))}
                  </div>
                  <small>Les zones peuvent être polygonales. Le moteur bloque les contours croisés, hors terrasse ou qui chevauchent une autre zone.</small>
                </details>
              </article>
            );
          })}
        </div>
      </div>
      </details>
    </div>
  );
}
