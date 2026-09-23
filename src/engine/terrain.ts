import type { LayingZone, ProjectInput, TerracePoint } from '../domain/types';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from './geometry';
import { pointInZone } from './layingGeometry';

export const TERRAIN_TAG = 'SA-TERR-TERRAIN-120';
const EPS_M = 0.001;
const EPS_MM = 0.5;

export interface TerrainPlatform {
  id: string;
  label: string;
  isMain: boolean;
  points: TerracePoint[];
  finishedLevelOffsetMm: number;
  supportLevelOffsetMm: number;
  targetSlopeXPercent: number;
  targetSlopeYPercent: number;
}

export interface TerrainRelation {
  id: string;
  aPlatformId: string;
  aLabel: string;
  bPlatformId: string;
  bLabel: string;
  sharedBoundaryLengthM: number;
  finishedDeltaMinMm: number;
  finishedDeltaMaxMm: number;
  supportDeltaMinMm: number;
  supportDeltaMaxMm: number;
  transitionRequired: boolean;
}

export interface TerrainModel {
  tag: typeof TERRAIN_TAG;
  platforms: TerrainPlatform[];
  relations: TerrainRelation[];
  transitionCount: number;
  minFinishedDeltaMm: number;
  maxFinishedDeltaMm: number;
  diagnostics: string[];
}

function globalSlope(input: ProjectInput): { x: number; y: number } {
  return {
    x: input.supportLevelProfile?.targetSlopeXPercent ?? 0,
    y: input.supportLevelProfile?.targetSlopeYPercent ?? 0,
  };
}

export function zoneAsPlatform(input: ProjectInput, zone: LayingZone): TerrainPlatform {
  const slope = globalSlope(input);
  return {
    id: zone.id,
    label: zone.label,
    isMain: false,
    points: zone.points,
    finishedLevelOffsetMm: zone.finishedLevelOffsetMm ?? 0,
    supportLevelOffsetMm: zone.supportLevelOffsetMm ?? 0,
    targetSlopeXPercent: zone.targetSlopeXPercent ?? slope.x,
    targetSlopeYPercent: zone.targetSlopeYPercent ?? slope.y,
  };
}

export function mainTerrainPlatform(input: ProjectInput): TerrainPlatform {
  const slope = globalSlope(input);
  return {
    id: 'main',
    label: 'Plateforme principale',
    isMain: true,
    points: getDeckOutlinePointsM(input).map((point) => ({ xM: point.x, yM: point.y })),
    finishedLevelOffsetMm: 0,
    supportLevelOffsetMm: 0,
    targetSlopeXPercent: slope.x,
    targetSlopeYPercent: slope.y,
  };
}

export function terrainPlatforms(input: ProjectInput): TerrainPlatform[] {
  return [mainTerrainPlatform(input), ...(input.layingZones ?? []).map((zone) => zoneAsPlatform(input, zone))];
}

function platformForPoint(input: ProjectInput, xM: number, yM: number, preferredZoneId?: string): TerrainPlatform {
  if (preferredZoneId && preferredZoneId !== 'main') {
    const explicit = (input.layingZones ?? []).find((zone) => zone.id === preferredZoneId);
    if (explicit) return zoneAsPlatform(input, explicit);
  }
  const point = { xM, yM };
  const zone = (input.layingZones ?? []).find((candidate) => pointInZone(point, candidate));
  return zone ? zoneAsPlatform(input, zone) : mainTerrainPlatform(input);
}

function baseSupportDeltaMm(input: ProjectInput, xM: number, yM: number): number {
  const profile = input.supportLevelProfile;
  if (!profile || profile.mode === 'flat') return 0;
  const bounds = getDeckBoundingSizeM(input);
  const tx = Math.min(1, Math.max(0, xM / Math.max(EPS_M, bounds.lengthM)));
  const ty = Math.min(1, Math.max(0, yM / Math.max(EPS_M, bounds.widthM)));
  const q00 = 0;
  const q10 = profile.topRightDeltaMm - profile.topLeftDeltaMm;
  const q11 = profile.bottomRightDeltaMm - profile.topLeftDeltaMm;
  const q01 = profile.bottomLeftDeltaMm - profile.topLeftDeltaMm;
  const top = q00 * (1 - tx) + q10 * tx;
  const bottom = q01 * (1 - tx) + q11 * tx;
  return top * (1 - ty) + bottom * ty;
}

export function supportSurfaceDeltaMm(input: ProjectInput, xM: number, yM: number, preferredZoneId?: string): number {
  const platform = platformForPoint(input, xM, yM, preferredZoneId);
  return baseSupportDeltaMm(input, xM, yM) + platform.supportLevelOffsetMm;
}

