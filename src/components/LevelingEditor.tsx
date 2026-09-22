import type { ProjectInput, SupportLevelProfile } from '../domain/types';
import { computeLayout } from '../engine/layout';

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

  const patch = (patchValue: Partial<SupportLevelProfile>) => {
    onChange({
      ...project,
      supportLevelProfile: {
        ...profile,
        ...patchValue,
      },
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
    </div>
  );
}