import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput, ShapeType, TerraceObstacle, TerracePoint, SupportLevelProfile } from '../domain/types';
import { sanitizeReferencePlanTransform } from '../domain/referencePlan';

export const LOCAL_PROJECT_KEY = 'idea-bois-terrasse-v016';
const LEGACY_KEYS = ['idea-bois-terrasse-v015', 'idea-bois-terrasse-v014', 'idea-bois-terrasse-v013', 'idea-bois-terrasse-v011', 'idea-bois-terrasse-v010', 'idea-bois-terrasse-v09'];

function validShape(value: unknown): ShapeType {
  return value === 'l-shape'
    || value === 't-shape'
    || value === 'u-shape'
    || value === 'circle'
    || value === 'freeform'
    ? value
    : 'rectangle';
}

export function saveProjectLocally(project: ProjectInput): void {
  const snapshot = {
    schemaVersion: 14,
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
    stairs: project.stairs,
    guardrails: project.guardrails,
    boardId: project.board.id,
  };
  localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(snapshot));
}

function parseSnapshot(raw: string, fallback: ProjectInput): ProjectInput | null {
  const snapshot = JSON.parse(raw) as Record<string, unknown>;
  const boardId = typeof snapshot.boardId === 'string' ? snapshot.boardId : '';
  const board = ideaBoisBoards.find((item) => item.id === boardId);
  if (!board || !snapshot.dimensions) return null;

  return {
    ...fallback,
    projectName: typeof snapshot.projectName === 'string' ? snapshot.projectName : fallback.projectName,
    shape: validShape(snapshot.shape),
    dimensions: { ...fallback.dimensions, ...(snapshot.dimensions as Partial<ProjectInput['dimensions']>) },
    obstacles: Array.isArray(snapshot.obstacles) ? snapshot.obstacles as TerraceObstacle[] : [],
    freeformPoints: Array.isArray(snapshot.freeformPoints) ? snapshot.freeformPoints as TerracePoint[] : fallback.freeformPoints,
    referencePlan: sanitizeReferencePlanTransform(snapshot.referencePlan) ?? fallback.referencePlan,
    heightCm: Number(snapshot.heightCm) || fallback.heightCm,
    supportLevelProfile: (snapshot.supportLevelProfile as SupportLevelProfile | undefined) ?? fallback.supportLevelProfile,
    doubleJoistsAtButtJoints: Boolean(snapshot.doubleJoistsAtButtJoints),
    supportType: (snapshot.supportType as ProjectInput['supportType']) ?? fallback.supportType,
    supportSystem: (snapshot.supportSystem as ProjectInput['supportSystem']) ?? fallback.supportSystem,
    structureJoistChoice: snapshot.structureJoistChoice === 'pin-class4' || snapshot.structureJoistChoice === 'exotic'
      ? snapshot.structureJoistChoice
      : fallback.structureJoistChoice,
    edgeFinishMode: snapshot.edgeFinishMode === 'full-perimeter' || snapshot.edgeFinishMode === 'per-edge' ? snapshot.edgeFinishMode : 'none',
    edgeConfigs: Array.isArray(snapshot.edgeConfigs) ? snapshot.edgeConfigs as ProjectInput['edgeConfigs'] : fallback.edgeConfigs,
    edgeCladdingHeightCm: Number(snapshot.edgeCladdingHeightCm) || fallback.edgeCladdingHeightCm,
    includeGeotextile: Boolean(snapshot.includeGeotextile),
    drainage: (snapshot.drainage as ProjectInput['drainage']) ?? fallback.drainage,
    orientation: (snapshot.orientation as ProjectInput['orientation']) ?? fallback.orientation,
    layingDirection: snapshot.layingDirection === 'length' || snapshot.layingDirection === 'width' || snapshot.layingDirection === 'diagonal-45' || snapshot.layingDirection === 'diagonal--45'
      ? snapshot.layingDirection
      : fallback.layingDirection,
    layingStart: snapshot.layingStart === 'left' || snapshot.layingStart === 'right' || snapshot.layingStart === 'top' || snapshot.layingStart === 'bottom' || snapshot.layingStart === 'edge'
      ? snapshot.layingStart
      : fallback.layingStart,
    layingStartEdgeIndex: Number.isInteger(snapshot.layingStartEdgeIndex) ? Number(snapshot.layingStartEdgeIndex) : fallback.layingStartEdgeIndex,
    layingZones: Array.isArray(snapshot.layingZones) ? snapshot.layingZones as ProjectInput['layingZones'] : fallback.layingZones,
    layingPattern: snapshot.layingPattern === 'half' || snapshot.layingPattern === 'third' ? snapshot.layingPattern : 'straight',
    stairs: Array.isArray(snapshot.stairs) ? snapshot.stairs as ProjectInput['stairs'] : fallback.stairs,
    guardrails: Array.isArray(snapshot.guardrails) ? snapshot.guardrails as ProjectInput['guardrails'] : fallback.guardrails,
    board,
    joist: demoJoist,
    usage: 'residential',
  };
}

export function loadProjectLocally(fallback: ProjectInput): ProjectInput | null {
  try {
    const current = localStorage.getItem(LOCAL_PROJECT_KEY);
    if (current) return parseSnapshot(current, fallback);
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) return parseSnapshot(raw, fallback);
    }
    return null;
  } catch {
    return null;
  }
}

export function hasSavedProject(): boolean {
  try {
    return Boolean(localStorage.getItem(LOCAL_PROJECT_KEY) || LEGACY_KEYS.some((key) => localStorage.getItem(key)));
  } catch {
    return false;
  }
}
