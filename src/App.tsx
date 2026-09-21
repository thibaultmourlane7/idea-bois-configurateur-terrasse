import { useMemo, useState, type ChangeEvent } from 'react';
import { demoJoist, ideaBoisBoards } from './catalog/catalogue';
import { Diagnostics } from './components/Diagnostics';
import { Plan2D } from './components/Plan2D';
import { Preview3D } from './components/Preview3D';
import { Results } from './components/Results';
import { CommercialActions } from './components/CommercialActions';
import type { BoardOrientation, DrainageAnswer, EdgeFinishMode, ProjectInput, SupportSystem, SupportType } from './domain/types';
import { runConfigurator, VERSION_TAG } from './engine/configurator';
import { restoreProjectFromUrl } from './commercial/share';
import { hasSavedProject, loadProjectLocally, saveProjectLocally } from './commercial/persistence';

const defaultBoard = ideaBoisBoards.find((board) => board.id === 'IDEA-TERR-G027') ?? ideaBoisBoards[0];

const initialProject: ProjectInput = {
  projectName: 'Mon projet terrasse',
  shape: 'rectangle',
  dimensions: { lengthM: 6, widthM: 4, notchLengthM: 2, notchWidthM: 1.5 },
  heightCm: 20,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  includeGeotextile: false,
  drainage: 'unknown',
  orientation: 'length',
  board: defaultBoard,
  joist: demoJoist,
  usage: 'residential',
};

const steps = [
  { id: 1, label: 'Dimensions' },
  { id: 2, label: 'Support' },
  { id: 3, label: 'Lames' },
  { id: 4, label: 'Finitions' },
  { id: 5, label: 'Votre projet' },
];

const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

type ProductFilter = 'all' | 'resineux' | 'exotique' | 'bambou' | 'composite' | 'autre';

function ChoiceCard({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button" className={`choice-card ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="choice-check">{active ? '✓' : ''}</span>
      <strong>{title}</strong>
      {subtitle && <small>{subtitle}</small>}
    </button>
  );
}

function boardFilter(board: ProjectInput['board']): ProductFilter {
  const family = board.catalog?.family.toLowerCase() ?? '';
  if (family.includes('résineux')) return 'resineux';
  if (family.includes('exotique')) return 'exotique';
  if (family.includes('bambou')) return 'bambou';
  if (family.includes('composite')) return 'composite';
  return 'autre';
}

