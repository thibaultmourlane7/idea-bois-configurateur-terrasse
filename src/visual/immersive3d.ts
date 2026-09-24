import type { LayoutResult } from '../domain/types';
import type { Scene3DModel, Scene3DPoint } from '../engine/scene3d';

export interface ImmersiveCameraFrame {
  targetXM: number;
  targetYM: number;
  targetZM: number;
  radiusM: number;
  cameraXM: number;
  cameraYM: number;
  cameraZM: number;
}

export interface ImmersiveSceneSummary {
  boards: number;
  joists: number;
  supports: number;
  stairs: number;
  stairTreads: number;
  guardrails: number;
  guardrailPosts: number;
  obstacles: number;
}

export function computeImmersiveCameraFrame(scene: Scene3DModel): ImmersiveCameraFrame {
  const targetXM = (scene.bounds.minXM + scene.bounds.maxXM) / 2;
  const targetYM = (scene.bounds.minYM + scene.bounds.maxYM) / 2;
  const targetZM = scene.bounds.minZM + (scene.bounds.maxZM - scene.bounds.minZM) * .38;
  const horizontal = Math.hypot(scene.bounds.lengthM, scene.bounds.widthM);
  const vertical = Math.max(.35, scene.bounds.maxZM - scene.bounds.minZM);
  const radiusM = Math.max(3.2, horizontal * .92 + vertical * 1.7);

  return {
    targetXM,
    targetYM,
    targetZM,
    radiusM,
    cameraXM: targetXM + radiusM * .82,
    cameraYM: targetYM + radiusM * .95,
    cameraZM: targetZM + radiusM * .62,
  };
}

export function immersiveSceneSummary(scene: Scene3DModel): ImmersiveSceneSummary {
  return {
    boards: scene.boards.length,
    joists: scene.joists.length,
    supports: scene.supports.length,
    stairs: scene.stairs.length,
    stairTreads: scene.stairs.reduce((sum, stair) => sum + stair.treads.length, 0),
    guardrails: scene.guardrails.length,
    guardrailPosts: scene.guardrails.reduce((sum, guardrail) => sum + guardrail.posts.length, 0),
    obstacles: scene.obstacles.length,
  };
}


export interface ImmersiveButtJointMarker {
  id: string;
  start: Scene3DPoint;
  end: Scene3DPoint;
}

/**
 * Convertit uniquement les vrais raccords calculés par le moteur en petits
 * marqueurs transversaux destinés au rendu 3D. Aucun raccord n'est inventé.
 */
export function immersiveButtJointMarkers(
  scene: Scene3DModel,
  layout?: LayoutResult,
): ImmersiveButtJointMarker[] {
  if (!layout?.buttJoints?.length) return [];

  const markers: ImmersiveButtJointMarker[] = [];
  for (const joint of layout.buttJoints) {
    if (
      joint.xM == null || joint.yM == null ||
      joint.normalX == null || joint.normalY == null
    ) continue;

    const candidates = scene.boards.map((board) => {
      const startCenter = {
        xM: (board.top[0].xM + board.top[1].xM) / 2,
        yM: (board.top[0].yM + board.top[1].yM) / 2,
        zM: (board.top[0].zM + board.top[1].zM) / 2,
      };
      const endCenter = {
        xM: (board.top[2].xM + board.top[3].xM) / 2,
        yM: (board.top[2].yM + board.top[3].yM) / 2,
        zM: (board.top[2].zM + board.top[3].zM) / 2,
      };
      const startDistance = Math.hypot(startCenter.xM - joint.xM!, startCenter.yM - joint.yM!);
      const endDistance = Math.hypot(endCenter.xM - joint.xM!, endCenter.yM - joint.yM!);
      return startDistance <= endDistance
        ? { board, center: startCenter, distance: startDistance }
        : { board, center: endCenter, distance: endDistance };
    });

    const match = candidates
      .filter((candidate) => candidate.board.zoneId === (joint.zoneId ?? 'main'))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!match || match.distance > .012) continue;

    const boardAtJoint = match.board;
    const zM = match.center.zM;

    const halfWidthM = boardAtJoint.widthM * .49;
    markers.push({
      id: joint.id,
      start: {
        xM: joint.xM - joint.normalX * halfWidthM,
        yM: joint.yM - joint.normalY * halfWidthM,
        zM,
      },
      end: {
        xM: joint.xM + joint.normalX * halfWidthM,
        yM: joint.yM + joint.normalY * halfWidthM,
        zM,
      },
    });
  }
  return markers;
}
