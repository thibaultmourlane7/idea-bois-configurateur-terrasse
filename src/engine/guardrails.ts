import type {
  GuardrailConfig,
  GuardrailStairSide,
  GuardrailTargetType,
  ProjectInput,
  TerracePoint,
} from '../domain/types';
import { computeTerraceEdges } from './edges';
import { computeStairs } from './stairs';
import { targetFinishedDeltaMm } from './terrain';

export const GUARDRAIL_TAG = 'SA-TERR-GUARD-140';

export interface GuardrailPoint3D extends TerracePoint {
  zM: number;
}

export interface GuardrailPost {
  id: string;
  base: GuardrailPoint3D;
  top: GuardrailPoint3D;
}

export interface GuardrailSection {
  id: string;
  startPostId: string;
  endPostId: string;
  startTop: GuardrailPoint3D;
  endTop: GuardrailPoint3D;
  lengthM: number;
}

export interface GuardrailResult {
  id: string;
  label: string;
  targetType: GuardrailTargetType;
  targetLabel: string;
  status: 'ready' | 'pending' | 'invalid';
  issues: string[];
  edgeIndex?: number;
  stairId?: string;
  stairSide?: GuardrailStairSide;
  heightMm?: number;
  postCount?: number;
  sectionCount?: number;
  postSectionWidthMm?: number;
  postSectionDepthMm?: number;
  planLengthM?: number;
  slopeLengthM?: number;
  averageSectionLengthM?: number;
  systemReference?: string;
  postReference?: string;
  sectionReference?: string;
  fixingReference?: string;
  note?: string;
  posts: GuardrailPost[];
  sections: GuardrailSection[];
}

interface GuardrailAxis {
  targetLabel: string;
  start: GuardrailPoint3D;
  end: GuardrailPoint3D;
  planLengthM: number;
  slopeLengthM: number;
}

function modeLabel(config: GuardrailConfig): string {
  if (config.targetType === 'terrace-edge') return `Rive ${config.edgeIndex != null ? config.edgeIndex + 1 : '?'}`;
  return `Escalier ${config.stairId ?? '?'} — côté ${config.stairSide === 'right' ? 'droit' : 'gauche'}`;
}

function baseResult(
  config: GuardrailConfig,
  status: GuardrailResult['status'],
  issues: string[],
  targetLabel = modeLabel(config),
): GuardrailResult {
  return {
    id: config.id,
    label: config.label,
    targetType: config.targetType,
    targetLabel,
    status,
    issues,
    edgeIndex: config.edgeIndex,
    stairId: config.stairId,
    stairSide: config.stairSide,
    heightMm: config.heightMm,
    postCount: config.postCount,
    postSectionWidthMm: config.postSectionWidthMm,
    postSectionDepthMm: config.postSectionDepthMm,
    systemReference: config.systemReference,
    postReference: config.postReference,
    sectionReference: config.sectionReference,
    fixingReference: config.fixingReference,
    note: config.note,
    posts: [],
    sections: [],
  };
}

function terraceEdgeAxis(input: ProjectInput, config: GuardrailConfig): GuardrailAxis | GuardrailResult {
  if (config.edgeIndex == null || !Number.isInteger(config.edgeIndex)) {
    return baseResult(config, 'pending', ['Rive terrasse à sélectionner.']);
  }
  const edge = computeTerraceEdges(input).find((item) => item.edgeIndex === config.edgeIndex);
  if (!edge) return baseResult(config, 'invalid', ['La rive terrasse sélectionnée n’existe plus.']);
  if (edge.curved) {
    return baseResult(
      config,
      'invalid',
      ['Le garde-corps automatique sur rive courbe n’est pas généré : implantation et sections doivent être définies par un tracé dédié.'],
      edge.label,
    );
  }

  const startZ = input.heightCm / 100 + targetFinishedDeltaMm(input, edge.start.xM, edge.start.yM) / 1000;
  const endZ = input.heightCm / 100 + targetFinishedDeltaMm(input, edge.end.xM, edge.end.yM) / 1000;
  const slopeLengthM = Math.hypot(edge.end.xM - edge.start.xM, edge.end.yM - edge.start.yM, endZ - startZ);

  return {
    targetLabel: `Rive ${edge.label}`,
    start: { ...edge.start, zM: startZ },
    end: { ...edge.end, zM: endZ },
    planLengthM: edge.lengthM,
    slopeLengthM,
  };
}

