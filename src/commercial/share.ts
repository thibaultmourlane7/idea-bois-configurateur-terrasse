import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput, ShapeType, TerraceObstacle } from '../domain/types';

export interface ShareSnapshotV2 {
  v: 2;
  projectName: string;
  shape: ProjectInput['shape'];
  dimensions: ProjectInput['dimensions'];
  obstacles: TerraceObstacle[];
  heightCm: number;
  supportType: ProjectInput['supportType'];
  supportSystem: ProjectInput['supportSystem'];
  edgeFinishMode: ProjectInput['edgeFinishMode'];
  includeGeotextile: boolean;
  drainage: ProjectInput['drainage'];
  orientation: ProjectInput['orientation'];
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
  return value === 'l-shape' || value === 't-shape' || value === 'u-shape' || value === 'circle' ? value : 'rectangle';
}

export function projectToShareToken(project: ProjectInput): string {
  const snapshot: ShareSnapshotV2 = {
    v: 2,
    projectName: project.projectName,
    shape: project.shape,
    dimensions: project.dimensions,
    obstacles: project.obstacles,
    heightCm: project.heightCm,
    supportType: project.supportType,
    supportSystem: project.supportSystem,
    edgeFinishMode: project.edgeFinishMode,
    includeGeotextile: project.includeGeotextile,
    drainage: project.drainage,
    orientation: project.orientation,
    boardId: project.board.id,
  };
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(snapshot)));
}

export function projectFromShareToken(token: string, fallback: ProjectInput): ProjectInput {
  try {
    const raw = new TextDecoder().decode(base64UrlToBytes(token));
    const snapshot = JSON.parse(raw) as Omit<Partial<ShareSnapshotV2>, 'v'> & { v?: number };
    if ((snapshot.v !== 1 && snapshot.v !== 2) || !snapshot.boardId || !snapshot.dimensions) return fallback;
    const board = ideaBoisBoards.find((item) => item.id === snapshot.boardId);
    if (!board) return fallback;

    return {
      ...fallback,
      projectName: typeof snapshot.projectName === 'string' ? snapshot.projectName : fallback.projectName,
      shape: validShape(snapshot.shape),
      dimensions: { ...fallback.dimensions, ...snapshot.dimensions },
      obstacles: Array.isArray(snapshot.obstacles) ? snapshot.obstacles : [],
      heightCm: Number(snapshot.heightCm) || fallback.heightCm,
      supportType: snapshot.supportType ?? fallback.supportType,
      supportSystem: snapshot.supportSystem ?? fallback.supportSystem,
      edgeFinishMode: snapshot.edgeFinishMode ?? fallback.edgeFinishMode,
      includeGeotextile: Boolean(snapshot.includeGeotextile),
      drainage: snapshot.drainage ?? fallback.drainage,
      orientation: snapshot.orientation ?? fallback.orientation,
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
