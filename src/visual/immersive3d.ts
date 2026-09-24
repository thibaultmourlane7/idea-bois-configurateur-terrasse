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

    const boardAtJoint = scene.boards.find((board) =>
      [...board.top].some((point) =>
        Math.hypot(point.xM - joint.xM!, point.yM - joint.yM!) < .012
      )
    );
    if (!boardAtJoint) continue;

    const closeZ = [...boardAtJoint.top]
      .filter((point) =>
        Math.hypot(point.xM - joint.xM!, point.yM - joint.yM!) < boardAtJoint.widthM * 1.2
      )
      .map((point) => point.zM);
    const zM = closeZ.length
      ? closeZ.reduce((sum, value) => sum + value, 0) / closeZ.length
      : boardAtJoint.top.reduce((sum, point) => sum + point.zM, 0) / boardAtJoint.top.length;

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
