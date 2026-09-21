import { useMemo, useState, type ChangeEvent } from 'react';
import { demoBoards, demoJoist } from './catalog/catalogue';
import { Diagnostics } from './components/Diagnostics';
import { Plan2D } from './components/Plan2D';
import { Preview3D } from './components/Preview3D';
import { Results } from './components/Results';
import type { BoardOrientation, DrainageAnswer, ProjectInput, ShapeType, SupportType } from './domain/types';
import { runConfigurator, VERSION_TAG } from './engine/configurator';

const initialProject: ProjectInput = {
  projectName: 'Mon projet terrasse',
  shape: 'rectangle',
  dimensions: {
    lengthM: 6,
    widthM: 4,
    notchLengthM: 2,
    notchWidthM: 1.5,
  },
  heightCm: 20,
  supportType: 'existing-concrete-slab',
  drainage: 'unknown',
  orientation: 'length',
  board: demoBoards[0],
  joist: demoJoist,
  usage: 'residential',
};

const steps = [
  { id: 1, label: 'Dimensions' },
  { id: 2, label: 'Support' },
  { id: 3, label: 'Lames' },
  { id: 4, label: 'Votre projet' },
];

function ChoiceCard({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" className={`choice-card ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="choice-check">{active ? '✓' : ''}</span>
      <strong>{title}</strong>
      {subtitle && <small>{subtitle}</small>}
    </button>
  );
}

