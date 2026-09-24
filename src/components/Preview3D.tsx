import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import type { BasketResult, LayoutResult, ProjectInput, SupportPlanResult } from '../domain/types';
import { buildProfessional3DScene } from '../engine/scene3d';
import { FINISHED_LAYERS, type ConstructionLayers } from '../visual/layers';
import { resolveBoardTexture, textureStatusLabel } from '../visual/resolveBoardTexture';

import { TechnicalPreview3D } from './TechnicalPreview3D';

const RealisticPreview3D = lazy(() =>
  import('./RealisticPreview3D').then((module) => ({ default: module.RealisticPreview3D })),
);

class Immersive3DErrorBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('3D immersive indisponible :', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="immersive3d-load-error">
          <strong>La vue 3D réaliste n’a pas pu démarrer sur cet appareil.</strong>
          <span>Le configurateur reste disponible : utilisez la vue technique.</span>
          <button type="button" onClick={this.props.onFallback}>Passer en vue technique</button>
        </div>
      );
    }
    return this.props.children;
  }
}


export function Preview3D({
  input,
  supportPlan,
  layout,
  layers = FINISHED_LAYERS,
  exploded = false,
}: {
  input: ProjectInput;
  basket?: BasketResult;
  supportPlan?: SupportPlanResult;
  layout?: LayoutResult;
  layers?: ConstructionLayers;
  exploded?: boolean;
}) {
  const [mode, setMode] = useState<'realistic' | 'technical'>('realistic');
  const [handActive, setHandActive] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const scene = useMemo(
    () => buildProfessional3DScene(input, layout, supportPlan),
    [input, layout, supportPlan],
  );
  const texture = resolveBoardTexture(input.board);

  return (
    <div className="preview3d-mode-shell">
      <div className="preview3d-global-mode" aria-label="Mode de vue 3D">
        <div className="segmented small-segmented">
          <button type="button" className={mode === 'realistic' ? 'active' : ''} onClick={() => setMode('realistic')}>
            Vue réaliste
          </button>
          <button type="button" className={mode === 'technical' ? 'active' : ''} onClick={() => setMode('technical')}>
            Vue technique
          </button>
        </div>
        <span>La géométrie et les quantités restent identiques dans les deux vues.</span>
      </div>

      {mode === 'technical' ? (
        <TechnicalPreview3D
          input={input}
          supportPlan={supportPlan}
          layout={layout}
          layers={layers}
          exploded={exploded}
        />
      ) : (
        <div className="visual-card professional-3d immersive3d-card">
          <div className="visual-title">
            <span>3D réaliste immersive</span>
            <code>SA-TERR-3D-IMMERSIVE-160</code>
          </div>

          <div className="immersive3d-toolbar">
            <div>
              <button
                type="button"
                className={handActive ? 'hand-tool active' : 'hand-tool'}
                aria-pressed={handActive}
                onClick={() => setHandActive((current) => !current)}
              >
                <span aria-hidden="true">✋</span>
                Main
              </button>
              <button type="button" className="camera-reset" onClick={() => setResetKey((value) => value + 1)}>
                Recentrer
              </button>
            </div>
            <small>Vue client réaliste par défaut • la main agit uniquement sur la caméra</small>
          </div>

          <Immersive3DErrorBoundary onFallback={() => setMode('technical')}>
            <Suspense fallback={
              <div className="immersive3d-loading">
                <strong>Chargement de la 3D réaliste…</strong>
                <span>Le reste du configurateur est déjà disponible.</span>
              </div>
            }>
              <RealisticPreview3D
                input={input}
                supportPlan={supportPlan}
                layout={layout}
                layers={layers}
                exploded={exploded}
                handActive={handActive}
                resetKey={resetKey}
              />
            </Suspense>
          </Immersive3DErrorBoundary>

          <div className="construction-legend">
            {layers.decking && <span><i className="legend-decking" />{scene.boards.length} lames / segments réels</span>}
            {layers.joists && <span><i className="legend-joist" />{scene.joists.length} lambourdes</span>}
            {layers.plots && <span><i className="legend-plot" />{scene.supports.length} points d’appui</span>}
            {layers.edgeCladding && scene.edges.some((edge) => edge.treatment !== 'none') && <span><i className="legend-edge" />Rives configurées</span>}
            {scene.terrain.platforms.length > 1 && <span className="terrain-3d-badge">{scene.terrain.platforms.length} plateformes</span>}
            {scene.stairs.length > 0 && <span className="terrain-3d-badge">{scene.stairs.length} escalier(s)</span>}
            {scene.guardrails.length > 0 && <span className="terrain-3d-badge">{scene.guardrails.length} garde-corps</span>}
          </div>

          <div className={`texture-quality-note ${texture.status}`}>
            <strong>{textureStatusLabel(texture)}</strong>
            <span>{texture.label}</span>
            <small>Éclairage, ombres et matière améliorent la projection client ; les textures « proches » ne sont jamais présentées comme la photo exacte du produit.</small>
          </div>
        </div>
      )}
    </div>
  );
}
