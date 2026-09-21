import { useMemo, useState } from 'react';
import type { ProjectInput, ShapeType, TerraceObstacle } from '../domain/types';

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
  const g = project.dimensions;

  const patchDimensions = (key: keyof ProjectInput['dimensions'], value: number) => {
    onChange({ ...project, dimensions: { ...project.dimensions, [key]: value } });
  };

  const updateObstacle = (id: string, patch: Partial<TerraceObstacle>) => {
    onChange({
      ...project,
      obstacles: project.obstacles.map((obstacle) => obstacle.id === id ? { ...obstacle, ...patch } : obstacle),
    });
  };

  const removeObstacle = (id: string) => {
    onChange({ ...project, obstacles: project.obstacles.filter((obstacle) => obstacle.id !== id) });
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
    onChange({ ...project, obstacles: [...project.obstacles, obstacle] });
    setDraft({ ...emptyDraft });
  };

  return (
    <div className="geometry-editor">
      <div className="section-heading">
        <span className="section-number">1</span>
        <div><h2>Dessinez simplement votre terrasse</h2><p>Choisissez une forme, saisissez les dimensions puis ajoutez les zones qui ne doivent pas recevoir de lames.</p></div>
      </div>

      <label className="single-field project-name-field">Nom du projet
        <div className="input-unit"><input value={project.projectName} maxLength={80} onChange={(e) => onChange({ ...project, projectName: e.target.value })} /></div>
        <small>Ce nom sera repris dans le PDF et le lien partagé.</small>
      </label>

      <div className="shape-selector">
        {shapeOptions.map((option) => (
          <button type="button" key={option.value} className={`shape-card ${project.shape === option.value ? 'active' : ''}`} onClick={() => onChange({ ...project, shape: option.value })}>
            <span>{project.shape === option.value ? '✓' : ''}</span>
            <strong>{option.title}</strong>
            <small>{option.subtitle}</small>
          </button>
        ))}
      </div>

      {project.shape === 'circle' ? (
        <div className="form-grid geometry-fields">
          <label>Diamètre <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.circleDiameterM} onChange={(e) => patchDimensions('circleDiameterM', +e.target.value)} /><span>m</span></div></label>
        </div>
      ) : (
        <>
          <div className="form-grid geometry-fields">
            <label>Longueur totale <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.lengthM} onChange={(e) => patchDimensions('lengthM', +e.target.value)} /><span>m</span></div></label>
            <label>Largeur totale <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.widthM} onChange={(e) => patchDimensions('widthM', +e.target.value)} /><span>m</span></div></label>
          </div>

          {project.shape === 'l-shape' && (
            <div className="soft-panel geometry-subpanel"><h3>Décroché du L</h3><div className="form-grid">
              <label>Longueur du décroché <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.notchLengthM} onChange={(e) => patchDimensions('notchLengthM', +e.target.value)} /><span>m</span></div></label>
              <label>Largeur du décroché <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.notchWidthM} onChange={(e) => patchDimensions('notchWidthM', +e.target.value)} /><span>m</span></div></label>
            </div></div>
          )}

          {project.shape === 't-shape' && (
            <div className="soft-panel geometry-subpanel"><h3>Dimensions du T</h3><div className="form-grid">
              <label>Largeur du pied central <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.tStemWidthM} onChange={(e) => patchDimensions('tStemWidthM', +e.target.value)} /><span>m</span></div></label>
              <label>Profondeur de la barre haute <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.tBarDepthM} onChange={(e) => patchDimensions('tBarDepthM', +e.target.value)} /><span>m</span></div></label>
            </div></div>
          )}

          {project.shape === 'u-shape' && (
            <div className="soft-panel geometry-subpanel"><h3>Ouverture du U</h3><div className="form-grid">
              <label>Largeur de l’ouverture <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.uOpeningWidthM} onChange={(e) => patchDimensions('uOpeningWidthM', +e.target.value)} /><span>m</span></div></label>
              <label>Profondeur de l’ouverture <div className="input-unit"><input type="number" min="0.1" step="0.1" value={g.uOpeningDepthM} onChange={(e) => patchDimensions('uOpeningDepthM', +e.target.value)} /><span>m</span></div></label>
            </div></div>
          )}
        </>
      )}

      <div className="obstacle-section">
        <div className="obstacle-heading">
          <div><h3>Zones à exclure</h3><p>Piscine, arbre, poteau, regard… Ces zones seront retirées de la surface et du calepinage.</p></div>
          <span>{project.obstacles.length} réservation{project.obstacles.length > 1 ? 's' : ''}</span>
        </div>

        {project.obstacles.length > 0 && (
          <div className="obstacle-list">
            {project.obstacles.map((obstacle, index) => (
              <article className="obstacle-card" key={obstacle.id}>
                <div className="obstacle-card-head"><strong>{obstacle.label}</strong><button type="button" onClick={() => removeObstacle(obstacle.id)}>Supprimer</button></div>
                <div className="obstacle-edit-grid">
                  <label>Nom<input value={obstacle.label} onChange={(e) => updateObstacle(obstacle.id, { label: e.target.value })} /></label>
                  <label>Distance depuis la gauche<input type="number" min="0" step="0.1" value={obstacle.xM} onChange={(e) => updateObstacle(obstacle.id, { xM: +e.target.value })} /><span>m</span></label>
                  <label>Distance depuis le haut<input type="number" min="0" step="0.1" value={obstacle.yM} onChange={(e) => updateObstacle(obstacle.id, { yM: +e.target.value })} /><span>m</span></label>
                  {obstacle.shape === 'circle' ? (
                    <label>Diamètre<input type="number" min="0.05" step="0.05" value={obstacle.diameterM ?? 0} onChange={(e) => updateObstacle(obstacle.id, { diameterM: +e.target.value })} /><span>m</span></label>
                  ) : (
                    <>
                      <label>Longueur<input type="number" min="0.05" step="0.05" value={obstacle.widthM ?? 0} onChange={(e) => updateObstacle(obstacle.id, { widthM: +e.target.value })} /><span>m</span></label>
                      <label>Largeur<input type="number" min="0.05" step="0.05" value={obstacle.heightM ?? 0} onChange={(e) => updateObstacle(obstacle.id, { heightM: +e.target.value })} /><span>m</span></label>
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
              <button type="button" key={preset.kind} className={draft.kind === preset.kind ? 'active' : ''} onClick={() => setDraft({ ...emptyDraft, kind: preset.kind, label: preset.label, shape: preset.shape })}>{preset.label}</button>
            ))}
          </div>
          <div className="obstacle-draft-grid">
            <label>Nom<input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></label>
            <label>Depuis la gauche<input type="number" min="0" step="0.1" value={draft.x} onChange={(e) => setDraft({ ...draft, x: e.target.value })} /><span>m</span></label>
            <label>Depuis le haut<input type="number" min="0" step="0.1" value={draft.y} onChange={(e) => setDraft({ ...draft, y: e.target.value })} /><span>m</span></label>
            {draft.shape === 'circle' ? (
              <label>Diamètre<input type="number" min="0.05" step="0.05" value={draft.diameter} onChange={(e) => setDraft({ ...draft, diameter: e.target.value })} /><span>m</span></label>
            ) : (
              <>
                <label>Longueur<input type="number" min="0.05" step="0.05" value={draft.width} onChange={(e) => setDraft({ ...draft, width: e.target.value })} /><span>m</span></label>
                <label>Largeur<input type="number" min="0.05" step="0.05" value={draft.height} onChange={(e) => setDraft({ ...draft, height: e.target.value })} /><span>m</span></label>
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
