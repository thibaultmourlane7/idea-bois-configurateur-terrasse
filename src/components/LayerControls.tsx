import type { ConstructionLayers, VisualPreset } from '../visual/layers';
import { EXPLODED_LAYERS, FINISHED_LAYERS, STRUCTURE_LAYERS } from '../visual/layers';

const labels: Array<[keyof ConstructionLayers, string]> = [
  ['decking', 'Lames'],
  ['edgeCladding', 'Rives'],
  ['joists', 'Lambourdes'],
  ['verticalJoists', 'Lambourdes verticales'],
  ['plots', 'Plots'],
  ['obstacles', 'Réservations'],
  ['support', 'Support'],
];

export function LayerControls({
  preset,
  layers,
  onPreset,
  onLayers,
}: {
  preset: VisualPreset;
  layers: ConstructionLayers;
  onPreset: (preset: VisualPreset, layers: ConstructionLayers) => void;
  onLayers: (layers: ConstructionLayers) => void;
}) {
  const choosePreset = (next: Exclude<VisualPreset, 'custom'>) => {
    const nextLayers = next === 'finished' ? FINISHED_LAYERS : next === 'structure' ? STRUCTURE_LAYERS : EXPLODED_LAYERS;
    onPreset(next, { ...nextLayers });
  };

  return (
    <div className="layer-panel">
      <div className="layer-presets">
        <button type="button" className={preset === 'finished' ? 'active' : ''} onClick={() => choosePreset('finished')}>Fini</button>
        <button type="button" className={preset === 'structure' ? 'active' : ''} onClick={() => choosePreset('structure')}>Structure</button>
        <button type="button" className={preset === 'exploded' ? 'active' : ''} onClick={() => choosePreset('exploded')}>Éclaté</button>
      </div>
      <div className="layer-toggles">
        {labels.map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={(event) => onLayers({ ...layers, [key]: event.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
