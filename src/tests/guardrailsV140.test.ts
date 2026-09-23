import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';
import { runConfigurator } from '../engine/configurator';
import { computeGuardrails } from '../engine/guardrails';
import { buildProfessional3DScene } from '../engine/scene3d';
import { buildSiteDossierModel } from '../pdf/siteDossierModel';

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint J garde-corps',
  shape: 'rectangle',
  dimensions: {
    lengthM: 6,
    widthM: 4,
    notchLengthM: 2,
    notchWidthM: 1,
    circleDiameterM: 5,
    tStemWidthM: 2.5,
    tBarDepthM: 1.5,
    uOpeningWidthM: 2,
    uOpeningDepthM: 2,
  },
  obstacles: [],
  heightCm: 20,
  supportLevelProfile: {
    mode: 'flat',
    topLeftDeltaMm: 0,
    topRightDeltaMm: 0,
    bottomRightDeltaMm: 0,
    bottomLeftDeltaMm: 0,
    targetSlopeXPercent: 0,
    targetSlopeYPercent: 0,
  },
  doubleJoistsAtButtJoints: true,
  supportType: 'existing-concrete-slab',
  supportSystem: 'adjustable-pedestals',
  edgeFinishMode: 'none',
  edgeConfigs: [],
  edgeCladdingHeightCm: 20,
  includeGeotextile: false,
  drainage: 'yes',
  orientation: 'length',
  layingDirection: 'length',
  layingStart: 'left',
  layingPattern: 'straight',
  layingZones: [],
  stairs: [],
  guardrails: [],
  board,
  joist: demoJoist,
  usage: 'residential',
};

function terraceGuardrailProject(withRefs = true): ProjectInput {
  return {
    ...base,
    guardrails: [{
      id: 'GC-1',
      label: 'Garde-corps rive AB',
      targetType: 'terrace-edge',
      edgeIndex: 0,
      heightMm: 1000,
      postCount: 4,
      postSectionWidthMm: 80,
      postSectionDepthMm: 80,
      systemReference: withRefs ? 'SYS-GC-01' : undefined,
      postReference: withRefs ? 'POST-80' : undefined,
      sectionReference: withRefs ? 'SEC-2000' : undefined,
      fixingReference: withRefs ? 'FIX-GC' : undefined,
    }],
  };
}

function stairGuardrailProject(): ProjectInput {
  return {
    ...base,
    stairs: [{
      id: 'ESC-EXT',
      label: 'Escalier jardin',
      mode: 'external-edge',
      edgeIndex: 0,
      boundarySegmentIndex: 0,
      landingLevelOffsetMm: 0,
      boundaryOffsetM: 1,
      widthM: 1.2,
      treadDepthMm: 300,
      stepCount: 2,
      structureLineCount: 2,
    }],
    guardrails: [{
      id: 'GC-ESC',
      label: 'Garde-corps escalier gauche',
      targetType: 'stair-side',
      stairId: 'ESC-EXT',
      stairSide: 'left',
      heightMm: 900,
      postCount: 3,
      postSectionWidthMm: 60,
      postSectionDepthMm: 60,
      postReference: 'POST-60',
      sectionReference: 'SEC-STAIR',
      fixingReference: 'FIX-STAIR',
    }],
  };
}

