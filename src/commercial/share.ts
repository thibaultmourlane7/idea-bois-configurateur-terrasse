import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput, ShapeType, TerraceObstacle, TerracePoint, SupportLevelProfile, ReferencePlanTransform } from '../domain/types';
import { sanitizeReferencePlanTransform } from '../domain/referencePlan';

export interface ShareSnapshotV11 {
  v: 11;
  projectName: string;
  shape: ProjectInput['shape'];
  dimensions: ProjectInput['dimensions'];
  obstacles: TerraceObstacle[];
  freeformPoints?: TerracePoint[];
  referencePlan?: ReferencePlanTransform;
  heightCm: number;
  supportLevelProfile?: SupportLevelProfile;
  doubleJoistsAtButtJoints?: boolean;
  supportType: ProjectInput['supportType'];
  supportSystem: ProjectInput['supportSystem'];
  structureJoistChoice?: ProjectInput['structureJoistChoice'];
  edgeFinishMode: ProjectInput['edgeFinishMode'];
  edgeConfigs?: ProjectInput['edgeConfigs'];
  edgeCladdingHeightCm: number;
  includeGeotextile: boolean;
  drainage: ProjectInput['drainage'];
  orientation: ProjectInput['orientation'];
  layingDirection?: ProjectInput['layingDirection'];
  layingStart?: ProjectInput['layingStart'];
  layingStartEdgeIndex?: number;
  layingZones?: ProjectInput['layingZones'];
  layingPattern?: ProjectInput['layingPattern'];
  boardId: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).split('+').join('-').split('/').join('_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.split('-').join('+').split('_').join('/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function validShape(value: unknown): ShapeType {
  return value === 'l-shape'
    || value === 't-shape'
    || value === 'u-shape'
    || value === 'circle'
    || value === 'freeform'
    ? value
    : 'rectangle';
}

export function projectToShareToken(project: ProjectInput): string {
  const snapshot: ShareSnapshotV11 = {
    v: 11,
    projectName: project.projectName,
    shape: project.shape,
    dimensions: project.dimensions,
    obstacles: project.obstacles,
    freeformPoints: project.freeformPoints,
    referencePlan: project.referencePlan,
    heightCm: project.heightCm,
    supportLevelProfile: project.supportLevelProfile,
    doubleJoistsAtButtJoints: Boolean(project.doubleJoistsAtButtJoints),
    supportType: project.supportType,
    supportSystem: project.supportSystem,
    structureJoistChoice: project.structureJoistChoice,
    edgeFinishMode: project.edgeFinishMode,
    edgeConfigs: project.edgeConfigs,
    edgeCladdingHeightCm: project.edgeCladdingHeightCm,
    includeGeotextile: project.includeGeotextile,
    drainage: project.drainage,
    orientation: project.orientation,
    layingDirection: project.layingDirection,
    layingStart: project.layingStart,
    layingStartEdgeIndex: project.layingStartEdgeIndex,
    layingZones: project.layingZones,
    layingPattern: project.layingPattern ?? 'straight',
    boardId: project.board.id,
  };
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(snapshot)));
}

export function projectFromShareToken(token: string, fallback: ProjectInput): ProjectInput {
  try {
    const raw = new TextDecoder().decode(base64UrlToBytes(token));
    const snapshot = JSON.parse(raw) as Omit<Partial<ShareSnapshotV11>, 'v'> & { v?: number };
    if ((snapshot.v !== 1 && snapshot.v !== 2 && snapshot.v !== 3 && snapshot.v !== 4 && snapshot.v !== 5 && snapshot.v !== 6 && snapshot.v !== 7 && snapshot.v !== 8 && snapshot.v !== 9 && snapshot.v !== 10 && snapshot.v !== 11) || !snapshot.boardId || !snapshot.dimensions) return fallback;
    const board = ideaBoisBoards.find((item) => item.id === snapshot.boardId);
    if (!board) return fallback;

    return {
      ...fallback,
      projectName: typeof snapshot.projectName === 'string' ? snapshot.projectName : fallback.projectName,
      shape: validShape(snapshot.shape),
      dimensions: { ...fallback.dimensions, ...snapshot.dimensions },
      obstacles: Array.isArray(snapshot.obstacles) ? snapshot.obstacles : [],
      freeformPoints: Array.isArray(snapshot.freeformPoints) ? snapshot.freeformPoints : fallback.freeformPoints,
      referencePlan: sanitizeReferencePlanTransform(snapshot.referencePlan) ?? fallback.referencePlan,
      heightCm: Number(snapshot.heightCm) || fallback.heightCm,
      supportLevelProfile: snapshot.supportLevelProfile ?? fallback.supportLevelProfile,
      doubleJoistsAtButtJoints: Boolean(snapshot.doubleJoistsAtButtJoints),
      supportType: snapshot.supportType ?? fallback.supportType,
      supportSystem: snapshot.supportSystem ?? fallback.supportSystem,
      structureJoistChoice: snapshot.structureJoistChoice === 'pin-class4' || snapshot.structureJoistChoice === 'exotic'
        ? snapshot.structureJoistChoice
        : fallback.structureJoistChoice,
      edgeFinishMode: snapshot.edgeFinishMode === 'full-perimeter' || snapshot.edgeFinishMode === 'per-edge' ? snapshot.edgeFinishMode : 'none',
      edgeConfigs: Array.isArray(snapshot.edgeConfigs) ? snapshot.edgeConfigs : fallback.edgeConfigs,
      edgeCladdingHeightCm: Number(snapshot.edgeCladdingHeightCm) || fallback.edgeCladdingHeightCm,
      includeGeotextile: Boolean(snapshot.includeGeotextile),
      drainage: snapshot.drainage ?? fallback.drainage,
      orientation: snapshot.orientation ?? fallback.orientation,
      layingDirection: snapshot.layingDirection === 'length' || snapshot.layingDirection === 'width' || snapshot.layingDirection === 'diagonal-45' || snapshot.layingDirection === 'diagonal--45'
        ? snapshot.layingDirection
        : fallback.layingDirection,
      layingStart: snapshot.layingStart === 'left' || snapshot.layingStart === 'right' || snapshot.layingStart === 'top' || snapshot.layingStart === 'bottom' || snapshot.layingStart === 'edge'
        ? snapshot.layingStart
        : fallback.layingStart,
      layingStartEdgeIndex: Number.isInteger(snapshot.layingStartEdgeIndex) ? snapshot.layingStartEdgeIndex : fallback.layingStartEdgeIndex,
      layingZones: Array.isArray(snapshot.layingZones) ? snapshot.layingZones : fallback.layingZones,
      layingPattern: snapshot.layingPattern === 'half' || snapshot.layingPattern === 'third' ? snapshot.layingPattern : 'straight',
      board,
      joist: demoJoist,
      usage: 'residential',
    };
  } catch {
    return fallback;
  }
}

export function buildShareUrl(project: ProjectInput, currentHref: string): string {
  const url = new URL(currentHref);
  url.searchParams.set('project', projectToShareToken(project));
  url.hash = '';
  return url.toString();
}

export function restoreProjectFromUrl(fallback: ProjectInput, currentHref: string): ProjectInput {
  try {
    const url = new URL(currentHref);
    const token = url.searchParams.get('project');
    return token ? projectFromShareToken(token, fallback) : fallback;
  } catch {
    return fallback;
  }
}