export function targetFinishedDeltaMm(input: ProjectInput, xM: number, yM: number, preferredZoneId?: string): number {
  const platform = platformForPoint(input, xM, yM, preferredZoneId);
  return platform.finishedLevelOffsetMm
    + xM * platform.targetSlopeXPercent * 10
    + yM * platform.targetSlopeYPercent * 10;
}

export function terrainPlatformAt(input: ProjectInput, xM: number, yM: number, preferredZoneId?: string): TerrainPlatform {
  return platformForPoint(input, xM, yM, preferredZoneId);
}

function cross(a: TerracePoint, b: TerracePoint, c: TerracePoint): number {
  return (b.xM - a.xM) * (c.yM - a.yM) - (b.yM - a.yM) * (c.xM - a.xM);
}

function pointOnSegment(a: TerracePoint, b: TerracePoint, p: TerracePoint): boolean {
  if (Math.abs(cross(a, b, p)) > EPS_M) return false;
  return p.xM >= Math.min(a.xM, b.xM) - EPS_M
    && p.xM <= Math.max(a.xM, b.xM) + EPS_M
    && p.yM >= Math.min(a.yM, b.yM) - EPS_M
    && p.yM <= Math.max(a.yM, b.yM) + EPS_M;
}

function sharedCollinearLengthM(a1: TerracePoint, a2: TerracePoint, b1: TerracePoint, b2: TerracePoint): number {
  const adx = a2.xM - a1.xM;
  const ady = a2.yM - a1.yM;
  const length = Math.hypot(adx, ady);
  if (length <= EPS_M) return 0;
  if (Math.abs(cross(a1, a2, b1)) > EPS_M || Math.abs(cross(a1, a2, b2)) > EPS_M) return 0;

  const project = (p: TerracePoint) => ((p.xM - a1.xM) * adx + (p.yM - a1.yM) * ady) / (length * length);
  const bT1 = project(b1);
  const bT2 = project(b2);
  const start = Math.max(0, Math.min(bT1, bT2));
  const end = Math.min(1, Math.max(bT1, bT2));
  return Math.max(0, end - start) * length;
}

function sharedBoundaryLengthM(a: TerracePoint[], b: TerracePoint[]): number {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j += 1) {
      total += sharedCollinearLengthM(a1, a2, b[j], b[(j + 1) % b.length]);
    }
  }
  return total;
}

function segmentOnDeckBoundary(input: ProjectInput, a: TerracePoint, b: TerracePoint): boolean {
  const deck = getDeckOutlinePointsM(input).map((point) => ({ xM: point.x, yM: point.y }));
  return deck.some((c, index) => {
    const d = deck[(index + 1) % deck.length];
    return pointOnSegment(c, d, a) && pointOnSegment(c, d, b);
  });
}

function mainBoundaryInfo(
  input: ProjectInput,
  zone: LayingZone,
  allZones: LayingZone[],
): { lengthM: number; samples: TerracePoint[] } {
  let total = 0;
  const samples: TerracePoint[] = [];
  for (let i = 0; i < zone.points.length; i += 1) {
    const a = zone.points[i];
    const b = zone.points[(i + 1) % zone.points.length];
    if (segmentOnDeckBoundary(input, a, b)) continue;

    const length = Math.hypot(b.xM - a.xM, b.yM - a.yM);
    const sharedWithZones = allZones
      .filter((other) => other.id !== zone.id)
      .reduce((sum, other) => {
        let shared = 0;
        for (let j = 0; j < other.points.length; j += 1) {
          shared += sharedCollinearLengthM(a, b, other.points[j], other.points[(j + 1) % other.points.length]);
        }
        return sum + shared;
      }, 0);
    const exposed = Math.max(0, length - sharedWithZones);
    if (exposed <= EPS_M) continue;
    total += exposed;
    samples.push(a, b, { xM: (a.xM + b.xM) / 2, yM: (a.yM + b.yM) / 2 });
  }
  return { lengthM: total, samples };
}

