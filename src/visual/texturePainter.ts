import type { MaterialRenderProfile } from './materialProfiles';

export interface GrooveLine {
  ratio: number;
  shadowOpacity: number;
  highlightOpacity: number;
}

export function buildGrooveLines(profile?: MaterialRenderProfile): GrooveLine[] {
  if (!profile || profile.grooveStyle === 'none') return [];

  const lines: GrooveLine[] = [];
  for (const band of profile.grooveBands) {
    const count = Math.max(1, band.count);
    for (let i = 0; i < count; i += 1) {
      const ratio = count === 1
        ? (band.startRatio + band.endRatio) / 2
        : band.startRatio + ((band.endRatio - band.startRatio) * i) / (count - 1);
      lines.push({
        ratio,
        shadowOpacity: profile.grooveShadowOpacity,
        highlightOpacity: profile.grooveHighlightOpacity,
      });
    }
  }
  return lines;
}

export function boardOffsetFromRatio(ratio: number, boardWidthPx: number): number {
  return (ratio - 0.5) * boardWidthPx;
}

export function shouldRenderKnots(profile?: MaterialRenderProfile): boolean {
  return Boolean(profile && profile.knotFrequency !== 'none');
}
