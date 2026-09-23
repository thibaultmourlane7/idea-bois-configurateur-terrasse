import type { ProjectInput, StairConfig } from '../domain/types';
import { computeStairs } from '../engine/stairs';
import { computeTerrainModel } from '../engine/terrain';

export function StairEditor({
  project,
  onChange,
}: {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
}) {
  const terrain = computeTerrainModel(project);
  const transitions = terrain.relations.filter((relation) => relation.transitionRequired);
  const stairs = project.stairs ?? [];
  const results = new Map(computeStairs(project).map((stair) => [stair.id, stair]));

  const patch = (id: string, value: Partial<StairConfig>) => {
    onChange({
      ...project,
      stairs: stairs.map((stair) => stair.id === id ? { ...stair, ...value } : stair),
    });
  };

  const addForRelation = (relationId: string) => {
    let index = stairs.length + 1;
    let id = `ESC-${index}`;
    while (stairs.some((stair) => stair.id === id)) {
      index += 1;
      id = `ESC-${index}`;
    }
    onChange({
      ...project,
      stairs: [...stairs, {
        id,
        label: `Escalier ${index}`,
        relationId,
        boundarySegmentIndex: 0,
      }],
    });
  };

  const remove = (id: string) => {
    onChange({ ...project, stairs: stairs.filter((stair) => stair.id !== id) });
  };

  return (
    <section className="stair-editor">
      <div className="stair-editor-heading">
        <div>
          <span className="cut-kicker">SPRINT I — ESCALIERS</span>
          <h3>Escaliers entre plateformes</h3>
          <p>Un escalier se place uniquement sur une transition de niveau réellement calculée. Largeur, profondeur de marche, nombre de marches et structure restent des choix explicites.</p>
        </div>
        <strong>{stairs.length} escalier{stairs.length > 1 ? 's' : ''}</strong>
      </div>

      {transitions.length === 0 ? (
        <div className="terrain-empty">Aucune transition de niveau n’est disponible. Créez d’abord deux plateformes de niveaux différents.</div>
      ) : (
        <div className="stair-transition-list">
          {transitions.map((relation) => (
            <div className="stair-transition-row" key={relation.id}>
              <div>
                <strong>{relation.aLabel} ↔ {relation.bLabel}</strong>
                <small>
                  Frontière {relation.sharedBoundaryLengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m • écart fini {relation.finishedDeltaMinMm.toFixed(0)} à {relation.finishedDeltaMaxMm.toFixed(0)} mm
                </small>
              </div>
              <button type="button" onClick={() => addForRelation(relation.id)}>Ajouter un escalier</button>
            </div>
          ))}
        </div>
      )}

      {stairs.length > 0 && (
        <div className="stair-card-list">
          {stairs.map((stair) => {
            const relation = terrain.relations.find((item) => item.id === stair.relationId);
            const result = results.get(stair.id);
            return (
              <article className="stair-card" key={stair.id}>
                <div className="stair-card-heading">
                  <input
                    value={stair.label}
                    onChange={(event) => patch(stair.id, { label: event.target.value })}
                    aria-label="Nom de l'escalier"
                  />
                  <span className={`stair-status ${result?.status ?? 'pending'}`}>
                    {result?.status === 'ready' ? 'Géométrie calculée' : result?.status === 'invalid' ? 'À corriger' : 'À compléter'}
                  </span>
                  <button type="button" className="danger" onClick={() => remove(stair.id)}>Supprimer</button>
                </div>

                <div className="stair-field-grid">
                  <label>Transition
                    <select
                      value={stair.relationId}
                      onChange={(event) => patch(stair.id, {
                        relationId: event.target.value,
                        boundarySegmentIndex: 0,
                        boundaryOffsetM: undefined,
                      })}
                    >
                      {transitions.map((item) => <option value={item.id} key={item.id}>{item.aLabel} ↔ {item.bLabel}</option>)}
                    </select>
                  </label>

                  <label>Segment de frontière
                    <select
                      value={stair.boundarySegmentIndex}
                      onChange={(event) => patch(stair.id, { boundarySegmentIndex: +event.target.value, boundaryOffsetM: undefined })}
                    >
                      {(relation?.boundarySegments ?? []).map((segment, index) => (
                        <option value={index} key={index}>Segment {index + 1} — {segment.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</option>
                      ))}
                    </select>
                  </label>

                  <label>Position depuis le début
                    <div className="input-unit compact">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={stair.boundaryOffsetM ?? ''}
                        onChange={(event) => patch(stair.id, { boundaryOffsetM: event.target.value === '' ? undefined : +event.target.value })}
                      />
                      <span>m</span>
                    </div>
                  </label>

                  <label>Largeur escalier
                    <div className="input-unit compact">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={stair.widthM ?? ''}
                        onChange={(event) => patch(stair.id, { widthM: event.target.value === '' ? undefined : +event.target.value })}
                      />
                      <span>m</span>
                    </div>
                  </label>

                  <label>Profondeur d’une marche
                    <div className="input-unit compact">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={stair.treadDepthMm ?? ''}
                        onChange={(event) => patch(stair.id, { treadDepthMm: event.target.value === '' ? undefined : +event.target.value })}
                      />
                      <span>mm</span>
                    </div>
                  </label>

                  <label>Nombre de marches
                    <div className="input-unit compact">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={stair.stepCount ?? ''}
                        onChange={(event) => patch(stair.id, { stepCount: event.target.value === '' ? undefined : +event.target.value })}
                      />
                      <span>u.</span>
                    </div>
                    <small>La dernière marche rejoint le niveau haut.</small>
                  </label>

                  <label>Lignes porteuses / limons
                    <div className="input-unit compact">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={stair.structureLineCount ?? ''}
                        onChange={(event) => patch(stair.id, { structureLineCount: event.target.value === '' ? undefined : +event.target.value })}
                      />
                      <span>u.</span>
                    </div>
                    <small>À saisir depuis la solution structurelle validée ; le moteur ne choisit pas ce nombre.</small>
                  </label>
                </div>

                {result?.status === 'ready' && (
                  <div className="stair-result-grid">
                    <div><span>Hauteur à franchir</span><strong>{result.riseLeftMm?.toFixed(0)} à {result.riseRightMm?.toFixed(0)} mm</strong></div>
                    <div><span>Hauteur / marche</span><strong>{result.riserHeightLeftMm?.toFixed(0)} à {result.riserHeightRightMm?.toFixed(0)} mm</strong></div>
                    <div><span>Développement</span><strong>{result.totalRunM?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</strong></div>
                    <div><span>Lames marches</span><strong>{result.treadRequiredLinearM?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ml</strong></div>
                    <div><span>Structure géométrique</span><strong>{result.structureLinearM != null ? `${result.structureLinearM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ml` : 'À confirmer'}</strong></div>
                  </div>
                )}

                {(result?.issues.length ?? 0) > 0 && (
                  <div className={result?.status === 'invalid' ? 'stair-issues invalid' : 'stair-issues'}>
                    {result?.issues.map((issue) => <span key={issue}>{issue}</span>)}
                  </div>
                )}

                <p className="stair-rule-note">
                  Aucune hauteur de marche, profondeur, largeur, nombre de limons, section ou fixation n’est imposé automatiquement. Les marches sont intégrées au quantitatif de lame et l’emprise retire les lames de plateforme situées dessous.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
