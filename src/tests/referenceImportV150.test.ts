import { describe, expect, it } from 'vitest';
import { demoJoist, ideaBoisBoards } from '../catalog/catalogue';
import type { ProjectInput } from '../domain/types';
import {
  applyDetectedContourAfterHumanValidation,
  detectReferenceGeometry,
  detectionToModelContour,
} from '../domain/referenceDetection';
import { fitReferencePlan, sanitizeReferencePlanTransform } from '../domain/referencePlan';
import { projectFromShareToken, projectToShareToken } from '../commercial/share';

function rasterWithRectangle(widthPx = 200, heightPx = 120) {
  const data = new Uint8ClampedArray(widthPx * heightPx * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  const setDark = (x: number, y: number) => {
    const index = (y * widthPx + x) * 4;
    data[index] = 10;
    data[index + 1] = 10;
    data[index + 2] = 10;
    data[index + 3] = 255;
  };
  for (let y = 15; y <= 105; y += 1) {
    setDark(20, y);
    setDark(180, y);
  }
  for (let x = 20; x <= 180; x += 1) {
    setDark(x, 15);
    setDark(x, 105);
  }
  return { widthPx, heightPx, data };
}

const board = ideaBoisBoards.find((item) => item.id === 'IDEA-TERR-G027')!;

const base: ProjectInput = {
  projectName: 'Sprint K import avancé',
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

describe('Sprint K V1.5 — import avancé et validation humaine', () => {
  it('détecte des lignes dominantes et propose un contour sans modifier le projet', () => {
    const source = rasterWithRectangle();
    const detection = detectReferenceGeometry(source);

    expect(detection.verticalLines.length).toBeGreaterThanOrEqual(2);
    expect(detection.horizontalLines.length).toBeGreaterThanOrEqual(2);
    expect(detection.contour).toBeDefined();
    expect(detection.contour!.widthPx).toBeCloseTo(160, 0);
    expect(detection.contour!.heightPx).toBeCloseTo(90, 0);

    expect(base.shape).toBe('rectangle');
    expect(base.freeformPoints).toBeUndefined();
  });

  it('refuse de convertir une proposition en mètres tant que le fond n’est pas calibré', () => {
    const detection = detectReferenceGeometry(rasterWithRectangle());
    const uncalibrated = fitReferencePlan({ widthPx: 200, heightPx: 120 }, 6, 4);

    expect(uncalibrated.calibrated).toBe(false);
    expect(detectionToModelContour(detection, uncalibrated)).toBeUndefined();
  });

  it('convertit les cotes détectées après calibration mais exige encore la validation humaine pour appliquer', () => {
    const detection = detectReferenceGeometry(rasterWithRectangle());
    const transform = {
      ...fitReferencePlan({ widthPx: 200, heightPx: 120 }, 6, 4),
      scaleMmPerPixel: 20,
      calibrated: true,
      calibrationDistanceMm: 4000,
    };
    const proposal = detectionToModelContour(detection, transform);

    expect(proposal).toBeDefined();
    expect(proposal!.widthM).toBeCloseTo(3.2, 1);
    expect(proposal!.heightM).toBeCloseTo(1.8, 1);

    const project = { ...base, referencePlan: transform };
    const notConfirmed = applyDetectedContourAfterHumanValidation(project, proposal, false, '2026-09-23T18:00:00.000Z');
    expect(notConfirmed).toBe(project);
    expect(notConfirmed.shape).toBe('rectangle');

    const confirmed = applyDetectedContourAfterHumanValidation(project, proposal, true, '2026-09-23T18:00:00.000Z');
    expect(confirmed.shape).toBe('freeform');
    expect(confirmed.freeformPoints).toHaveLength(4);
    expect(confirmed.referencePlan?.humanValidatedAt).toBe('2026-09-23T18:00:00.000Z');
  });

  it('conserve la traçabilité PDF dans le transform assaini', () => {
    const sanitized = sanitizeReferencePlanTransform({
      ...fitReferencePlan({ widthPx: 1400, heightPx: 900 }, 7, 4.5),
      sourceKind: 'pdf',
      sourceName: 'plan-client.pdf',
      sourcePageNumber: 2,
      sourcePageCount: 5,
      humanValidatedAt: '2026-09-23T18:30:00.000Z',
    });

    expect(sanitized).toMatchObject({
      sourceKind: 'pdf',
      sourceName: 'plan-client.pdf',
      sourcePageNumber: 2,
      sourcePageCount: 5,
      humanValidatedAt: '2026-09-23T18:30:00.000Z',
    });
  });

  it('conserve source, page PDF, calibration et validation humaine dans le partage V14', () => {
    const project: ProjectInput = {
      ...base,
      referencePlan: {
        ...fitReferencePlan({ widthPx: 1200, heightPx: 800 }, 6, 4),
        calibrated: true,
        calibrationDistanceMm: 3000,
        sourceKind: 'pdf',
        sourceName: 'terrasse.pdf',
        sourcePageNumber: 3,
        sourcePageCount: 4,
        humanValidatedAt: '2026-09-23T19:00:00.000Z',
      },
    };
    const restored = projectFromShareToken(projectToShareToken(project), base);

    expect(restored.referencePlan).toMatchObject({
      calibrated: true,
      sourceKind: 'pdf',
      sourceName: 'terrasse.pdf',
      sourcePageNumber: 3,
      sourcePageCount: 4,
      humanValidatedAt: '2026-09-23T19:00:00.000Z',
    });
  });
});