function relationSamplePoints(a: TerrainPlatform, b: TerrainPlatform): TerracePoint[] {
  const candidates: TerracePoint[] = [];
  for (let i = 0; i < a.points.length; i += 1) {
    const a1 = a.points[i];
    const a2 = a.points[(i + 1) % a.points.length];
    for (let j = 0; j < b.points.length; j += 1) {
      const b1 = b.points[j];
      const b2 = b.points[(j + 1) % b.points.length];
      if (sharedCollinearLengthM(a1, a2, b1, b2) <= EPS_M) continue;
      if (pointOnSegment(b1, b2, a1)) candidates.push(a1);
      if (pointOnSegment(b1, b2, a2)) candidates.push(a2);
      if (pointOnSegment(a1, a2, b1)) candidates.push(b1);
      if (pointOnSegment(a1, a2, b2)) candidates.push(b2);
    }
  }
  if (!candidates.length) {
    const source = b.isMain ? a : b;
    for (let i = 0; i < source.points.length; i += 1) {
      const p1 = source.points[i];
      const p2 = source.points[(i + 1) % source.points.length];
      candidates.push({ xM: (p1.xM + p2.xM) / 2, yM: (p1.yM + p2.yM) / 2 });
    }
  }
  return candidates;
}

function finishedFor(platform: TerrainPlatform, xM: number, yM: number): number {
  return platform.finishedLevelOffsetMm
    + xM * platform.targetSlopeXPercent * 10
    + yM * platform.targetSlopeYPercent * 10;
}

function supportFor(input: ProjectInput, platform: TerrainPlatform, xM: number, yM: number): number {
  return baseSupportDeltaMm(input, xM, yM) + platform.supportLevelOffsetMm;
}

function makeRelation(
  input: ProjectInput,
  a: TerrainPlatform,
  b: TerrainPlatform,
  shared: number,
  samplesOverride?: TerracePoint[],
): TerrainRelation {
  const samples = samplesOverride?.length ? samplesOverride : relationSamplePoints(a, b);
  const finished = samples.map((point) => finishedFor(b, point.xM, point.yM) - finishedFor(a, point.xM, point.yM));
  const support = samples.map((point) => supportFor(input, b, point.xM, point.yM) - supportFor(input, a, point.xM, point.yM));
  const minFinished = finished.length ? Math.min(...finished) : b.finishedLevelOffsetMm - a.finishedLevelOffsetMm;
  const maxFinished = finished.length ? Math.max(...finished) : minFinished;
  const minSupport = support.length ? Math.min(...support) : b.supportLevelOffsetMm - a.supportLevelOffsetMm;
  const maxSupport = support.length ? Math.max(...support) : minSupport;

  return {
    id: `REL-${a.id}-${b.id}`,
    aPlatformId: a.id,
    aLabel: a.label,
    bPlatformId: b.id,
    bLabel: b.label,
    sharedBoundaryLengthM: shared,
    finishedDeltaMinMm: minFinished,
    finishedDeltaMaxMm: maxFinished,
    supportDeltaMinMm: minSupport,
    supportDeltaMaxMm: maxSupport,
    transitionRequired: Math.max(Math.abs(minFinished), Math.abs(maxFinished)) > EPS_MM,
  };
}

export function computeTerrainModel(input: ProjectInput): TerrainModel {
  const main = mainTerrainPlatform(input);
  const explicit = (input.layingZones ?? []).map((zone) => zoneAsPlatform(input, zone));
  const relations: TerrainRelation[] = [];

  const zones = input.layingZones ?? [];
  for (const platform of explicit) {
    const zone = zones.find((item) => item.id === platform.id)!;
    const boundary = mainBoundaryInfo(input, zone, zones);
    if (boundary.lengthM > EPS_M) relations.push(makeRelation(input, main, platform, boundary.lengthM, boundary.samples));
  }

  for (let i = 0; i < explicit.length; i += 1) {
    for (let j = i + 1; j < explicit.length; j += 1) {
      const shared = sharedBoundaryLengthM(explicit[i].points, explicit[j].points);
      if (shared > EPS_M) relations.push(makeRelation(input, explicit[i], explicit[j], shared));
    }
  }

  const finishedValues = [0, ...explicit.map((platform) => platform.finishedLevelOffsetMm)];
  const diagnostics = relations
    .filter((relation) => relation.transitionRequired)
    .map((relation) =>
      `${relation.aLabel} ↔ ${relation.bLabel} : écart de niveau fini ${relation.finishedDeltaMinMm.toFixed(0)} à ${relation.finishedDeltaMaxMm.toFixed(0)} mm. La transition physique reste à traiter sans escalier automatique au Sprint H.`
    );

  return {
    tag: TERRAIN_TAG,
    platforms: [main, ...explicit],
    relations,
    transitionCount: relations.filter((relation) => relation.transitionRequired).length,
    minFinishedDeltaMm: Math.min(...finishedValues),
    maxFinishedDeltaMm: Math.max(...finishedValues),
    diagnostics,
  };
}
