import type { BoardSpec } from '../domain/types';

export interface GrooveBand {
  startRatio: number;
  endRatio: number;
  count: number;
}

export interface MaterialRenderProfile {
  id: string;
  boardIds: string[];
  grooveStyle: 'none' | 'marked' | 'deep';
  grooveBands: GrooveBand[];
  grooveShadowOpacity: number;
  grooveHighlightOpacity: number;
  boardEdgeOpacity: number;
  variantCount: number;
  knotFrequency: 'none' | 'low' | 'medium';
  grainContrast: number;
  note: string;
}

export const materialProfiles: MaterialRenderProfile[] = [
  {
    id: 'pin-nord-strie-vert-b1',
    boardIds: ['IDEA-TERR-G028'],
    grooveStyle: 'deep',
    grooveBands: [
      { startRatio: 0.035, endRatio: 0.31, count: 13 },
      { startRatio: 0.69, endRatio: 0.965, count: 13 },
    ],
    grooveShadowOpacity: 0.58,
    grooveHighlightOpacity: 0.22,
    boardEdgeOpacity: 0.72,
    variantCount: 4,
    knotFrequency: 'medium',
    grainContrast: 1.08,
    note: 'Profil visuel B1 calibré sur une vue de dessus de pin du nord strié : deux zones fortement rainurées et bande centrale plus lisse.',
  },
  {
    id: 'pin-nord-strie-marron-b1',
    boardIds: ['IDEA-TERR-G030'],
    grooveStyle: 'deep',
    grooveBands: [
      { startRatio: 0.035, endRatio: 0.31, count: 13 },
      { startRatio: 0.69, endRatio: 0.965, count: 13 },
    ],
    grooveShadowOpacity: 0.62,
    grooveHighlightOpacity: 0.20,
    boardEdgeOpacity: 0.76,
    variantCount: 4,
    knotFrequency: 'medium',
    grainContrast: 1.10,
    note: 'Même géométrie de stries que le vert, avec contraste renforcé pour la finition marron.',
  },
];

export function resolveMaterialProfile(board: BoardSpec): MaterialRenderProfile | undefined {
  return materialProfiles.find((profile) => profile.boardIds.includes(board.id));
}