describe('Sprint J V1.4 — garde-corps', () => {
  it('calcule poteaux et sections sur une rive terrasse uniquement depuis les saisies', () => {
    const guardrail = computeGuardrails(terraceGuardrailProject())[0];

    expect(guardrail.status).toBe('ready');
    expect(guardrail.targetLabel).toBe('Rive AB');
    expect(guardrail.planLengthM).toBeCloseTo(6, 5);
    expect(guardrail.postCount).toBe(4);
    expect(guardrail.sectionCount).toBe(3);
    expect(guardrail.averageSectionLengthM).toBeCloseTo(2, 5);
    expect(guardrail.posts).toHaveLength(4);
    expect(guardrail.sections).toHaveLength(3);
    expect(guardrail.posts[0].top.zM - guardrail.posts[0].base.zM).toBeCloseTo(1, 5);
  });

  it('conserve la section de poteau et les références sans les inventer', () => {
    const complete = computeGuardrails(terraceGuardrailProject(true))[0];
    expect(complete.issues).toHaveLength(0);
    expect(complete.postSectionWidthMm).toBe(80);
    expect(complete.postSectionDepthMm).toBe(80);
    expect(complete.postReference).toBe('POST-80');
    expect(complete.sectionReference).toBe('SEC-2000');
    expect(complete.fixingReference).toBe('FIX-GC');

    const missing = computeGuardrails(terraceGuardrailProject(false))[0];
    expect(missing.status).toBe('ready');
    expect(missing.issues.join(' ')).toContain('Référence poteau');
    expect(missing.postReference).toBeUndefined();
  });

  it('bloque une configuration ajoutée sans hauteur ou nombre de poteaux', () => {
    const project: ProjectInput = {
      ...base,
      guardrails: [{
        id: 'GC-PENDING',
        label: 'À compléter',
        targetType: 'terrace-edge',
        edgeIndex: 1,
      }],
    };
    const guardrail = computeGuardrails(project)[0];
    expect(guardrail.status).toBe('pending');

    const result = runConfigurator(project);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.tag === 'SA-TERR-GUARD-GEO-001')).toBe(true);
  });

  it('gère un garde-corps sur le côté d’un escalier calculé', () => {
    const project = stairGuardrailProject();
    const guardrail = computeGuardrails(project)[0];

    expect(guardrail.status).toBe('ready');
    expect(guardrail.targetType).toBe('stair-side');
    expect(guardrail.targetLabel).toContain('Escalier jardin');
    expect(guardrail.posts).toHaveLength(3);
    expect(guardrail.sections).toHaveLength(2);
    expect(guardrail.slopeLengthM).toBeGreaterThan(guardrail.planLengthM ?? 0);
  });

  it('refuse deux garde-corps sur le même côté', () => {
    const project = terraceGuardrailProject();
    project.guardrails = [
      project.guardrails![0],
      { ...project.guardrails![0], id: 'GC-2', label: 'Doublon' },
    ];
    const result = runConfigurator(project);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.tag === 'SA-TERR-GUARD-003')).toBe(true);
  });

  it('n’ajoute aucun garde-corps automatiquement lorsqu’aucun côté n’est choisi', () => {
    expect(computeGuardrails(base)).toHaveLength(0);
    const result = runConfigurator(base);
    expect(result.diagnostics.some((item) => item.tag.startsWith('SA-TERR-GUARD'))).toBe(false);
  });

  it('alimente le panier avec les poteaux et sections mais pas une quantité de fixations inventée', () => {
    const result = runConfigurator(terraceGuardrailProject());
    const posts = result.basket?.lines.find((line) => line.id === 'guardrail-posts-GC-1');
    const sections = result.basket?.lines.find((line) => line.id === 'guardrail-sections-GC-1');
    const fixings = result.basket?.lines.find((line) => line.id === 'guardrail-fixings-GC-1');

    expect(posts?.quantity).toBe(4);
    expect(posts?.productRef).toBe('POST-80');
    expect(sections?.quantity).toBe(3);
    expect(sections?.productRef).toBe('SEC-2000');
    expect(fixings?.productRef).toBe('FIX-GC');
    expect(fixings?.quantity).toBeUndefined();
    expect(fixings?.status).toBe('pending');
  });

  it('intègre le garde-corps dans la scène 3D avec sa hauteur réelle', () => {
    const project = terraceGuardrailProject();
    const result = runConfigurator(project);
    const scene = buildProfessional3DScene(project, result.layout, result.supportPlan);

    expect(scene.guardrails).toHaveLength(1);
    expect(scene.guardrails[0].posts).toHaveLength(4);
    expect(scene.bounds.maxZM).toBeGreaterThanOrEqual(1.2);
  });

  it('conserve le garde-corps dans le partage V13', () => {
    const project = terraceGuardrailProject();
    const restored = projectFromShareToken(projectToShareToken(project), base);

    expect(restored.guardrails).toHaveLength(1);
    expect(restored.guardrails?.[0]).toMatchObject({
      id: 'GC-1',
      targetType: 'terrace-edge',
      edgeIndex: 0,
      heightMm: 1000,
      postCount: 4,
      postReference: 'POST-80',
      sectionReference: 'SEC-2000',
    });
  });

  it('intègre les garde-corps au dossier chantier', () => {
    const project = terraceGuardrailProject();
    const result = runConfigurator(project);
    const dossier = buildSiteDossierModel(project, result, 'IB-TERR-VERSION-1.4.0', '23/09/2026');

    expect(dossier.guardrails).toHaveLength(1);
    expect(dossier.guardrails[0]).toMatchObject({
      label: 'Garde-corps rive AB',
      targetLabel: 'Rive AB',
      postCount: 4,
      sectionCount: 3,
      postReference: 'POST-80',
    });
    expect(dossier.clientSummary.finishes).toContain('1 garde-corps');
  });
});