export default function App() {
  const [project, setProject] = useState<ProjectInput>(() => restoreProjectFromUrl(initialProject, window.location.href));
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<'2d' | '3d'>('2d');
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [savedAvailable, setSavedAvailable] = useState(() => hasSavedProject());
  const result = useMemo(() => runConfigurator(project), [project]);

  const filteredBoards = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return ideaBoisBoards.filter((board) => {
      const filterOk = productFilter === 'all' || boardFilter(board) === productFilter;
      const haystack = [board.label, board.subtitle, board.catalog?.material, board.catalog?.range, board.catalog?.color, board.catalog?.profile]
        .filter(Boolean).join(' ').toLowerCase();
      return filterOk && (!query || haystack.includes(query));
    });
  }, [productFilter, productSearch]);

  const patchDimensions = (key: keyof ProjectInput['dimensions'], value: number) => {
    setProject((current) => ({ ...current, dimensions: { ...current.dimensions, [key]: value } }));
  };

  const saveLocal = () => {
    saveProjectLocally(project);
    setSavedAvailable(true);
    alert('Votre projet a été enregistré sur cet appareil.');
  };

  const resumeLocal = () => {
    const saved = loadProjectLocally(initialProject);
    if (!saved) {
      alert('Aucun projet enregistré compatible n’a été trouvé.');
      setSavedAvailable(false);
      return;
    }
    setProject(saved);
    setStep(5);
  };

  const downloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { generateClientPdf } = await import('./pdf/clientPdf');
      await generateClientPdf(project, result, VERSION_TAG);
    } catch (error) {
      console.error(error);
      alert("Le PDF n'a pas pu être généré. Merci de réessayer.");
    } finally {
      setPdfBusy(false);
    }
  };

  const next = () => setStep((current) => Math.min(5, current + 1));
  const previous = () => setStep((current) => Math.max(1, current - 1));
  const liveBudget = result.basket?.totalTtc != null
    ? euro(result.basket.totalTtc)
    : result.basket?.totalMinTtc != null && result.basket?.totalMaxTtc != null
      ? `${euro(result.basket.totalMinTtc)} – ${euro(result.basket.totalMaxTtc)}`
      : result.basket?.knownSubtotalTtc != null && result.basket.knownSubtotalTtc > 0
        ? `dès ${euro(result.basket.knownSubtotalTtc)}`
        : 'À compléter';

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
        <div className="topbar-actions">
          {savedAvailable && <button type="button" className="resume-button" onClick={resumeLocal}>Reprendre mon projet</button>}
          <div className="header-note">Simple • catalogue réel • panier • partage • devis</div>
        </div>
      </header>

      <div className="stepper-wrap">
        <nav className="stepper" aria-label="Étapes du configurateur">
          {steps.map((item) => (
            <button type="button" key={item.id} className={`${step === item.id ? 'active' : ''} ${step > item.id ? 'done' : ''}`} onClick={() => setStep(item.id)}>
              <span>{step > item.id ? '✓' : item.id}</span><strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      </div>

      <main className="wizard-shell">
        <section className="wizard-card">
          {step === 1 && (
            <div className="step-content">
              <div className="section-heading"><span className="section-number">1</span><div><h2>Quelle forme fait votre terrasse ?</h2><p>Indiquez simplement ses dimensions principales.</p></div></div>
              <label className="single-field project-name-field">Nom du projet
                <div className="input-unit"><input value={project.projectName} maxLength={80} onChange={(e) => setProject({ ...project, projectName: e.target.value })} /></div>
                <small>Ce nom sera utilisé dans le PDF et le lien partagé.</small>
              </label>
              <div className="choice-grid two-choice">
                <ChoiceCard active={project.shape === 'rectangle'} title="Rectangle" subtitle="La forme la plus courante" onClick={() => setProject({ ...project, shape: 'rectangle' })} />
                <ChoiceCard active={project.shape === 'l-shape'} title="Forme en L" subtitle="Avec un décroché" onClick={() => setProject({ ...project, shape: 'l-shape' })} />
              </div>
              <div className="form-grid">
                <label>Longueur <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.lengthM} onChange={(e: ChangeEvent<HTMLInputElement>) => patchDimensions('lengthM', +e.target.value)} /><span>m</span></div></label>
                <label>Largeur <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.widthM} onChange={(e: ChangeEvent<HTMLInputElement>) => patchDimensions('widthM', +e.target.value)} /><span>m</span></div></label>
              </div>
              {project.shape === 'l-shape' && (
                <div className="soft-panel"><h3>Dimensions du décroché</h3><div className="form-grid">
                  <label>Longueur du décroché <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.notchLengthM} onChange={(e) => patchDimensions('notchLengthM', +e.target.value)} /><span>m</span></div></label>
                  <label>Largeur du décroché <div className="input-unit"><input type="number" min="0.1" step="0.1" value={project.dimensions.notchWidthM} onChange={(e) => patchDimensions('notchWidthM', +e.target.value)} /><span>m</span></div></label>
                </div></div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="section-heading"><span className="section-number">2</span><div><h2>Sur quoi sera posée la terrasse ?</h2><p>Les contrôles techniques restent en arrière-plan.</p></div></div>
              <div className="choice-grid three-choice">
                {([
                  ['existing-concrete-slab', 'Dalle béton existante', 'Une dalle est déjà présente'],
                  ['new-concrete-slab', 'Dalle béton neuve', 'La dalle sera créée pour le projet'],
                  ['stabilized-ground', 'Sol stabilisé', 'Terrain préparé et drainant'],
                ] as const).map(([value, title, subtitle]) => <ChoiceCard key={value} active={project.supportType === value} title={title} subtitle={subtitle} onClick={() => setProject({
                    ...project,
                    supportType: value as SupportType,
                    includeGeotextile: value === 'stabilized-ground' ? project.includeGeotextile : false,
                  })} />)}
              </div>
              <div className="question-block support-choice-block">
                <h3>Comment la structure sera-t-elle supportée ?</h3>
                <div className="choice-grid three-choice compact-choices">
                  {([
                    ['adjustable-pedestals', 'Plots réglables', 'Pour régler précisément la hauteur'],
                    ['pads', 'Cales / appuis fixes', 'Pour une pose proche du support'],
                    ['unknown', 'Je ne sais pas', 'Le configurateur le signalera sans inventer'],
                  ] as const).map(([value, title, subtitle]) => (
                    <ChoiceCard key={value} active={project.supportSystem === value} title={title} subtitle={subtitle} onClick={() => setProject({ ...project, supportSystem: value as SupportSystem })} />
                  ))}
                </div>
              </div>

              <label className="single-field">Hauteur souhaitée de la terrasse<div className="input-unit compact"><input type="number" min="1" step="1" value={project.heightCm} onChange={(e) => setProject({ ...project, heightCm: +e.target.value })} /><span>cm</span></div><small>Du support jusqu'au dessus des lames.</small></label>
              {project.supportType !== 'stabilized-ground' && (
                <div className="question-block"><h3>L'eau s'évacue-t-elle correctement sur la dalle ?</h3><div className="segmented">
                  {([['yes', 'Oui'], ['no', 'Non'], ['unknown', 'Je ne sais pas']] as const).map(([value, label]) => <button type="button" key={value} className={project.drainage === value ? 'active' : ''} onClick={() => setProject({ ...project, drainage: value as DrainageAnswer })}>{label}</button>)}
                </div></div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <div className="section-heading"><span className="section-number">3</span><div><h2>Choisissez le style de vos lames</h2><p>Les longueurs commerciales sont regroupées : le client choisit le produit, le moteur choisira les longueurs.</p></div></div>

              <div className="catalog-toolbar">
                <input className="catalog-search" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Rechercher : Ipé, Pin, Padouk, Silvadec…" />
                <div className="catalog-filters">
                  {([['all','Toutes'],['resineux','Résineux'],['exotique','Exotiques'],['bambou','Bambou'],['composite','Composite']] as const).map(([value,label]) => (
                    <button type="button" key={value} className={productFilter === value ? 'active' : ''} onClick={() => setProductFilter(value)}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="catalog-count">{filteredBoards.length} gamme{filteredBoards.length > 1 ? 's' : ''} affichée{filteredBoards.length > 1 ? 's' : ''} • relevé catalogue du 04/09/2026</div>
              <div className="product-grid real-catalog-grid">
                {filteredBoards.map((board) => (
                  <button type="button" key={board.id} className={`product-card ${project.board.id === board.id ? 'active' : ''}`} onClick={() => setProject({ ...project, board })}>
                    <div className={`product-swatch ${board.technical.materialFamily}`} />
                    <div className="product-copy">
                      <strong>{board.label}</strong>
                      <span>{board.subtitle}</span>
                      <div className="product-meta">
                        <b>{board.priceTtcPerM2 != null ? `${euro(board.priceTtcPerM2)} / m²` : 'Prix à confirmer'}</b>
                        <em>{board.catalog?.availabilitySnapshot ?? 'Disponibilité à confirmer'}</em>
                      </div>
                    </div>
                    <i>{project.board.id === board.id ? '✓' : ''}</i>
                  </button>
                ))}
              </div>

              <div className="orientation-block"><h3>Dans quel sens souhaitez-vous poser les lames ?</h3><div className="orientation-grid">
                {([['length','Dans la longueur'],['width','Dans la largeur']] as const).map(([value,label]) => (
                  <button type="button" key={value} className={`orientation-card ${project.orientation === value ? 'active' : ''}`} onClick={() => setProject({ ...project, orientation: value as BoardOrientation })}>
                    <span className={`mini-deck ${value}`}><i /><i /><i /><i /></span><strong>{label}</strong>
                  </button>
                ))}
              </div></div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <div className="section-heading">
                <span className="section-number">4</span>
                <div>
                  <h2>Choisissez vos finitions</h2>
                  <p>Ajoutez uniquement les éléments que vous souhaitez réellement intégrer à votre projet.</p>
                </div>
              </div>

              <div className="finish-section">
                <h3>Habillage latéral de la terrasse</h3>
                <p className="finish-help">Permet de masquer la structure sur les côtés visibles.</p>
                <div className="choice-grid two-choice">
                  <ChoiceCard
                    active={project.edgeFinishMode === 'none'}
                    title="Sans habillage latéral"
                    subtitle="La structure reste visible sur les côtés"
                    onClick={() => setProject({ ...project, edgeFinishMode: 'none' as EdgeFinishMode })}
                  />
                  <ChoiceCard
                    active={project.edgeFinishMode === 'full-perimeter'}
                    title="Habiller tout le pourtour"
                    subtitle="Le configurateur ajoute les finitions compatibles quand elles sont connues"
                    onClick={() => setProject({ ...project, edgeFinishMode: 'full-perimeter' as EdgeFinishMode })}
                  />
                </div>
              </div>

              {project.supportType === 'stabilized-ground' && (
                <div className="finish-section">
                  <h3>Protection du sol</h3>
                  <p className="finish-help">IDEA Bois recommande un géotextile sur sol en terre ou gravier pour limiter les remontées de végétation.</p>
                  <div className="choice-grid two-choice">
                    <ChoiceCard
                      active={!project.includeGeotextile}
                      title="Sans géotextile"
                      subtitle="Je ne souhaite pas l’ajouter au panier"
                      onClick={() => setProject({ ...project, includeGeotextile: false })}
                    />
                    <ChoiceCard
                      active={project.includeGeotextile}
                      title="Ajouter le géotextile"
                      subtitle="Rouleaux GEODECK de 20 m²"
                      onClick={() => setProject({ ...project, includeGeotextile: true })}
                    />
                  </div>
                </div>
              )}

              <div className="soft-panel finish-summary">
                <h3>Ce qui sera ajouté au panier</h3>
                <p>
                  {project.edgeFinishMode === 'full-perimeter'
                    ? 'Habillage latéral : oui, sur tout le pourtour.'
                    : 'Habillage latéral : non.'}
                  {project.supportType === 'stabilized-ground'
                    ? project.includeGeotextile
                      ? ' Géotextile : inclus.'
                      : ' Géotextile : non inclus.'
                    : ''}
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="step-content result-step">
              <div className="section-heading result-heading">
                <span className="section-number done">✓</span>
                <div><h2>Votre projet terrasse</h2><p>Votre panier matériaux est calculé avec les références et règles disponibles. Aucun montant manquant n’est inventé.</p></div>
                <div className="result-actions">
                  <button type="button" className="ghost-button" onClick={saveLocal}>Enregistrer</button>
                  <button type="button" className="pdf-button" onClick={downloadPdf} disabled={pdfBusy}>
                    {pdfBusy ? 'Création du PDF…' : 'Télécharger le PDF'}
                  </button>
                </div>
              </div>
              <Results input={project} result={result} />
              <CommercialActions project={project} result={result} version={VERSION_TAG} />
              <div className="preview-toolbar"><div className="segmented small-segmented"><button type="button" className={preview === '2d' ? 'active' : ''} onClick={() => setPreview('2d')}>Vue 2D</button><button type="button" className={preview === '3d' ? 'active' : ''} onClick={() => setPreview('3d')}>Vue 3D</button></div><span>Produit : <strong>{project.board.label}</strong></span></div>
              {preview === '2d' ? <Plan2D input={project} /> : <Preview3D input={project} />}
              <details className="technical-details"><summary>Détails techniques pour vérification</summary><div className="technical-body"><Diagnostics items={result.diagnostics} /><div className="trace-list">{result.trace.map((line,index) => <code key={index}>{line}</code>)}</div></div></details>
              <div className="scope-reminder">Cette démo calcule uniquement les matériaux. Aucun temps de pose, aucune heure ni aucun coût de main-d'œuvre.</div>
            </div>
          )}

          <footer className="wizard-actions"><button type="button" className="back-button" onClick={previous} disabled={step === 1}>Retour</button>{step < 5 ? <button type="button" className="primary-button" onClick={next}>Continuer <span>→</span></button> : <button type="button" className="primary-button" onClick={() => setStep(1)}>Modifier mon projet</button>}</footer>
        </section>

        <aside className="live-summary">
          <span className="live-label">Votre terrasse</span>
          <div className="live-preview"><Plan2D input={project} /></div>
          <div className="live-stats"><div><span>Surface</span><strong>{result.geometry ? `${result.geometry.areaM2.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²` : '—'}</strong></div><div><span>Forme</span><strong>{project.shape === 'rectangle' ? 'Rectangle' : 'En L'}</strong></div><div><span>Budget matériel</span><strong>{liveBudget}</strong></div></div>
          <div className="speedarti-note"><span>✓</span><p>Le projet peut être partagé, repris par un conseiller et préparé pour devis/panier. Les connexions réelles restent désactivées dans la démo.</p></div>
          <code className="version-code">{VERSION_TAG}</code>
        </aside>
      </main>
    </div>
  );
}
