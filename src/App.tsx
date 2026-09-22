import { useMemo, useState } from 'react';
import { demoJoist, ideaBoisBoards } from './catalog/catalogue';
import { Diagnostics } from './components/Diagnostics';
import { Plan2D } from './components/Plan2D';
import { Preview3D } from './components/Preview3D';
import { Results } from './components/Results';
import { CommercialActions } from './components/CommercialActions';
import { VariantComparator } from './components/VariantComparator';
import { GeometryEditor } from './components/GeometryEditor';
import { SideView } from './components/SideView';
import { LayerControls } from './components/LayerControls';
import { LevelingEditor } from './components/LevelingEditor';
import { SupportHeightMap } from './components/SupportHeightMap';
import { getProductReadiness, readinessRank, type ProductReadiness } from './catalog/readiness';
import type { BoardOrientation, DeckLayingPattern, DrainageAnswer, EdgeFinishMode, ProjectInput, SupportSystem, SupportType } from './domain/types';
import { runConfigurator, VERSION_TAG } from './engine/configurator';
import { restoreProjectFromUrl } from './commercial/share';
import { hasSavedProject, loadProjectLocally, saveProjectLocally } from './commercial/persistence';
import { FINISHED_LAYERS, layersForStep, type ConstructionLayers, type VisualPreset } from './visual/layers';
import { resolveBoardTexture, textureStatusLabel } from './visual/resolveBoardTexture';
import { resolveMaterialProfile } from './visual/materialProfiles';

const defaultBoard = ideaBoisBoards.find((board) => board.id === 'IDEA-TERR-G027') ?? ideaBoisBoards[0];

const initialProject: ProjectInput = {
  projectName: 'Mon projet terrasse',
  shape: 'rectangle',
  dimensions: {
    lengthM: 6,
    widthM: 4,
    notchLengthM: 2,
    notchWidthM: 1.5,
    circleDiameterM: 5,
    tStemWidthM: 2.5,
    tBarDepthM: 1.5,
    uOpeningWidthM: 2,
    uOpeningDepthM: 2,
  },
  obstacles: [],
  heightCm: 20,
  supportLevelProfile: {
    mode: 'flat',
    topLeftDeltaMm: 0,
    topRightDeltaMm: 0,
    bottomRightDeltaMm: 0,
    bottomLeftDeltaMm: 0,
    targetSlopeXPercent: 0,
    targetSlopeYPercent: 0,
  },
  doubleJoistsAtButtJoints: false,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'unknown',
  orientation: 'length',
  layingPattern: 'straight',
  board: defaultBoard,
  joist: demoJoist,
  usage: 'residential',
};

const steps = [
  { id: 1, label: 'Dimensions' },
  { id: 2, label: 'Lames' },
  { id: 3, label: 'Support' },
  { id: 4, label: 'Finitions' },
  { id: 5, label: 'Votre projet' },
];

