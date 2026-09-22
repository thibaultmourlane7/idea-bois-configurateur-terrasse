import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput, ShapeType, TerraceObstacle } from '../domain/types';

export const LOCAL_PROJECT_KEY = 'idea-bois-terrasse-v014';
const LEGACY_KEYS = ['idea-bois-terrasse-v013', 'idea-bois-terrasse-v011', 'idea-bois-terrasse-v010', 'idea-bois-terrasse-v09'];

function validShape(value: unknown): ShapeType {
  return value === 'l-shape' || value === 't-shape' || value === 'u-shape' || value === 'circle' ? value : 'rectangle';
}

export function saveProjectLocally(project: ProjectInput): void {
  const snapshot = {
    schemaVersion: 3,
    projectName: project.projectName,
    shape: project.shape,
    dimensions: project.dimensions,
    obstacles: project.obstacles,
    heightCm: project.heightCm,
    supportType: project.supportType,
    supportSystem: project.supportSystem,
    edgeFinishMode: project.edgeFinishMode,
    edgeCladdingHeightCm: project.edgeCladdingHeightCm,
    includeGeotextile: project.includeGeotextile,
    drainage: project.drainage,
    orientation: project.orientation,
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
    heightCm: Number(snapshot.heightCm) || fallback.heightCm,
    supportType: (snapshot.supportType as ProjectInput['supportType']) ?? fallback.supportType,
    supportSystem: (snapshot.supportSystem as ProjectInput['supportSystem']) ?? fallback.supportSystem,
    edgeFinishMode: (snapshot.edgeFinishMode as ProjectInput['edgeFinishMode']) ?? fallback.edgeFinishMode,
    edgeCladdingHeightCm: Number(snapshot.edgeCladdingHeightCm) || fallback.edgeCladdingHeightCm,
    includeGeotextile: Boolean(snapshot.includeGeotextile),
    drainage: (snapshot.drainage as ProjectInput['drainage']) ?? fallback.drainage,
    orientation: (snapshot.orientation as ProjectInput['orientation']) ?? fallback.orientation,
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
