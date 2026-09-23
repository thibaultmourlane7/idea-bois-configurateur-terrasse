import type { GuardrailConfig, ProjectInput } from '../domain/types';
import { computeTerraceEdges } from '../engine/edges';
import { computeGuardrails, guardrailTargetKey } from '../engine/guardrails';
import { computeStairs } from '../engine/stairs';

export function GuardrailEditor({
  project,
  onChange,
}: {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
}) {
  const configs = project.guardrails ?? [];
  const results = new Map(computeGuardrails(project).map((item) => [item.id, item]));
  const edges = computeTerraceEdges(project).filter((edge) => !edge.curved);
  const stairs = computeStairs(project).filter((stair) => stair.status === 'ready');
  const occupied = new Set(configs.map(guardrailTargetKey));

  const patch = (id: string, value: Partial<GuardrailConfig>) => {
    onChange({
      ...project,
      guardrails: configs.map((item) => item.id === id ? { ...item, ...value } : item),
    });
  };

  const nextIdentity = () => {
    let index = configs.length + 1;
    let id = `GC-${index}`;
    while (configs.some((item) => item.id === id)) {
      index += 1;
      id = `GC-${index}`;
    }
    return { id, label: `Garde-corps ${index}` };
  };

  const addEdge = (edgeIndex: number) => {
    const identity = nextIdentity();
    onChange({
      ...project,
      guardrails: [...configs, {
        ...identity,
        targetType: 'terrace-edge',
        edgeIndex,
      }],
    });
  };

  const addStairSide = (stairId: string, stairSide: 'left' | 'right') => {
    const identity = nextIdentity();
    onChange({
      ...project,
      guardrails: [...configs, {
        ...identity,
        targetType: 'stair-side',
        stairId,
        stairSide,
      }],
    });
  };

  const remove = (id: string) => {
    onChange({ ...project, guardrails: configs.filter((item) => item.id !== id) });
  };

  return (
    <section className="guardrail-editor">
      <div className="guardrail-heading">
        <div>
          <span className="cut-kicker">SPRINT J — GARDE-CORPS</span>
          <h3>Côtés, poteaux, sections et références</h3>
          <p>Choisissez uniquement les côtés concernés. Le nombre de poteaux, la hauteur, les sections et les références ne sont jamais déduits automatiquement.</p>
        </div>
        <strong>{configs.length} côté{configs.length > 1 ? 's' : ''}</strong>
      </div>

      <div className="guardrail-target-grid">
        <div className="guardrail-target-panel">
          <h4>Rives terrasse</h4>
          <div className="guardrail-target-list">
            {edges.map((edge) => {
              const key = `edge:${edge.edgeIndex}`;
              return (
                <button type="button" key={edge.id} disabled={occupied.has(key)} onClick={() => addEdge(edge.edgeIndex)}>
                  <span>{edge.label}</span>
                  <small>{edge.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</small>
                  <b>{occupied.has(key) ? 'Ajouté' : 'Ajouter'}</b>
                </button>
              );
            })}
            {!edges.length && <div className="terrain-empty">Aucune rive droite disponible pour un garde-corps automatique.</div>}
          </div>
        </div>

        <div className="guardrail-target-panel">
          <h4>Côtés d’escalier</h4>
          <div className="guardrail-target-list">
            {stairs.flatMap((stair) => (['left', 'right'] as const).map((side) => {
              const key = `stair:${stair.id}:${side}`;
              return (
                <button type="button" key={key} disabled={occupied.has(key)} onClick={() => addStairSide(stair.id, side)}>
                  <span>{stair.label} — {side === 'left' ? 'gauche' : 'droit'}</span>
                  <small>{stair.totalRunM?.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) ?? '—'} m en plan</small>
                  <b>{occupied.has(key) ? 'Ajouté' : 'Ajouter'}</b>
                </button>
              );
            }))}
            {!stairs.length && <div className="terrain-empty">Aucun escalier entièrement calculé n’est disponible.</div>}
          </div>
        </div>
      </div>

      <div className="guardrail-list">
        {configs.map((config) => {
          const result = results.get(config.id);
          return (
            <article className="guardrail-card" key={config.id}>
              <div className="guardrail-card-heading">
                <input value={config.label} onChange={(event) => patch(config.id, { label: event.target.value })} />
                <div>
                  <strong>{result?.targetLabel ?? 'Côté à vérifier'}</strong>
                  <small>
                    {result?.planLengthM != null
                      ? `${result.planLengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m en plan`
                      : 'Longueur non calculée'}
                  </small>
                </div>
                <span className={`guardrail-status ${result?.status ?? 'pending'}`}>
                  {result?.status === 'ready' ? 'Calculé' : result?.status === 'invalid' ? 'À corriger' : 'À compléter'}
                </span>
                <button type="button" className="danger" onClick={() => remove(config.id)}>Supprimer</button>
              </div>

              <div className="guardrail-field-grid">
                <label>Hauteur
                  <div className="input-unit compact">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={config.heightMm ?? ''}
                      onChange={(event) => patch(config.id, { heightMm: event.target.value === '' ? undefined : +event.target.value })}
                    />
                    <span>mm</span>
                  </div>
                </label>

                <label>Nombre de poteaux
                  <div className="input-unit compact">
                    <input
                      type="number"
                      min="2"
                      step="1"
                      value={config.postCount ?? ''}
                      onChange={(event) => patch(config.id, { postCount: event.target.value === '' ? undefined : +event.target.value })}
                    />
                    <span>u.</span>
                  </div>
                  <small>Saisie explicite : aucun entraxe universel n’est appliqué.</small>
                </label>

                <label>Section poteau — largeur
                  <div className="input-unit compact">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={config.postSectionWidthMm ?? ''}
                      onChange={(event) => patch(config.id, { postSectionWidthMm: event.target.value === '' ? undefined : +event.target.value })}
                    />
                    <span>mm</span>
                  </div>
                </label>

                <label>Section poteau — profondeur
                  <div className="input-unit compact">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={config.postSectionDepthMm ?? ''}
                      onChange={(event) => patch(config.id, { postSectionDepthMm: event.target.value === '' ? undefined : +event.target.value })}
                    />
                    <span>mm</span>
                  </div>
                </label>

                <label>Référence système
                  <input value={config.systemReference ?? ''} placeholder="À renseigner si connue" onChange={(event) => patch(config.id, { systemReference: event.target.value || undefined })} />
                </label>
                <label>Référence poteau
                  <input value={config.postReference ?? ''} placeholder="À renseigner si connue" onChange={(event) => patch(config.id, { postReference: event.target.value || undefined })} />
                </label>
                <label>Référence section / remplissage
                  <input value={config.sectionReference ?? ''} placeholder="À renseigner si connue" onChange={(event) => patch(config.id, { sectionReference: event.target.value || undefined })} />
                </label>
                <label>Référence fixation
                  <input value={config.fixingReference ?? ''} placeholder="À renseigner si connue" onChange={(event) => patch(config.id, { fixingReference: event.target.value || undefined })} />
                </label>
                <label className="guardrail-note-field">Note
                  <input value={config.note ?? ''} placeholder="Optionnel" onChange={(event) => patch(config.id, { note: event.target.value || undefined })} />
                </label>
              </div>

              {result?.status === 'ready' && (
                <div className="guardrail-result-grid">
                  <div><span>Poteaux</span><strong>{result.postCount}</strong></div>
                  <div><span>Sections</span><strong>{result.sectionCount}</strong></div>
                  <div><span>Longueur 3D</span><strong>{result.slopeLengthM?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</strong></div>
                  <div><span>Section moyenne</span><strong>{result.averageSectionLengthM?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</strong></div>
                </div>
              )}

              {(result?.issues.length ?? 0) > 0 && (
                <div className={result?.status === 'invalid' ? 'guardrail-issues invalid' : 'guardrail-issues'}>
                  {result?.issues.map((issue) => <span key={issue}>{issue}</span>)}
                </div>
              )}

              <p className="guardrail-rule-note">
                Le configurateur calcule uniquement la géométrie et les quantités issues de vos saisies. Il ne décide pas si un garde-corps est réglementairement obligatoire et n’invente aucun entraxe, section, référence ou fixation.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
