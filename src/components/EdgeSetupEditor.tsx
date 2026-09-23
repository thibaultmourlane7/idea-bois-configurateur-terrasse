import type {
  ProjectInput,
  TerraceEdgeConfig,
  TerraceEdgeContext,
  TerraceEdgeTreatment,
} from '../domain/types';
import {
  computeTerraceEdges,
  EDGE_CONTEXT_LABELS,
  EDGE_TREATMENT_LABELS,
} from '../engine/edges';

const CONTEXTS = Object.entries(EDGE_CONTEXT_LABELS) as Array<[TerraceEdgeContext, string]>;
const TREATMENTS = Object.entries(EDGE_TREATMENT_LABELS) as Array<[TerraceEdgeTreatment, string]>;

export function EdgeSetupEditor({
  project,
  onChange,
}: {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
}) {
  const edges = computeTerraceEdges(project);

  const update = (edgeIndex: number, patch: Partial<TerraceEdgeConfig>) => {
    const current = project.edgeConfigs ?? [];
    const existing = current.find((item) => item.edgeIndex === edgeIndex);
    const next: TerraceEdgeConfig = {
      edgeIndex,
      context: existing?.context ?? 'free',
      treatment: existing?.treatment ?? 'none',
      note: existing?.note,
      ...patch,
    };
    onChange({
      ...project,
      edgeConfigs: [...current.filter((item) => item.edgeIndex !== edgeIndex), next]
        .sort((a, b) => a.edgeIndex - b.edgeIndex),
    });
  };

  return (
    <section className="edge-setup-editor">
      <div className="edge-editor-heading">
        <div>
          <span className="cut-kicker">SPRINT C — RIVES MÉTIER</span>
          <h3>Configurer chaque rive</h3>
          <p>Le contexte décrit le chantier. Le traitement sélectionné est le seul qui alimente les quantités et alertes associées.</p>
        </div>
        <strong>{edges.length} rive{edges.length > 1 ? 's' : ''}</strong>
      </div>

      <div className="edge-editor-list">
        {edges.map((edge) => (
          <article className="edge-editor-row" key={edge.id}>
            <div className="edge-editor-id">
              <strong>{edge.label}</strong>
              <span>{edge.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</span>
              {edge.curved && <small>rive courbe</small>}
            </div>

            <label>
              <span>Contexte chantier</span>
              <select value={edge.context} onChange={(event) => update(edge.edgeIndex, { context: event.target.value as TerraceEdgeContext })}>
                {CONTEXTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label>
              <span>Traitement</span>
              <select
                value={edge.treatment}
                onChange={(event) => update(edge.edgeIndex, { treatment: event.target.value as TerraceEdgeTreatment })}
              >
                {TREATMENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="edge-note-field">
              <span>Note chantier</span>
              <input
                value={(project.edgeConfigs ?? []).find((item) => item.edgeIndex === edge.edgeIndex)?.note ?? ''}
                placeholder="Optionnel"
                onChange={(event) => update(edge.edgeIndex, { note: event.target.value || undefined })}
              />
            </label>
          </article>
        ))}
      </div>

      <div className="edge-editor-note">
        Les traitements « profil », « lame de rive » et « drainage » restent chiffrés <strong>À confirmer</strong> tant que leur référence et leur règle fabricant ne sont pas validées.
      </div>
    </section>
  );
}
