import { useMemo } from 'react';
import type { JoistEntrySide, ProjectInput, StructureJoistChoice, SupportPlanResult } from '../domain/types';
import { getCommercialConstructionRule, getCommercialJoistOptions } from '../engine/constructionRules';

function entryChoices(plan?: SupportPlanResult): Array<{ value: JoistEntrySide; label: string }> {
  const field = plan?.joistSegments.find((segment) => segment.role === 'field' || segment.role === 'butt-joint');
  if (!field) return [];
  const dx = Math.abs(field.x2M - field.x1M);
  const dy = Math.abs(field.y2M - field.y1M);
  return dx >= dy
    ? [{ value: 'left', label: 'Depuis la gauche' }, { value: 'right', label: 'Depuis la droite' }]
    : [{ value: 'top', label: 'Depuis le haut' }, { value: 'bottom', label: 'Depuis le bas' }];
}

export function StructureChoicePanel({
  project,
  supportPlan,
  onChange,
}: {
  project: ProjectInput;
  supportPlan?: SupportPlanResult;
  onChange: (project: ProjectInput) => void;
}) {
  const options = useMemo(() => getCommercialJoistOptions(project), [project.board, project.supportSystem, project.structureJoistChoice]);
  const rule = useMemo(() => getCommercialConstructionRule(project), [project.board, project.supportSystem, project.structureJoistChoice]);
  const starts = entryChoices(supportPlan);

  if (project.boardSelectionConfirmed === false) return null;

  return (
    <section className="structure-early-panel">
      <div className="structure-early-heading">
        <div>
          <span>Structure associée à votre lame</span>
          <h3>{rule?.joistLabel ?? 'Structure à confirmer'}</h3>
          <p>
            {rule
              ? rule.status === 'validated'
                ? `Entraxe maximum documenté : ${rule.joistSpacingMm} mm. La structure est recalculée avec la lame sélectionnée.`
                : rule.sourceNote
              : 'Aucune recette structurelle complète n’est encore liée à cette référence. Le configurateur ne remplace pas la donnée manquante par du Pin par défaut.'}
          </p>
        </div>
        <strong className={rule?.status === 'validated' ? 'structure-status ready' : 'structure-status pending'}>
          {rule?.status === 'validated' ? 'Calculable' : 'À confirmer'}
        </strong>
      </div>

      {options.length > 0 && (
        <div className="structure-choice-options">
          <h4>Choisissez la lambourde</h4>
          <div className="choice-grid two-choice">
            {options.map((option) => {
              const active = project.structureJoistChoice === option.id
                || (!project.structureJoistChoice && option.recommended === true);
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`choice-card ${active ? 'active' : ''}`}
                  onClick={() => onChange({ ...project, structureJoistChoice: option.id as StructureJoistChoice })}
                >
                  <span className="choice-check">{active ? '✓' : ''}</span>
                  <strong>{option.recommended ? `${option.label} — Recommandé fabricant` : option.label}</strong>
                  <small>{option.subtitle}</small>
                </button>
              );
            })}
          </div>
          {!project.structureJoistChoice && !options.some((option) => option.recommended) && (
            <p className="structure-choice-warning">Choisissez une famille de lambourde pour obtenir une structure et un prix définitifs.</p>
          )}
        </div>
      )}

      {starts.length > 0 && rule?.status === 'validated' && (
        <div className="joist-entry-choice">
          <div>
            <h4>Entrée des lambourdes sur le chantier</h4>
            <p>Ce choix oriente le départ des lambourdes sur le plan. Il ne change pas artificiellement les quantités.</p>
          </div>
          <div className="joist-entry-buttons">
            <button
              type="button"
              className={!project.joistEntrySide ? 'active' : ''}
              onClick={() => onChange({ ...project, joistEntrySide: undefined })}
            >
              Automatique
            </button>
            {starts.map((option) => (
              <button
                type="button"
                key={option.value}
                className={project.joistEntrySide === option.value ? 'active' : ''}
                onClick={() => onChange({ ...project, joistEntrySide: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
