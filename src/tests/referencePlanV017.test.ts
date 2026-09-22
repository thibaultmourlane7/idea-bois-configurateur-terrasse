import { describe, expect, it } from 'vitest';
import { calibrateReferencePlan, fitReferencePlan, imagePixelToModel, modelToImagePixel, referencePlanDiagnostics, zoomReferencePlan } from '../domain/referencePlan';

describe('Calibration plan/photo V0.17', () => {
  it('ajuste un fond au contour sans le déclarer calibré', () => {
    const transform = fitReferencePlan({ widthPx: 1000, heightPx: 500 }, 6, 4);
    expect(transform.scaleMmPerPixel).toBeCloseTo(6, 8);
    expect(transform.calibrated).toBe(false);
    expect(referencePlanDiagnostics(transform)[0].severity).toBe('warning');
  });

  it('calibre exactement deux points sur une distance connue', () => {
    const initial = fitReferencePlan({ widthPx: 1000, heightPx: 500 }, 6, 4);
    const a = imagePixelToModel(initial, 100, 100);
    const b = imagePixelToModel(initial, 300, 100);
    const calibrated = calibrateReferencePlan(initial, a, b, 4000);
    expect(calibrated.scaleMmPerPixel).toBeCloseTo(20, 8);
    expect(calibrated.calibrated).toBe(true);
    const aAfter = imagePixelToModel(calibrated, 100, 100);
    const bAfter = imagePixelToModel(calibrated, 300, 100);
    expect(aAfter.xM).toBeCloseTo(a.xM, 8);
    expect(Math.hypot(bAfter.xM - aAfter.xM, bAfter.yM - aAfter.yM)).toBeCloseTo(4, 8);
  });

  it('conserve les conversions après rotation et déplacement', () => {
    const transform = {
      ...fitReferencePlan({ widthPx: 800, heightPx: 600 }, 8, 6),
      offsetXM: 1.2,
      offsetYM: -0.4,
      rotationDeg: 27,
    };
    const model = imagePixelToModel(transform, 213, 149);
    const image = modelToImagePixel(transform, model);
    expect(image.xPx).toBeCloseTo(213, 8);
    expect(image.yPx).toBeCloseTo(149, 8);
  });

  it('invalide volontairement la calibration après un zoom manuel', () => {
    const initial = { ...fitReferencePlan({ widthPx: 1000, heightPx: 500 }, 6, 4), calibrated: true, calibrationDistanceMm: 3000 };
    const zoomed = zoomReferencePlan(initial, 1.1);
    expect(zoomed.scaleMmPerPixel).toBeCloseTo(initial.scaleMmPerPixel * 1.1, 8);
    expect(zoomed.calibrated).toBe(false);
    expect(zoomed.calibrationDistanceMm).toBeUndefined();
  });
});
