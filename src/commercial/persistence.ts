import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';

export const LOCAL_PROJECT_KEY = 'idea-bois-terrasse-v011';

export function saveProjectLocally(project: ProjectInput): void {
  const snapshot = {
    projectName: project.projectName,
    shape: project.shape,
    dimensions: project.dimensions,
    heightCm: project.heightCm,
    supportType: project.supportType,
    supportSystem: project.supportSystem,
    edgeFinishMode: project.edgeFinishMode,
    includeGeotextile: project.includeGeotextile,
    drainage: project.drainage,
    orientation: project.orientation,
    boardId: project.board.id,
  };
  localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(snapshot));
}

export function loadProjectLocally(fallback: ProjectInput): ProjectInput | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Record<string, unknown>;
    const boardId = typeof snapshot.boardId === 'string' ? snapshot.boardId : '';
    const board = ideaBoisBoards.find((item) => item.id === boardId);
    if (!board || !snapshot.dimensions) return null;

    return {
      ...fallback,
      projectName: typeof snapshot.projectName === 'string' ? snapshot.projectName : fallback.projectName,
      shape: snapshot.shape === 'l-shape' ? 'l-shape' : 'rectangle',
      dimensions: snapshot.dimensions as ProjectInput['dimensions'],
      heightCm: Number(snapshot.heightCm) || fallback.heightCm,
      supportType: (snapshot.supportType as ProjectInput['supportType']) ?? fallback.supportType,
      supportSystem: (snapshot.supportSystem as ProjectInput['supportSystem']) ?? fallback.supportSystem,
      edgeFinishMode: (snapshot.edgeFinishMode as ProjectInput['edgeFinishMode']) ?? fallback.edgeFinishMode,
      includeGeotextile: Boolean(snapshot.includeGeotextile),
      drainage: (snapshot.drainage as ProjectInput['drainage']) ?? fallback.drainage,
      orientation: (snapshot.orientation as ProjectInput['orientation']) ?? fallback.orientation,
      board,
      joist: demoJoist,
      usage: 'residential',
    };
  } catch {
    return null;
  }
}

export function hasSavedProject(): boolean {
  try {
    return Boolean(localStorage.getItem(LOCAL_PROJECT_KEY));
  } catch {
    return false;
  }
}
