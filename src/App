import { useMemo, useState } from 'react';
import { demoBoards } from './catalog/catalogue';
import { Diagnostics } from './components/Diagnostics';
import { Plan2D } from './components/Plan2D';
import { Preview3D } from './components/Preview3D';
import { Summary } from './components/Summary';
import type { BoardOrientation, ProjectInput, ShapeType } from './domain/types';
import { runConfigurator } from './engine/configurator';

const VERSION_TAG = 'IB-TERR-VERSION-001';

const initial: ProjectInput = {
  projectName: 'Terrasse démo IDEA Bois',
  shape: 'rectangle',
  dimensions: { lengthM: 6, widthM: 4, notchLengthM: 2, notchWidthM: 1.5 },
  orientation: 'length',
  board: demoBoards[0],
};

export default function App() {
  const [project, setProject] = useState<ProjectInput>(initial);
  const [tab, setTab] = useState<'2d' | '3d' | 'cuts' | 'trace'>('2d');
  const result = useMemo(() => runConfigurator(project), [project]);
  const patchDims = (key: keyof ProjectInput['dimensions'], value: number) =>
    setProject((p) => ({ ...p, dimensions: { ...p.dimensions, [key]: value } }));

  const saveLocal = () => {
    localStorage.setItem('idea-bois-terrasse-project', JSON.stringify(project));
    alert(`Projet enregistré localement — ${VERSION_TAG}`);
  };
  const loadLocal = () => {
    const raw = localStorage.getItem('idea-bois-terrasse-project');
    if (!raw) return alert('Aucun projet local sauvegardé.');
    setProject(JSON.parse(raw));
  };

  return <div className="app-shell">
    <header className="topbar">
      <div><div className="eyebrow">IDEA BOIS × SPEEDARTI</div><h1>Configurateur Terrasse</h1><p>Démo technique V0.5 — quantitatif matériel, 2D/3D, préparation ERP.</p></div>
      <div className="scope-badge">Aucune main-d’œuvre</div>
    </header>
    <main className="grid">
      <aside className="panel form-panel">
        <h2>Projet</h2>
        <label>Nom du projet<input value={project.projectName} onChange={(e) => setProject({ ...project, projectName: e.target.value })} /></label>
        <label>Forme<select value={project.shape} onChange={(e) => setProject({ ...project, shape: e.target.value as ShapeType })}><option value="rectangle">Rectangle</option><option value="l-shape">Forme en L</option></select></label>
        <div className="two">
          <label>Longueur (m)<input type="number" step="0.1" value={project.dimensions.lengthM} onChange={(e) => patchDims('lengthM', +e.target.value)} /></label>
          <label>Largeur (m)<input type="number" step="0.1" value={project.dimensions.widthM} onChange={(e) => patchDims('widthM', +e.target.value)} /></label>
        </div>
        {project.shape === 'l-shape' && <div className="two">
          <label>Décroché L (m)<input type="number" step="0.1" value={project.dimensions.notchLengthM} onChange={(e) => patchDims('notchLengthM', +e.target.value)} /></label>
          <label>Décroché l (m)<input type="number" step="0.1" value={project.dimensions.notchWidthM} onChange={(e) => patchDims('notchWidthM', +e.target.value)} /></label>
        </div>}

        <h2>Produit</h2>
        <label>Lame<select value={project.board.id} onChange={(e) => setProject({ ...project, board: demoBoards.find((b) => b.id === e.target.value)! })}>{demoBoards.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
        <div className="two">
          <label>Largeur (mm)<input type="number" value={project.board.widthMm} onChange={(e) => setProject({ ...project, board: { ...project.board, widthMm: +e.target.value } })} /></label>
          <label>Longueur (mm)<input type="number" value={project.board.lengthMm} onChange={(e) => setProject({ ...project, board: { ...project.board, lengthMm: +e.target.value } })} /></label>
        </div>
        <div className="two">
          <label>Jeu (mm)<input type="number" value={project.board.gapMm} onChange={(e) => setProject({ ...project, board: { ...project.board, gapMm: +e.target.value } })} /></label>
          <label>Prix TTC / m²<input placeholder="optionnel" type="number" value={project.board.priceTtcPerM2 ?? ''} onChange={(e) => setProject({ ...project, board: { ...project.board, priceTtcPerM2: e.target.value ? +e.target.value : undefined } })} /></label>
        </div>
        <label>Sens de pose<select value={project.orientation} onChange={(e) => setProject({ ...project, orientation: e.target.value as BoardOrientation })}><option value="length">Dans la longueur</option><option value="width">Dans la largeur</option></select></label>
        <div className="actions"><button onClick={saveLocal}>Sauvegarder</button><button className="secondary" onClick={loadLocal}>Recharger</button></div>
        <p className="small">Catalogue DEMO uniquement. Les références, prix et stocks IDEA Bois devront venir de l’ERP/PIM.</p>
      </aside>

      <section className="content">
        <Diagnostics items={result.diagnostics} />
        <Summary result={result} />
        <nav className="tabs">
          {(['2d','3d','cuts','trace'] as const).map((t) => <button key={t} className={tab===t?'active':''} onClick={() => setTab(t)}>{t === 'cuts' ? 'Plan de coupe' : t === 'trace' ? 'Traçabilité' : t.toUpperCase()}</button>)}
        </nav>
        {tab === '2d' && <Plan2D input={project} />}
        {tab === '3d' && <Preview3D input={project} />}
        {tab === 'cuts' && result.layout && <div className="panel body-panel"><h2>Plan de coupe</h2><div className="cut-list">{result.layout.stockBoards.map((b) => <div className="cut-row" key={b.index}><strong>Lame {b.index}</strong><div className="cutbar">{b.cuts.map((c) => <span key={c.pieceId} style={{ flex: c.lengthMm }}>{Math.round(c.lengthMm)} mm</span>)}{b.remainingMm > 0 && <i style={{ flex: b.remainingMm }}>{Math.round(b.remainingMm)} mm chute</i>}</div></div>)}</div><p className="small">Algorithme BFD déterministe avec réemploi des chutes. Pour un grand jeu de pièces, il ne constitue pas une preuve mathématique d’optimalité globale.</p></div>}
        {tab === 'trace' && <div className="panel trace"><h2>Journal de calcul</h2>{result.trace.map((line, i) => <code key={i}>{line}</code>)}</div>}
      </section>
    </main>
  </div>;
}