export default function App() {
  const [project, setProject] = useState<ProjectInput>(initialProject);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<'2d' | '3d'>('2d');
  const result = useMemo(() => runConfigurator(project), [project]);

  const patchDimensions = (key: keyof ProjectInput['dimensions'], value: number) => {
    setProject((current) => ({ ...current, dimensions: { ...current.dimensions, [key]: value } }));
  };

  const saveLocal = () => {
    localStorage.setItem('idea-bois-terrasse-v06', JSON.stringify(project));
    alert('Votre projet a été enregistré sur cet appareil.');
  };

  const next = () => setStep((current) => Math.min(4, current + 1));
  const previous = () => setStep((current) => Math.max(1, current - 1));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">IB</div>
          <div>
            <div className="eyebrow">IDEA BOIS × SPEEDARTI</div>
            <h1>Imaginez votre terrasse</h1>
          </div>
        </div>
        <div className="header-note">Simple • précis • sans calcul à faire</div>
      </header>

      <div className="stepper-wrap">
        <nav className="stepper" aria-label="Étapes du configurateur">
          {steps.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`${step === item.id ? 'active' : ''} ${step > item.id ? 'done' : ''}`}
              onClick={() => setStep(item.id)}
            >
              <span>{step > item.id ? '✓' : item.id}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      </div>

      <main className="wizard-shell">
        <section className="wizard-card">
          {step === 1 && (
            <div className="step-content">
              <div className="section-heading">
                <span className="section-number">1</span>
                <div><h2>Quelle forme fait votre terrasse ?</h2><p>Indiquez simplement ses dimensions principales.</p></div>
              </div>

              <div className="choice-grid two-choice">
                <ChoiceCard active={project.shape === 'rectangle'} title="Rectangle" subtitle="La forme la plus courante" onClick={() => setProject({ ...project, shape: 'rectangle' })} />
                <ChoiceCard active={project.shape === 'l-shape'} title="Forme en L" subtitle="Avec un décroché" onClick={() => setProject({ ...project, shape: 'l-shape' })} />
              </div>

              <div className="form-grid">
                <label>Longueur <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.lengthM} onChange={(e: ChangeEvent<HTMLInputElement>) => patchDimensions('lengthM', +e.target.value)} /><span>m</span></div></label>
                <label>Largeur <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.widthM} onChange={(e: ChangeEvent<HTMLInputElement>) => patchDimensions('widthM', +e.target.value)} /><span>m</span></div></label>
              </div>

              {project.shape === 'l-shape' && (
                <div className="soft-panel">
                  <h3>Dimensions du décroché</h3>
                  <div className="form-grid">
                    <label>Longueur du décroché <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.notchLengthM} onChange={(e: ChangeEvent<HTMLInputElement>) => patchDimensions('notchLengthM', +e.target.value)} /><span>m</span></div></label>
                    <label>Largeur du décroché <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.notchWidthM} onChange={(e: ChangeEvent<HTMLInputElement>) => patchDimensions('notchWidthM', +e.target.value)} /><span>m</span></div></label>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="section-heading">
                <span className="section-number">2</span>
                <div><h2>Sur quoi sera posée la terrasse ?</h2><p>Le configurateur adaptera automatiquement la structure.</p></div>
              </div>

              <div className="choice-grid three-choice">
                {([
                  ['existing-concrete-slab', 'Dalle béton existante', 'Une dalle est déjà présente'],
                  ['new-concrete-slab', 'Dalle béton neuve', 'La dalle sera créée pour le projet'],
                  ['stabilized-ground', 'Sol stabilisé', 'Terrain préparé et drainant'],
                ] as const).map(([value, title, subtitle]) => (
                  <ChoiceCard key={value} active={project.supportType === value} title={title} subtitle={subtitle} onClick={() => setProject({ ...project, supportType: value as SupportType })} />
                ))}
              </div>

              <label className="single-field">Hauteur souhaitée de la terrasse
                <div className="input-unit compact"><input type="number" min="1" step="1" value={project.heightCm} onChange={(e: ChangeEvent<HTMLInputElement>) => setProject({ ...project, heightCm: +e.target.value })} /><span>cm</span></div>
                <small>Du support jusqu'au dessus des lames.</small>
              </label>

              {project.supportType !== 'stabilized-ground' && (
                <div className="question-block">
                  <h3>L'eau s'évacue-t-elle correctement sur la dalle ?</h3>
                  <div className="segmented">
                    {([
                      ['yes', 'Oui'], ['no', 'Non'], ['unknown', 'Je ne sais pas'],
                    ] as const).map(([value, label]) => (
                      <button type="button" key={value} className={project.drainage === value ? 'active' : ''} onClick={() => setProject({ ...project, drainage: value as DrainageAnswer })}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <div className="section-heading">
                <span className="section-number">3</span>
                <div><h2>Choisissez vos lames</h2><p>À terme, cette liste sera alimentée directement par le catalogue IDEA Bois.</p></div>
              </div>

              <div className="product-grid">
                {demoBoards.map((board) => (
                  <button type="button" key={board.id} className={`product-card ${project.board.id === board.id ? 'active' : ''}`} onClick={() => setProject({ ...project, board })}>
                    <div className={`product-swatch ${board.technical.materialFamily}`} />
                    <div><strong>{board.label}</strong><span>{board.subtitle}</span></div>
                    <i>{project.board.id === board.id ? '✓' : ''}</i>
                  </button>
                ))}
              </div>

              <div className="orientation-block">
                <h3>Dans quel sens souhaitez-vous poser les lames ?</h3>
                <div className="orientation-grid">
                  {([
                    ['length', 'Dans la longueur'],
                    ['width', 'Dans la largeur'],
                  ] as const).map(([value, label]) => (
                    <button type="button" key={value} className={`orientation-card ${project.orientation === value ? 'active' : ''}`} onClick={() => setProject({ ...project, orientation: value as BoardOrientation })}>
                      <span className={`mini-deck ${value}`}><i /><i /><i /><i /></span>
                      <strong>{label}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content result-step">
              <div className="section-heading result-heading">
                <span className="section-number done">✓</span>
                <div><h2>Votre projet terrasse</h2><p>SpeedArti a préparé le quantitatif et les contrôles techniques disponibles.</p></div>
                <button type="button" className="ghost-button" onClick={saveLocal}>Enregistrer</button>
              </div>

              <Results input={project} result={result} />

              <div className="preview-toolbar">
                <div className="segmented small-segmented">
                  <button type="button" className={preview === '2d' ? 'active' : ''} onClick={() => setPreview('2d')}>Vue 2D</button>
                  <button type="button" className={preview === '3d' ? 'active' : ''} onClick={() => setPreview('3d')}>Vue 3D</button>
                </div>
                <span>Produit : <strong>{project.board.label}</strong></span>
              </div>

              {preview === '2d' ? <Plan2D input={project} /> : <Preview3D input={project} />}

              <details className="technical-details">
                <summary>Voir les vérifications techniques</summary>
                <div className="technical-body">
                  <Diagnostics items={result.diagnostics} />
                  <div className="trace-list">
                    {result.trace.map((line, index) => <code key={index}>{line}</code>)}
                  </div>
                </div>
              </details>

              <div className="scope-reminder">Cette démo calcule uniquement les matériaux. Aucun temps de pose, aucune heure ni aucun coût de main-d'œuvre.</div>
            </div>
          )}

          <footer className="wizard-actions">
            <button type="button" className="back-button" onClick={previous} disabled={step === 1}>Retour</button>
            {step < 4 ? <button type="button" className="primary-button" onClick={next}>Continuer <span>→</span></button> : <button type="button" className="primary-button" onClick={() => setStep(1)}>Modifier mon projet</button>}
          </footer>
        </section>

        <aside className="live-summary">
          <span className="live-label">Votre terrasse</span>
          <div className="live-preview"><Plan2D input={project} /></div>
          <div className="live-stats">
            <div><span>Surface</span><strong>{result.geometry ? `${result.geometry.areaM2.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²` : '—'}</strong></div>
            <div><span>Forme</span><strong>{project.shape === 'rectangle' ? 'Rectangle' : 'En L'}</strong></div>
            <div><span>Hauteur</span><strong>{project.heightCm} cm</strong></div>
          </div>
          <div className="speedarti-note"><span>✓</span><p>Les règles techniques sont vérifiées automatiquement en arrière-plan.</p></div>
          <code className="version-code">{VERSION_TAG}</code>
        </aside>
      </main>
    </div>
  );
}
