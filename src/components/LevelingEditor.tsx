import type { LayingZone, ProjectInput, SupportLevelProfile } from '../domain/types';
import { computeLayout } from '../engine/layout';
import { computeTerrainModel } from '../engine/terrain';

export function LevelingEditor({
  project,
  onChange,
}: {
  project: ProjectInput;
  onChange: (project: ProjectInput) => void;
}) {
  const profile: SupportLevelProfile = project.supportLevelProfile ?? {
    mode: 'flat',
    topLeftDeltaMm: 0,
    topRightDeltaMm: 0,
    bottomRightDeltaMm: 0,
    bottomLeftDeltaMm: 0,
    targetSlopeXPercent: 0,
    targetSlopeYPercent: 0,
  };
  const canResolveLayout = project.board.gapMm != null && Number.isFinite(project.board.gapMm) && project.board.gapMm >= 0;
  const hasButtJoints = canResolveLayout ? computeLayout(project).hasButtJoints : false;
  const terrain = computeTerrainModel(project);

  const patch = (patchValue: Partial<SupportLevelProfile>) => {
    onChange({
      ...project,
      supportLevelProfile: {
        ...profile,
        ...patchValue,
      },
    });
  };

  const patchZone = (zoneId: string, patchValue: Partial<LayingZone>) => {
    onChange({
      ...project,
      layingZones: (project.layingZones ?? []).map((zone) =>
        zone.id === zoneId ? { ...zone, ...patchValue } : zone
      ),
    });
  };

  return (
    <div className="leveling-editor">
      {!hasButtJoints && (
        <div className="double-joist-visible-setting">
          <div>
            <h3>Renfort aux jonctions de lames</h3>
            <p>{canResolveLayout ? 'Aucune jonction de lames n’est détectée avec le calepinage actuel.' : 'Le jeu de pose n’est pas encore validé : les jonctions ne peuvent pas encore être calculées.'} Vous pouvez néanmoins mémoriser votre préférence : elle sera appliquée automatiquement si un raccord apparaît après une modification du projet.</p>
          </div>
          <div className="segmented">
            <button
              type="button"
              className={!project.doubleJoistsAtButtJoints ? 'active' : ''}
              onClick={() => onChange({ ...project, doubleJoistsAtButtJoints: false })}
            >
              Lambourde simple
            </button>
            <button
              type="button"
              className={project.doubleJoistsAtButtJoints ? 'active' : ''}
              onClick={() => onChange({ ...project, doubleJoistsAtButtJoints: true })}
            >
              Double lambourdage
            </button>
          </div>
        </div>
      )}

      <div className="leveling-heading">
        <div>
          <h3>Niveaux du support</h3>
          <p>Prenez le coin haut-gauche comme niveau 0, puis renseignez les écarts mesurés aux trois autres coins. Une valeur positive signifie que le support est plus haut que ce point de référence.</p>
        </div>
      </div>

      <div className="segmented leveling-mode">
        <button type="button" className={profile.mode === 'flat' ? 'active' : ''} onClick={() => patch({ mode: 'flat' })}>Support plan</button>
        <button type="button" className={profile.mode === 'four-corners' ? 'active' : ''} onClick={() => patch({ mode: 'four-corners', topLeftDeltaMm: 0 })}>4 niveaux mesurés</button>
      </div>

      {profile.mode === 'four-corners' && (
        <div className="level-corners">
          <label>Haut gauche — référence
            <div className="input-unit compact">
              <input type="number" value={0} disabled />
              <span>mm</span>
            </div>
          </label>
          <label>Haut droite
            <div className="input-unit compact">
              <input type="number" step="1" value={profile.topRightDeltaMm} onChange={(event) => patch({ topRightDeltaMm: +event.target.value })} />
              <span>mm</span>
            </div>
          </label>
          <label>Bas droite
            <div className="input-unit compact">
              <input type="number" step="1" value={profile.bottomRightDeltaMm} onChange={(event) => patch({ bottomRightDeltaMm: +event.target.value })} />
              <span>mm</span>
            </div>
          </label>
          <label>Bas gauche
            <div className="input-unit compact">
              <input type="number" step="1" value={profile.bottomLeftDeltaMm} onChange={(event) => patch({ bottomLeftDeltaMm: +event.target.value })} />
              <span>mm</span>
            </div>
          </label>
        </div>
      )}

      <div className="leveling-slope">
        <div>
          <h4>Pente volontaire du dessus fini</h4>
          <p>0 % conserve un dessus fini horizontal. Aucune pente n’est imposée automatiquement.</p>
        </div>
        <div className="level-corners two">
          <label>Axe longueur (X)
            <div className="input-unit compact">
              <input type="number" step="0.1" value={profile.targetSlopeXPercent} onChange={(event) => patch({ targetSlopeXPercent: +event.target.value })} />
              <span>%</span>
            </div>
          </label>
          <label>Axe largeur (Y)
            <div className="input-unit compact">
              <input type="number" step="0.1" value={profile.targetSlopeYPercent} onChange={(event) => patch({ targetSlopeYPercent: +event.target.value })} />
              <span>%</span>
            </div>
          </label>
        </div>
      </div>

      <section className="terrain-platform-editor">
        <div className="terrain-platform-heading">
          <div>
            <span className="cut-kicker">SPRINT H — TERRAIN AVANCÉ</span>
            <h3>Plateformes et niveaux multiples</h3>
            <p>Chaque plateforme reprend une zone réelle du calepinage. Un décalage de niveau recalcule les hauteurs de plots et la 3D, sans créer automatiquement de marche ou de raccord.</p>
          </div>
          <strong>{terrain.platforms.length} niveau{terrain.platforms.length > 1 ? 'x' : ''}</strong>
        </div>

        {(project.layingZones ?? []).length === 0 ? (
          <div className="terrain-empty">
            Créez d’abord une zone de pose à l’étape « Lames ». Elle pourra ensuite devenir une plateforme à un autre niveau sans faire traverser les lames entre deux hauteurs.
          </div>
        ) : (
          <div className="terrain-platform-list">
            {(project.layingZones ?? []).map((zone) => {
              const customSlope = zone.targetSlopeXPercent != null || zone.targetSlopeYPercent != null;
              return (
                <article className="terrain-platform-card" key={zone.id}>
                  <div className="terrain-platform-card-heading">
                    <div>
                      <strong>{zone.label}</strong>
                      <small>{zone.id} • frontière structurelle déjà séparée par le moteur</small>
                    </div>
                    <span>{(zone.finishedLevelOffsetMm ?? 0) >= 0 ? '+' : ''}{zone.finishedLevelOffsetMm ?? 0} mm fini</span>
                  </div>

                  <div className="terrain-level-grid">
                    <label>Niveau fini relatif
                      <div className="input-unit compact">
                        <input
                          type="number"
                          step="1"
                          value={zone.finishedLevelOffsetMm ?? 0}
                          onChange={(event) => patchZone(zone.id, { finishedLevelOffsetMm: +event.target.value })}
                        />
                        <span>mm</span>
                      </div>
                      <small>Écart par rapport à la plateforme principale.</small>
                    </label>

                    <label>Niveau support relatif
                      <div className="input-unit compact">
                        <input
                          type="number"
                          step="1"
                          value={zone.supportLevelOffsetMm ?? 0}
                          onChange={(event) => patchZone(zone.id, { supportLevelOffsetMm: +event.target.value })}
                        />
                        <span>mm</span>
                      </div>
                      <small>Décalage mesuré du support sous cette plateforme.</small>
                    </label>

                    <label>Pente locale X
                      <div className="input-unit compact">
                        <input
                          type="number"
                          step="0.1"
                          value={zone.targetSlopeXPercent ?? profile.targetSlopeXPercent}
                          onChange={(event) => patchZone(zone.id, { targetSlopeXPercent: +event.target.value })}
                        />
                        <span>%</span>
                      </div>
                    </label>

                    <label>Pente locale Y
                      <div className="input-unit compact">
                        <input
                          type="number"
                          step="0.1"
                          value={zone.targetSlopeYPercent ?? profile.targetSlopeYPercent}
                          onChange={(event) => patchZone(zone.id, { targetSlopeYPercent: +event.target.value })}
                        />
                        <span>%</span>
                      </div>
                    </label>
                  </div>

                  {customSlope && (
                    <button
                      type="button"
                      className="terrain-reset-slope"
                      onClick={() => patchZone(zone.id, { targetSlopeXPercent: undefined, targetSlopeYPercent: undefined })}
                    >
                      Reprendre la pente globale
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {terrain.relations.length > 0 && (
          <div className="terrain-relations">
            <h4>Relations entre plateformes</h4>
            {terrain.relations.map((relation) => (
              <div className={relation.transitionRequired ? 'terrain-relation transition' : 'terrain-relation'} key={relation.id}>
                <div>
                  <strong>{relation.aLabel} ↔ {relation.bLabel}</strong>
                  <small>Frontière commune : {relation.sharedBoundaryLengthM.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m</small>
                </div>
                <span>
                  {relation.transitionRequired
                    ? `Écart fini ${relation.finishedDeltaMinMm.toFixed(0)} à ${relation.finishedDeltaMaxMm.toFixed(0)} mm`
                    : 'Même niveau fini'}
                </span>
              </div>
            ))}
            {terrain.transitionCount > 0 && (
              <p className="terrain-transition-note">
                {terrain.transitionCount} transition{terrain.transitionCount > 1 ? 's' : ''} de niveau détectée{terrain.transitionCount > 1 ? 's' : ''}. Aucune marche, rampe ou fixation de transition n’est ajoutée automatiquement dans le Sprint H.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