const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type ProductFilter = 'all' | 'resineux' | 'exotique' | 'bambou' | 'composite' | 'autre';
type ProductReadinessFilter = 'all' | ProductReadiness;
type ProductSort = 'readiness' | 'price-asc' | 'price-desc';

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
  const [preview, setPreview] = useState<'2d' | '3d' | 'side'>('2d');
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [readinessFilter, setReadinessFilter] = useState<ProductReadinessFilter>('all');
  const [productSort, setProductSort] = useState<ProductSort>('readiness');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [savedAvailable, setSavedAvailable] = useState(() => hasSavedProject());
  const [visualPreset, setVisualPreset] = useState<VisualPreset>('finished');
  const [visualLayers, setVisualLayers] = useState<ConstructionLayers>({ ...FINISHED_LAYERS });
  const result = useMemo(() => runConfigurator(project), [project]);
  const progressiveLayers = useMemo(() => layersForStep(step), [step]);
  const geometryDiagnostics = result.diagnostics.filter((item) =>
    item.severity === 'blocking' && (item.tag.startsWith('SA-TERR-GEO') || item.tag === 'SA-TERR-VALID-001')
  );

  const filteredBoards = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const list = ideaBoisBoards.filter((board) => {
      const filterOk = productFilter === 'all' || boardFilter(board) === productFilter;
      const readiness = getProductReadiness(board).level;
      const readinessOk = readinessFilter === 'all' || readiness === readinessFilter;
      const haystack = [board.label, board.subtitle, board.catalog?.material, board.catalog?.range, board.catalog?.color, board.catalog?.profile]
        .filter(Boolean).join(' ').toLowerCase();
      return filterOk && readinessOk && (!query || haystack.includes(query));
    });

    return [...list].sort((a, b) => {
      if (productSort === 'price-asc') return (a.priceTtcPerM2 ?? Number.POSITIVE_INFINITY) - (b.priceTtcPerM2 ?? Number.POSITIVE_INFINITY);
      if (productSort === 'price-desc') return (b.priceTtcPerM2 ?? Number.NEGATIVE_INFINITY) - (a.priceTtcPerM2 ?? Number.NEGATIVE_INFINITY);
      return readinessRank(getProductReadiness(a).level) - readinessRank(getProductReadiness(b).level)
        || (a.priceTtcPerM2 ?? Number.POSITIVE_INFINITY) - (b.priceTtcPerM2 ?? Number.POSITIVE_INFINITY);
    });
  }, [productFilter, productSearch, readinessFilter, productSort]);

  const compareBoards = useMemo(
    () => compareIds.map((id) => ideaBoisBoards.find((board) => board.id === id)).filter(Boolean) as ProjectInput['board'][],
    [compareIds],
  );

  const toggleCompare = (boardId: string) => {
    setCompareIds((current) => {
      if (current.includes(boardId)) return current.filter((id) => id !== boardId);
      if (current.length >= 3) return [...current.slice(1), boardId];
      return [...current, boardId];
    });
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
          <div className="header-note">Structure V0.17 • plan/photo calibré • structures multi-matériaux</div>
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
              <div className="stabilisation-banner">
                <strong>Nouveau V0.16.1</strong>
                <span>Forme libre dessinable + cotes saisissables • réservations débordantes autorisées • plan entièrement coté.</span>
              </div>
              <GeometryEditor project={project} onChange={setProject} />
              {geometryDiagnostics.length > 0 && (
                <div className="geometry-diagnostics">
                  <Diagnostics items={geometryDiagnostics} />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="section-heading"><span className="section-number">2</span><div><h2>Choisissez le style de vos lames</h2><p>Les longueurs commerciales sont regroupées : le client choisit le produit, le moteur choisira les longueurs.</p></div></div>

              <div className="catalog-toolbar">
                <input className="catalog-search" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Rechercher : Ipé, Pin, Padouk, Cumaru, Silvadec…" />
                <div className="catalog-filters">
                  {([['all','Toutes'],['resineux','Résineux'],['exotique','Exotiques'],['bambou','Bambou'],['composite','Composite']] as const).map(([value,label]) => (
                    <button type="button" key={value} className={productFilter === value ? 'active' : ''} onClick={() => setProductFilter(value)}>{label}</button>
                  ))}
                </div>
                <div className="catalog-secondary">
                  <div className="catalog-filters readiness-filters">
                    {([['all','Tous niveaux'],['complete','Panier calculable'],['calculable','Calcul avancé'],['partial','Calcul partiel'],['price-only','Prix seul']] as const).map(([value,label]) => (
                      <button type="button" key={value} className={readinessFilter === value ? 'active' : ''} onClick={() => setReadinessFilter(value as ProductReadinessFilter)}>{label}</button>
                    ))}
                  </div>
                  <select className="catalog-sort" value={productSort} onChange={(e) => setProductSort(e.target.value as ProductSort)}>
                    <option value="readiness">Les plus complets d'abord</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                  </select>
                </div>
              </div>

              <div className="catalog-count">{filteredBoards.length} gamme{filteredBoards.length > 1 ? 's' : ''} affichée{filteredBoards.length > 1 ? 's' : ''} • relevé catalogue du 04/09/2026</div>
              <div className="product-grid real-catalog-grid">
                {filteredBoards.map((board) => {
                  const readiness = getProductReadiness(board);
                  const texture = resolveBoardTexture(board);
                  const materialProfile = resolveMaterialProfile(board);
                  const comparing = compareIds.includes(board.id);
                  return (
                    <article key={board.id} className={`product-card ${project.board.id === board.id ? 'active' : ''}`}>
                      <button type="button" className="product-select" onClick={() => setProject({ ...project, board })}>
                        <div
                          className={`product-swatch ${board.technical.materialFamily} texture-${texture.status} ${materialProfile ? 'pin-strie-b1' : texture.grooveCount ? 'has-grooves' : ''}`}
                          style={texture.textureImageUrl
                            ? {
                                backgroundImage: `linear-gradient(${hexToRgba(texture.tintColor ?? '#ffffff', texture.tintOpacity ?? 0)}, ${hexToRgba(texture.tintColor ?? '#ffffff', texture.tintOpacity ?? 0)}), url("${texture.previewImageUrl ?? texture.textureImageUrl}")`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : undefined}
                        >
                          {texture.status === 'neutral' && (
                            <span>
                              <b>Texture à compléter</b>
                              <small>aucun rendu approximatif imposé</small>
                            </span>
                          )}
                        </div>
                        <div className="product-copy">
                          <span className={`readiness-badge ${readiness.level}`}>{readiness.label}</span>
                          <strong>{board.label}</strong>
                          <span>{board.subtitle}</span>
                          <small className={`visual-status texture-${texture.status}`}>
                            {textureStatusLabel(texture)}{texture.status === 'close' ? ' • rendu de projection' : ''}
                          </small>
                          {board.gapRangeMm && <small className="gap-info">Jeu publié : {board.gapRangeMm[0]}–{board.gapRangeMm[1]} mm</small>}
                          <div className="product-meta">
                            <b>{board.priceTtcPerM2 != null ? `${euro(board.priceTtcPerM2)} / m²` : 'Prix à confirmer'}</b>
                            <em>{board.catalog?.availabilitySnapshot ?? 'Disponibilité à confirmer'}</em>
                          </div>
                        </div>
                        <i>{project.board.id === board.id ? '✓' : ''}</i>
                      </button>
                      <button type="button" className={`compare-toggle ${comparing ? 'active' : ''}`} onClick={() => toggleCompare(board.id)}>
                        {comparing ? 'Retirer du comparateur' : 'Comparer'}
                      </button>
                    </article>
                  );
                })}
              </div>

              <VariantComparator
                project={project}
                boards={compareBoards}
                onChoose={(board) => setProject({ ...project, board })}
                onRemove={(id) => setCompareIds((current) => current.filter((value) => value !== id))}
              />

              <div className="orientation-block"><h3>Dans quel sens souhaitez-vous poser les lames ?</h3><div className="orientation-grid">
                {([['length','Dans la longueur'],['width','Dans la largeur']] as const).map(([value,label]) => (
                  <button type="button" key={value} className={`orientation-card ${project.orientation === value ? 'active' : ''}`} onClick={() => setProject({ ...project, orientation: value as BoardOrientation })}>
                    <span className={`mini-deck ${value}`}><i /><i /><i /><i /></span><strong>{label}</strong>
                  </button>
                ))}
              </div></div>

              <div className="laying-pattern-block">
                <h3>Quel calepinage souhaitez-vous pour les lames ?</h3>
                <p>Le motif reprend la logique CALPI. Les raccords restent sur des axes cohérents pour la structure.</p>
                <div className="laying-pattern-grid">
                  {([
                    ['straight', 'Pose entière / droite', 'Départ avec une lame entière à chaque rangée'],
                    ['half', 'Pose décalée 1/2', 'Une rangée sur deux démarre à une demi-lame'],
                    ['third', 'Pose décalée 1/3', 'Cycle strict : entière, 2/3, 1/3'],
                  ] as const).map(([value, title, subtitle]) => (
                    <ChoiceCard
                      key={value}
                      active={(project.layingPattern ?? 'straight') === value}
                      title={title}
                      subtitle={subtitle}
                      onClick={() => setProject({ ...project, layingPattern: value as DeckLayingPattern })}
                    />
                  ))}
                  <button type="button" className="choice-card laying-pattern-disabled" disabled>
                    <span className="choice-check" />
                    <strong>Pose diagonale</strong>
                    <small>Moteur non encore validé pour la terrasse — aucune approximation activée.</small>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <div className="section-heading"><span className="section-number">3</span><div><h2>Sur quoi sera posée la terrasse ?</h2><p>Les contrôles techniques restent en arrière-plan.</p></div></div>
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

              <div className="question-block double-joist-visible-setting">
                <div className="double-joist-heading">
                  <div>
                    <h3>Renfort aux jonctions de lames</h3>
                    <p className="finish-help">
                      {result.layout?.hasButtJoints
                        ? `${result.layout.buttJoints.length} raccord${result.layout.buttJoints.length > 1 ? 's' : ''} de lames détecté${result.layout.buttJoints.length > 1 ? 's' : ''}. Le choix ci-dessous recalcule la structure, les plots et le panier.`
                        : 'Aucun raccord de lames détecté avec le calepinage actuel. Le réglage reste disponible et s’appliquera automatiquement si un raccord apparaît.'}
                    </p>
                  </div>
                  <span className={result.layout?.hasButtJoints ? 'joint-status detected' : 'joint-status none'}>
                    {result.layout?.hasButtJoints ? 'Raccords détectés' : 'Aucun raccord'}
                  </span>
                </div>
                <div className="choice-grid two-choice">
                  <ChoiceCard
                    active={!project.doubleJoistsAtButtJoints}
                    title="Lambourdage simple"
                    subtitle="Une seule lambourde sur chaque axe de jonction"
                    onClick={() => setProject({ ...project, doubleJoistsAtButtJoints: false })}
                  />
                  <ChoiceCard
                    active={Boolean(project.doubleJoistsAtButtJoints)}
                    title="Double lambourdage"
                    subtitle="Ajoute une seconde lambourde sur les jonctions et recalcule les plots et le panier"
                    onClick={() => setProject({ ...project, doubleJoistsAtButtJoints: true })}
                  />
                </div>
              </div>

              <label className="single-field">Hauteur finie au point de référence<div className="input-unit compact"><input type="number" min="1" step="1" value={project.heightCm} onChange={(e) => setProject({ ...project, heightCm: +e.target.value })} /><span>cm</span></div><small>Du support au-dessus de la lame au coin haut-gauche de référence.</small></label>
              <LevelingEditor project={project} onChange={setProject} />
              {project.supportSystem === 'adjustable-pedestals' && (
                <SupportHeightMap project={project} plan={result.supportPlan} />
              )}
              {project.supportType !== 'stabilized-ground' && (
                <div className="question-block"><h3>L'eau s'évacue-t-elle correctement sur la dalle ?</h3><div className="segmented">
                  {([['yes', 'Oui'], ['no', 'Non'], ['unknown', 'Je ne sais pas']] as const).map(([value, label]) => <button type="button" key={value} className={project.drainage === value ? 'active' : ''} onClick={() => setProject({ ...project, drainage: value as DrainageAnswer })}>{label}</button>)}
                </div></div>
              )}
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
                {project.edgeFinishMode === 'full-perimeter' && (
                  <label className="single-field edge-height-field">
                    Hauteur de l’habillage
                    <div className="input-unit compact">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={project.edgeCladdingHeightCm}
                        onChange={(e) => setProject({ ...project, edgeCladdingHeightCm: +e.target.value })}
                      />
                      <span>cm</span>
                    </div>
                    <small>Les lames de rive et les morceaux verticaux de lambourde sont recalculés avec cette hauteur.</small>
                  </label>
                )}
                <div className="finish-live-side">
                  <SideView input={project} basket={result.basket} supportPlan={result.supportPlan} layers={progressiveLayers} />
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
              <div className="preview-toolbar">
                <div className="segmented small-segmented">
                  <button type="button" className={preview === '2d' ? 'active' : ''} onClick={() => setPreview('2d')}>Vue 2D</button>
                  <button type="button" className={preview === '3d' ? 'active' : ''} onClick={() => setPreview('3d')}>Vue 3D</button>
                  <button type="button" className={preview === 'side' ? 'active' : ''} onClick={() => setPreview('side')}>Vue de côté</button>
                </div>
                <span>Produit : <strong>{project.board.label}</strong></span>
              </div>
              <LayerControls
                preset={visualPreset}
                layers={visualLayers}
                onPreset={(preset, layers) => { setVisualPreset(preset); setVisualLayers(layers); }}
                onLayers={(layers) => { setVisualPreset('custom'); setVisualLayers(layers); }}
              />
              {preview === '2d' && <Plan2D input={project} basket={result.basket} supportPlan={result.supportPlan} layers={visualLayers} exploded={visualPreset === 'exploded'} />}
              {preview === '3d' && <Preview3D input={project} basket={result.basket} supportPlan={result.supportPlan} layers={visualLayers} exploded={visualPreset === 'exploded'} />}
              {preview === 'side' && <SideView input={project} basket={result.basket} supportPlan={result.supportPlan} layers={visualLayers} />}
              <details className="technical-details"><summary>Détails techniques pour vérification</summary><div className="technical-body"><Diagnostics items={result.diagnostics} /><div className="trace-list">{result.trace.map((line,index) => <code key={index}>{line}</code>)}</div></div></details>
              <div className="scope-reminder">Cette démo calcule uniquement les matériaux. Aucun temps de pose, aucune heure ni aucun coût de main-d'œuvre.</div>
            </div>
          )}

          <footer className="wizard-actions"><button type="button" className="back-button" onClick={previous} disabled={step === 1}>Retour</button>{step < 5 ? <button type="button" className="primary-button" onClick={next}>Continuer <span>→</span></button> : <button type="button" className="primary-button" onClick={() => setStep(1)}>Modifier mon projet</button>}</footer>
        </section>

        <aside className="live-summary">
          <span className="live-label">Construction — étape {step}/5</span>
          <div className="progressive-stage">
            <strong>{step === 1 ? 'Contour du projet' : step === 2 ? 'Lambourdes' : step === 3 ? 'Lambourdes + plots + hauteurs' : step === 4 ? 'Structure + rives' : 'Terrasse finie'}</strong>
            <small>{step === 1 ? 'Les réservations et dimensions définissent la forme.' : step === 2 ? 'La lame choisie détermine l’entraxe documenté.' : step === 3 ? 'Les appuis sont implantés et leur hauteur est calculée selon les niveaux saisis.' : step === 4 ? 'L’habillage et ses supports verticaux sont ajoutés.' : 'Les lames recouvrent la structure.'}</small>
          </div>
          <div className="live-preview"><Plan2D input={project} basket={result.basket} supportPlan={result.supportPlan} layers={progressiveLayers} /></div>
          {step === 4 && <div className="live-side-preview"><SideView input={project} basket={result.basket} supportPlan={result.supportPlan} layers={progressiveLayers} /></div>}
          <div className="live-stats"><div><span>Surface nette</span><strong>{result.geometry ? `${result.geometry.areaM2.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²` : '—'}</strong></div><div><span>Réservations</span><strong>{project.obstacles.length}</strong></div><div><span>Budget matériel</span><strong>{liveBudget}</strong></div></div>
          <div className="speedarti-note"><span>✓</span><p>Le projet peut être partagé, repris par un conseiller et préparé pour devis/panier. Les connexions réelles restent désactivées dans la démo.</p></div>
          <code className="version-code">{VERSION_TAG}</code>
        </aside>
      </main>
    </div>
  );
}
