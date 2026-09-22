import { useEffect, useMemo, useState } from 'react';
import type { ProjectInput, ShapeType, TerraceObstacle } from '../domain/types';
import { defaultFreeformPoints } from '../editor/interactiveGeometry';
import { InteractivePlanEditor } from './InteractivePlanEditor';

type Props = {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
};

type Draft = {
  kind: TerraceObstacle['kind'];
  label: string;
  shape: TerraceObstacle['shape'];
  x: string;
  y: string;
  width: string;
  height: string;
  diameter: string;
};

const emptyDraft: Draft = {
  kind: 'pool',
  label: 'Piscine',
  shape: 'rectangle',
  x: '',
  y: '',
  width: '',
  height: '',
  diameter: '',
};

const shapeOptions: Array<{ value: ShapeType; title: string; subtitle: string }> = [
  { value: 'rectangle', title: 'Rectangle', subtitle: 'Forme simple' },
  { value: 'l-shape', title: 'Forme en L', subtitle: 'Un décroché' },
  { value: 't-shape', title: 'Forme en T', subtitle: 'Une avancée centrale' },
  { value: 'u-shape', title: 'Forme en U', subtitle: 'Une ouverture centrale' },
  { value: 'circle', title: 'Cercle', subtitle: 'Terrasse ronde' },
  { value: 'freeform', title: 'Forme libre', subtitle: 'Sommets déplaçables' },
];

const obstaclePresets: Array<{ kind: TerraceObstacle['kind']; label: string; shape: TerraceObstacle['shape'] }> = [
  { kind: 'pool', label: 'Piscine', shape: 'rectangle' },
  { kind: 'tree', label: 'Arbre', shape: 'circle' },
  { kind: 'post', label: 'Poteau', shape: 'circle' },
  { kind: 'manhole', label: 'Regard', shape: 'rectangle' },
  { kind: 'other', label: 'Autre réservation', shape: 'rectangle' },
];

const numberOrZero = (value: string) => Number(value.replace(',', '.')) || 0;

