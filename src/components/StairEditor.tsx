import type { ProjectInput, StairConfig, StairMode } from '../domain/types';
import { computeTerraceEdges } from '../engine/edges';
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
  const exteriorEdges = computeTerraceEdges(project).filter((edge) => !edge.curved);
  const stairs = project.stairs ?? [];
  const results = new Map(computeStairs(project).map((stair) => [stair.id, stair]));

  const patch = (id: string, value: Partial<StairConfig>) => {
    onChange({
      ...project,
      stairs: stairs.map((stair) => stair.id === id ? { ...stair, ...value } : stair),
    });
  };

  const nextIdentity = () => {
    let index = stairs.length + 1;
    let id = `ESC-${index}`;
    while (stairs.some((stair) => stair.id === id)) {
      index += 1;
      id = `ESC-${index}`;
    }
    return { id, label: `Escalier ${index}` };
  };

  const addForRelation = (relationId: string) => {
    const identity = nextIdentity();
    onChange({
      ...project,
      stairs: [...stairs, {
        ...identity,
        mode: 'platform-transition',
        relationId,
        boundarySegmentIndex: 0,
      }],
    });
  };

  const addForEdge = (edgeIndex: number) => {
    const identity = nextIdentity();
    onChange({
      ...project,
      stairs: [...stairs, {
        ...identity,
        mode: 'external-edge',
        edgeIndex,
        boundarySegmentIndex: 0,
      }],
    });
  };

  const remove = (id: string) => {
    onChange({ ...project, stairs: stairs.filter((stair) => stair.id !== id) });
  };

  const switchMode = (stair: StairConfig, mode: StairMode) => {
    if (mode === 'external-edge') {
      patch(stair.id, {
        mode,
        relationId: undefined,
        boundarySegmentIndex: 0,
        edgeIndex: exteriorEdges[0]?.edgeIndex,
        landingLevelOffsetMm: undefined,
        boundaryOffsetM: undefined,
      });
      return;
    }
    patch(stair.id, {
      mode,
      relationId: transitions[0]?.id,
      boundarySegmentIndex: 0,
      edgeIndex: undefined,
      landingLevelOffsetMm: undefined,
      boundaryOffsetM: undefined,
    });
  };

  return (
    <section className="stair-editor">
      <div className="stair-editor-heading">
        <div>
          <span className="cut-kicker">SPRINT I — ESCALIERS</span>
          <h3>Escaliers et accès</h3>
          <p>
            Deux cas sont possibles : un escalier depuis une rive extérieure de la terrasse vers un niveau d’arrivée,
            ou un escalier entre deux plateformes de niveaux différents.
          </p>
        </div>
        <strong>{stairs.length} escalier{stairs.length > 1 ? 's' : ''}</strong>
      </div>

      <div className="stair-source-grid">
        <div className="stair-source-panel">
          <h4>Accès extérieur</h4>
          <p>Pour descendre ou monter depuis le bord de la terrasse. Le niveau d’arrivée sera saisi explicitement.</p>
          {exteriorEdges.length ? (
            <div className="stair-source-options">
              {exteriorEdges.map((edge) => (
                <button type="button" key={edge.id} onClick={() => addForEdge(edge.edgeIndex)}>
                  Ajouter sur {edge.label} <small>{edge.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="terrain-empty">Aucune rive droite exploitable automatiquement pour un escalier extérieur.</div>
          )}
        </div>

        <div className="stair-source-panel">
          <h4>Entre plateformes</h4>
          <p>Pour relier deux niveaux déjà définis dans le module Terrain avancé.</p>
          {transitions.length ? (
            <div className="stair-source-options">
              {transitions.map((relation) => (
                <button type="button" key={relation.id} onClick={() => addForRelation(relation.id)}>
                  {relation.aLabel} ↔ {relation.bLabel}
                  <small>
                    {relation.sharedBoundaryLengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m • écart {relation.finishedDeltaMinMm.toFixed(0)} à {relation.finishedDeltaMaxMm.toFixed(0)} mm
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <div className="terrain-empty">Aucune transition interne de niveau. Cela n’empêche plus de créer un escalier extérieur.</div>
          )}
        </div>
      </div>

      {stairs.length > 0 && (
        <div className="stair-card-list">
          {stairs.map((stair) => {
            const mode: StairMode = stair.mode ?? (stair.relationId ? 'platform-transition' : 'external-edge');
            const relation = terrain.relations.find((item) => item.id === stair.relationId);
            const selectedEdge = exteriorEdges.find((edge) => edge.edgeIndex === stair.edgeIndex);
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

                <div className="stair-mode-switch">
                  <button
                    type="button"
                    className={mode === 'external-edge' ? 'active' : ''}
                    onClick={() => switchMode(stair, 'external-edge')}
                    disabled={!exteriorEdges.length}
                  >
                    Depuis une rive extérieure
                  </button>
                  <button
                    type="button"
                    className={mode === 'platform-transition' ? 'active' : ''}
                    onClick={() => switchMode(stair, 'platform-transition')}
                    disabled={!transitions.length}
                  >
                    Entre deux plateformes
                  </button>
                </div>

                <div className="stair-field-grid">
                  {mode === 'external-edge' ? (
                    <>
                      <label>Rive de départ
                        <select
                          value={stair.edgeIndex ?? ''}
                          onChange={(event) => patch(stair.id, {
                            edgeIndex: event.target.value === '' ? undefined : +event.target.value,
                            boundaryOffsetM: undefined,
                          })}
                        >
                          <option value="">Sélectionner</option>
                          {exteriorEdges.map((edge) => (
                            <option value={edge.edgeIndex} key={edge.id}>
                              {edge.label} — {edge.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>Niveau d’arrivée extérieur
                        <div className="input-unit compact">
                          <input
                            type="number"
                            step="1"
                            value={stair.landingLevelOffsetMm ?? ''}
                            onChange={(event) => patch(stair.id, {
                              landingLevelOffsetMm: event.target.value === '' ? undefined : +event.target.value,
                            })}
                          />
                          <span>mm</span>
                        </div>
                        <small>Par rapport au support de référence du projet. Exemple : 0 mm si l’arrivée correspond exactement à ce niveau de référence.</small>
                      </label>

                      <label>Rive disponible
                        <div className="stair-readonly-value">
                          {selectedEdge ? `${selectedEdge.label} • ${selectedEdge.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m` : 'À sélectionner'}
                        </div>
                      </label>
                    </>
                  ) : (
                    <>
                      <label>Transition
                        <select
                          value={stair.relationId ?? ''}
                          onChange={(event) => patch(stair.id, {
                            relationId: event.target.value || undefined,
                            boundarySegmentIndex: 0,
                            boundaryOffsetM: undefined,
                          })}
                        >
                          <option value="">Sélectionner</option>
                          {transitions.map((item) => <option value={item.id} key={item.id}>{item.aLabel} ↔ {item.bLabel}</option>)}
                        </select>
                      </label>

                      <label>Segment de frontière
                        <select
                          value={stair.boundarySegmentIndex ?? 0}
                          onChange={(event) => patch(stair.id, {
                            boundarySegmentIndex: +event.target.value,
                            boundaryOffsetM: undefined,
                          })}
                        >
                          {(relation?.boundarySegments ?? []).map((segment, index) => (
                            <option value={index} key={index}>Segment {index + 1} — {segment.lengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

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
                    <div><span>Type</span><strong>{result.mode === 'external-edge' ? 'Accès extérieur' : 'Entre plateformes'}</strong></div>
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
                  Aucune hauteur de marche, profondeur, largeur, nombre de limons, section ou fixation n’est imposé automatiquement.
                  Les dimensions sont calculées uniquement à partir des niveaux et valeurs renseignés.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