function stairSideAxis(input: ProjectInput, config: GuardrailConfig): GuardrailAxis | GuardrailResult {
  if (!config.stairId || !config.stairSide) {
    return baseResult(config, 'pending', ['Escalier et côté à sélectionner.']);
  }
  const stair = computeStairs(input).find((item) => item.id === config.stairId);
  if (!stair) return baseResult(config, 'invalid', ['L’escalier sélectionné n’existe plus.']);
  if (stair.status !== 'ready' || !stair.treads.length || !stair.footprint) {
    return baseResult(config, 'invalid', ['L’escalier sélectionné doit être entièrement calculé avant d’ajouter son garde-corps.'], stair.label);
  }

  const left = config.stairSide === 'left';
  const first = stair.treads[0];
  const last = stair.treads[stair.treads.length - 1];
  const start = left ? first.top[0] : first.top[1];
  const end = left ? last.top[3] : last.top[2];

  return {
    targetLabel: `${stair.label} — côté ${left ? 'gauche' : 'droit'}`,
    start: { ...start },
    end: { ...end },
    planLengthM: Math.hypot(end.xM - start.xM, end.yM - start.yM),
    slopeLengthM: Math.hypot(end.xM - start.xM, end.yM - start.yM, end.zM - start.zM),
  };
}

function resolveAxis(input: ProjectInput, config: GuardrailConfig): GuardrailAxis | GuardrailResult {
  return config.targetType === 'terrace-edge'
    ? terraceEdgeAxis(input, config)
    : stairSideAxis(input, config);
}

function isGuardrailResult(value: GuardrailAxis | GuardrailResult): value is GuardrailResult {
  return 'status' in value;
}

function trim(value?: string): string | undefined {
  const out = value?.trim();
  return out ? out : undefined;
}

export function computeGuardrails(input: ProjectInput): GuardrailResult[] {
  return (input.guardrails ?? []).map((config) => {
    const axis = resolveAxis(input, config);
    if (isGuardrailResult(axis)) return axis;

    const missing: string[] = [];
    if (!(config.heightMm != null && Number.isFinite(config.heightMm) && config.heightMm > 0)) {
      missing.push('Hauteur de garde-corps à renseigner.');
    }
    if (!(config.postCount != null && Number.isInteger(config.postCount) && config.postCount >= 2)) {
      missing.push('Nombre de poteaux à renseigner (minimum 2).');
    }
    if (missing.length) return baseResult(config, 'pending', missing, axis.targetLabel);

    const invalid: string[] = [];
    if (config.postSectionWidthMm != null && (!Number.isFinite(config.postSectionWidthMm) || config.postSectionWidthMm <= 0)) {
      invalid.push('Largeur de section de poteau invalide.');
    }
    if (config.postSectionDepthMm != null && (!Number.isFinite(config.postSectionDepthMm) || config.postSectionDepthMm <= 0)) {
      invalid.push('Profondeur de section de poteau invalide.');
    }
    if (invalid.length) return baseResult(config, 'invalid', invalid, axis.targetLabel);

    const postCount = config.postCount!;
    const heightM = config.heightMm! / 1000;
    const posts: GuardrailPost[] = Array.from({ length: postCount }, (_, index) => {
      const ratio = postCount === 1 ? 0 : index / (postCount - 1);
      const base = {
        xM: axis.start.xM + (axis.end.xM - axis.start.xM) * ratio,
        yM: axis.start.yM + (axis.end.yM - axis.start.yM) * ratio,
        zM: axis.start.zM + (axis.end.zM - axis.start.zM) * ratio,
      };
      return {
        id: `${config.id}-P${index + 1}`,
        base,
        top: { ...base, zM: base.zM + heightM },
      };
    });

    const sections: GuardrailSection[] = posts.slice(0, -1).map((post, index) => {
      const next = posts[index + 1];
      return {
        id: `${config.id}-S${index + 1}`,
        startPostId: post.id,
        endPostId: next.id,
        startTop: post.top,
        endTop: next.top,
        lengthM: Math.hypot(
          next.top.xM - post.top.xM,
          next.top.yM - post.top.yM,
          next.top.zM - post.top.zM,
        ),
      };
    });

    const issues: string[] = [];
    const postSectionComplete = config.postSectionWidthMm != null && config.postSectionDepthMm != null;
    if (!postSectionComplete) {
      issues.push('Section de poteau incomplète : largeur et profondeur restent à confirmer.');
    }
    if (!trim(config.postReference)) issues.push('Référence poteau à confirmer.');
    if (!trim(config.sectionReference)) issues.push('Référence de section / remplissage à confirmer.');
    if (!trim(config.fixingReference)) issues.push('Référence de fixation à confirmer.');

    return {
      ...baseResult(config, 'ready', issues, axis.targetLabel),
      planLengthM: axis.planLengthM,
      slopeLengthM: axis.slopeLengthM,
      sectionCount: Math.max(0, postCount - 1),
      averageSectionLengthM: sections.length
        ? sections.reduce((sum, section) => sum + section.lengthM, 0) / sections.length
        : undefined,
      systemReference: trim(config.systemReference),
      postReference: trim(config.postReference),
      sectionReference: trim(config.sectionReference),
      fixingReference: trim(config.fixingReference),
      posts,
      sections,
    };
  });
}

export function guardrailTargetKey(config: GuardrailConfig): string {
  return config.targetType === 'terrace-edge'
    ? `edge:${config.edgeIndex ?? 'unset'}`
    : `stair:${config.stairId ?? 'unset'}:${config.stairSide ?? 'unset'}`;
}