export function GeometryEditor({ project, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [undoStack, setUndoStack] = useState<ProjectInput[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectInput[]>([]);
  const g = project.dimensions;

  const commit = (next: ProjectInput) => {
    setUndoStack((current) => [...current, project].slice(-60));
    setRedoStack([]);
    onChange(next);
  };

  const beginInteractiveEdit = () => {
    setUndoStack((current) => [...current, project].slice(-60));
    setRedoStack([]);
  };

  const undo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [project, ...current].slice(0, 60));
    onChange(previous);
  };

  const redo = () => {
    const next = redoStack[0];
    if (!next) return;
    setRedoStack((current) => current.slice(1));
    setUndoStack((current) => [...current, project].slice(-60));
    onChange(next);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;

      if (event.key.toLowerCase() === 'z' && event.shiftKey) {
        if (redoStack.length) {
          event.preventDefault();
          redo();
        }
        return;
      }

      if (event.key.toLowerCase() === 'z') {
        if (undoStack.length) {
          event.preventDefault();
          undo();
        }
        return;
      }

      if (event.key.toLowerCase() === 'y' && redoStack.length) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, undoStack, redoStack]);

  const patchDimensions = (key: keyof ProjectInput['dimensions'], value: number) => {
    commit({ ...project, dimensions: { ...project.dimensions, [key]: value } });
  };

  const switchShape = (shape: ShapeType) => {
    if (shape === 'freeform') {
      commit({
        ...project,
        shape,
        freeformPoints: defaultFreeformPoints(project),
      });
      return;
    }
    commit({ ...project, shape });
  };

  const updateObstacle = (id: string, patch: Partial<TerraceObstacle>) => {
    commit({
      ...project,
      obstacles: project.obstacles.map((obstacle) => obstacle.id === id ? { ...obstacle, ...patch } : obstacle),
    });
  };

  const removeObstacle = (id: string) => {
    commit({ ...project, obstacles: project.obstacles.filter((obstacle) => obstacle.id !== id) });
  };

  const canAdd = useMemo(() => {
    if (!draft.label.trim() || numberOrZero(draft.x) < 0 || numberOrZero(draft.y) < 0) return false;
    if (draft.shape === 'circle') return numberOrZero(draft.diameter) > 0;
    return numberOrZero(draft.width) > 0 && numberOrZero(draft.height) > 0;
  }, [draft]);

  const addObstacle = () => {
    if (!canAdd) return;
    const id = `OBS-${Date.now()}-${project.obstacles.length + 1}`;
    const obstacle: TerraceObstacle = {
      id,
      kind: draft.kind,
      label: draft.label.trim(),
      shape: draft.shape,
      xM: numberOrZero(draft.x),
      yM: numberOrZero(draft.y),
      ...(draft.shape === 'circle'
        ? { diameterM: numberOrZero(draft.diameter) }
        : { widthM: numberOrZero(draft.width), heightM: numberOrZero(draft.height) }),
    };
    commit({ ...project, obstacles: [...project.obstacles, obstacle] });
    setDraft({ ...emptyDraft });
  };

  return (
    <div className="geometry-editor">
      <div className="section-heading">
        <span className="section-number">1</span>
        <div>
          <h2>Dessinez votre terrasse</h2>
          <p>Saisissez les cotes ou modifiez directement le plan. Les calculs se mettent à jour avec la géométrie réelle.</p>
        </div>
      </div>

      <label className="single-field project-name-field">Nom du projet
        <div className="input-unit">
          <input value={project.projectName} maxLength={80} onChange={(event) => commit({ ...project, projectName: event.target.value })} />
        </div>
        <small>Ce nom sera repris dans le PDF et le lien partagé.</small>
      </label>

      <div className="shape-selector shape-selector-v15">
        {shapeOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`shape-card ${project.shape === option.value ? 'active' : ''}`}
            onClick={() => switchShape(option.value)}
          >
            <span>{project.shape === option.value ? '✓' : ''}</span>
            <strong>{option.title}</strong>
            <small>{option.subtitle}</small>
          </button>
        ))}
      </div>

      {project.shape === 'freeform' ? (
        <div className="soft-panel geometry-subpanel freeform-intro">
          <h3>Contour libre</h3>
          <p>Déplacez les sommets numérotés sur le plan, ajoutez-en ou supprimez-en. Les longueurs des arêtes sont recalculées en direct.</p>
        </div>
      ) : project.shape === 'circle' ? (
        <div className="form-grid geometry-fields">
          <label>Diamètre
            <div className="input-unit">
              <input type="number" min="0.1" step="0.1" value={g.circleDiameterM} onChange={(event) => patchDimensions('circleDiameterM', +event.target.value)} />
              <span>m</span>
            </div>
          </label>
        </div>
      ) : (
        <>
          <div className="form-grid geometry-fields">
            <label>Longueur totale
              <div className="input-unit">
                <input type="number" min="0.1" step="0.1" value={g.lengthM} onChange={(event) => patchDimensions('lengthM', +event.target.value)} />
                <span>m</span>
              </div>
            </label>
            <label>Largeur totale
              <div className="input-unit">
                <input type="number" min="0.1" step="0.1" value={g.widthM} onChange={(event) => patchDimensions('widthM', +event.target.value)} />
                <span>m</span>
              </div>
            </label>
          </div>

          {project.shape === 'l-shape' && (
            <div className="soft-panel geometry-subpanel">
              <h3>Décroché du L</h3>
              <div className="form-grid">
                <label>Longueur du décroché
                  <div className="input-unit">
                    <input type="number" min="0.1" step="0.1" value={g.notchLengthM} onChange={(event) => patchDimensions('notchLengthM', +event.target.value)} />
                    <span>m</span>
                  </div>
                </label>
                <label>Largeur du décroché
                  <div className="input-unit">
                    <input type="number" min="0.1" step="0.1" value={g.notchWidthM} onChange={(event) => patchDimensions('notchWidthM', +event.target.value)} />
                    <span>m</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {project.shape === 't-shape' && (
            <div className="soft-panel geometry-subpanel">
              <h3>Dimensions du T</h3>
              <div className="form-grid">
                <label>Largeur du pied central
                  <div className="input-unit">
                    <input type="number" min="0.1" step="0.1" value={g.tStemWidthM} onChange={(event) => patchDimensions('tStemWidthM', +event.target.value)} />
                    <span>m</span>
                  </div>
                </label>
                <label>Profondeur de la barre haute
                  <div className="input-unit">
                    <input type="number" min="0.1" step="0.1" value={g.tBarDepthM} onChange={(event) => patchDimensions('tBarDepthM', +event.target.value)} />
                    <span>m</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {project.shape === 'u-shape' && (
            <div className="soft-panel geometry-subpanel">
              <h3>Ouverture du U</h3>
              <div className="form-grid">
                <label>Largeur de l’ouverture
                  <div className="input-unit">
                    <input type="number" min="0.1" step="0.1" value={g.uOpeningWidthM} onChange={(event) => patchDimensions('uOpeningWidthM', +event.target.value)} />
                    <span>m</span>
                  </div>
                </label>
                <label>Profondeur de l’ouverture
                  <div className="input-unit">
                    <input type="number" min="0.1" step="0.1" value={g.uOpeningDepthM} onChange={(event) => patchDimensions('uOpeningDepthM', +event.target.value)} />
                    <span>m</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </>
      )}

      <InteractivePlanEditor
        project={project}
        onChange={onChange}
        onBeginEdit={beginInteractiveEdit}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="obstacle-section">
        <div className="obstacle-heading">
          <div>
            <h3>Zones à exclure</h3>
            <p>Piscine, arbre, poteau, regard… Déplacez-les directement sur le plan ou ajustez précisément les valeurs ci-dessous.</p>
          </div>
          <span>{project.obstacles.length} réservation{project.obstacles.length > 1 ? 's' : ''}</span>
        </div>

        {project.obstacles.length > 0 && (
          <div className="obstacle-list">
            {project.obstacles.map((obstacle, index) => (
              <article className="obstacle-card" key={obstacle.id}>
                <div className="obstacle-card-head">
                  <strong>{obstacle.label}</strong>
                  <button type="button" onClick={() => removeObstacle(obstacle.id)}>Supprimer</button>
                </div>
                <div className="obstacle-edit-grid">
                  <label>Nom
                    <input value={obstacle.label} onChange={(event) => updateObstacle(obstacle.id, { label: event.target.value })} />
                  </label>
                  <label>Distance depuis la gauche
                    <input type="number" min="0" step="0.1" value={obstacle.xM} onChange={(event) => updateObstacle(obstacle.id, { xM: +event.target.value })} />
                    <span>m</span>
                  </label>
                  <label>Distance depuis le haut
                    <input type="number" min="0" step="0.1" value={obstacle.yM} onChange={(event) => updateObstacle(obstacle.id, { yM: +event.target.value })} />
                    <span>m</span>
                  </label>
                  {obstacle.shape === 'circle' ? (
                    <label>Diamètre
                      <input type="number" min="0.05" step="0.05" value={obstacle.diameterM ?? 0} onChange={(event) => updateObstacle(obstacle.id, { diameterM: +event.target.value })} />
                      <span>m</span>
                    </label>
                  ) : (
                    <>
                      <label>Longueur
                        <input type="number" min="0.05" step="0.05" value={obstacle.widthM ?? 0} onChange={(event) => updateObstacle(obstacle.id, { widthM: +event.target.value })} />
                        <span>m</span>
                      </label>
                      <label>Largeur
                        <input type="number" min="0.05" step="0.05" value={obstacle.heightM ?? 0} onChange={(event) => updateObstacle(obstacle.id, { heightM: +event.target.value })} />
                        <span>m</span>
                      </label>
                    </>
                  )}
                </div>
                <small className="obstacle-index">Réservation {index + 1} • {obstacle.shape === 'circle' ? 'circulaire' : 'rectangulaire'}</small>
              </article>
            ))}
          </div>
        )}

        <div className="obstacle-builder">
          <h4>Ajouter une réservation</h4>
          <div className="obstacle-presets">
            {obstaclePresets.map((preset) => (
              <button
                type="button"
                key={preset.kind}
                className={draft.kind === preset.kind ? 'active' : ''}
                onClick={() => setDraft({ ...emptyDraft, kind: preset.kind, label: preset.label, shape: preset.shape })}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="obstacle-draft-grid">
            <label>Nom<input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
            <label>Depuis la gauche<input type="number" min="0" step="0.1" value={draft.x} onChange={(event) => setDraft({ ...draft, x: event.target.value })} /><span>m</span></label>
            <label>Depuis le haut<input type="number" min="0" step="0.1" value={draft.y} onChange={(event) => setDraft({ ...draft, y: event.target.value })} /><span>m</span></label>
            {draft.shape === 'circle' ? (
              <label>Diamètre<input type="number" min="0.05" step="0.05" value={draft.diameter} onChange={(event) => setDraft({ ...draft, diameter: event.target.value })} /><span>m</span></label>
            ) : (
              <>
                <label>Longueur<input type="number" min="0.05" step="0.05" value={draft.width} onChange={(event) => setDraft({ ...draft, width: event.target.value })} /><span>m</span></label>
                <label>Largeur<input type="number" min="0.05" step="0.05" value={draft.height} onChange={(event) => setDraft({ ...draft, height: event.target.value })} /><span>m</span></label>
              </>
            )}
          </div>
          <button type="button" className="add-obstacle-button" disabled={!canAdd} onClick={addObstacle}>Ajouter au plan</button>
          <small>Les réservations doivent rester entièrement à l’intérieur de la terrasse et ne pas se chevaucher.</small>
        </div>
      </div>
    </div>
  );
}
