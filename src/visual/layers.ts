export interface ConstructionLayers {
  support: boolean;
  plots: boolean;
  joists: boolean;
  verticalJoists: boolean;
  edgeCladding: boolean;
  decking: boolean;
  obstacles: boolean;
}

export type VisualPreset = 'finished' | 'structure' | 'exploded' | 'custom';

export const FINISHED_LAYERS: ConstructionLayers = {
  support: false,
  plots: false,
  joists: false,
  verticalJoists: false,
  edgeCladding: true,
  decking: true,
  obstacles: true,
};

export const STRUCTURE_LAYERS: ConstructionLayers = {
  support: true,
  plots: true,
  joists: true,
  verticalJoists: true,
  edgeCladding: false,
  decking: false,
  obstacles: true,
};

export const EXPLODED_LAYERS: ConstructionLayers = {
  support: true,
  plots: true,
  joists: true,
  verticalJoists: true,
  edgeCladding: true,
  decking: true,
  obstacles: true,
};

export function layersForStep(step: number): ConstructionLayers {
  if (step <= 1) {
    return { support: true, plots: false, joists: false, verticalJoists: false, edgeCladding: false, decking: false, obstacles: true };
  }
  if (step === 2) {
    return { support: true, plots: false, joists: true, verticalJoists: false, edgeCladding: false, decking: false, obstacles: true };
  }
  if (step === 3) {
    return { support: true, plots: true, joists: true, verticalJoists: false, edgeCladding: false, decking: false, obstacles: true };
  }
  if (step === 4) {
    return { support: true, plots: true, joists: true, verticalJoists: true, edgeCladding: true, decking: false, obstacles: true };
  }
  return FINISHED_LAYERS;
}
