import type { Scene3DModel } from '../engine/scene3d';

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
