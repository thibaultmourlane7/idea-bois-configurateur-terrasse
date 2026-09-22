import type { Diagnostic, ProjectInput, TerraceObstacle } from './types';
import { isObstacleInsideBaseDeck, isSimplePolygon, obstaclesOverlap, polygonArea } from '../engine/geometry';

export const VALIDATION_TAG = 'SA-TERR-VALID-001';

function validateObstacle(obstacle: TerraceObstacle): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const base = { tag: 'SA-TERR-GEO-OBS-001', severity: 'blocking' as const };

  if (!Number.isFinite(obstacle.xM) || obstacle.xM < 0 || !Number.isFinite(obstacle.yM) || obstacle.yM < 0) {
    diagnostics.push({ ...base, message: `${obstacle.label || 'Réservation'} : la position doit être positive.` });
  }

  if (obstacle.shape === 'circle') {
    if (!Number.isFinite(obstacle.diameterM ?? Number.NaN) || (obstacle.diameterM ?? 0) <= 0) {
      diagnostics.push({ ...base, message: `${obstacle.label || 'Réservation'} : le diamètre doit être positif.` });
    }
  } else {
    if (!Number.isFinite(obstacle.widthM ?? Number.NaN) || (obstacle.widthM ?? 0) <= 0 || !Number.isFinite(obstacle.heightM ?? Number.NaN) || (obstacle.heightM ?? 0) <= 0) {
      diagnostics.push({ ...base, message: `${obstacle.label || 'Réservation'} : longueur et largeur doivent être positives.` });
    }
  }

  return diagnostics;
}

export function validateProject(input: ProjectInput): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const { dimensions: g, board } = input;

  const positive: Array<[string, number, string]> = [
    ['hauteur de la terrasse', input.heightCm, 'heightCm'],
    ['largeur de lame', board.widthMm, 'board.widthMm'],
    ['longueur de lame', board.lengthMm, 'board.lengthMm'],
    ['épaisseur de lame', board.thicknessMm, 'board.thicknessMm'],
  ];

  if (input.shape === 'circle') {
    positive.push(['diamètre de la terrasse', g.circleDiameterM, 'dimensions.circleDiameterM']);
  } else if (input.shape !== 'freeform') {
    positive.push(['longueur de la terrasse', g.lengthM, 'dimensions.lengthM']);
    positive.push(['largeur de la terrasse', g.widthM, 'dimensions.widthM']);
  }

  for (const [label, value, field] of positive) {
    if (!Number.isFinite(value) || value <= 0) {
      diagnostics.push({
        tag: VALIDATION_TAG,
        severity: 'blocking',
        message: `La ${label} doit être renseignée avec une valeur positive.`,
        field,
      });
    }
  }

  if (input.shape === 'freeform') {
    const points = input.freeformPoints ?? [];
    if (points.length < 3) {
      diagnostics.push({ tag: 'SA-TERR-GEO-FREE-001', severity: 'blocking', message: 'La forme libre doit contenir au moins 3 sommets.' });
    } else {
      if (points.some((point) => !Number.isFinite(point.xM) || !Number.isFinite(point.yM) || point.xM < 0 || point.yM < 0)) {
        diagnostics.push({ tag: 'SA-TERR-GEO-FREE-002', severity: 'blocking', message: 'Tous les sommets de la forme libre doivent avoir des coordonnées positives.' });
      } else if (!isSimplePolygon(points)) {
        diagnostics.push({ tag: 'SA-TERR-GEO-FREE-003', severity: 'blocking', message: 'La forme libre se croise ou ne définit pas un contour valide.' });
      } else if (polygonArea(points.map((point) => ({ x: point.xM, y: point.yM }))) < 0.05) {
        diagnostics.push({ tag: 'SA-TERR-GEO-FREE-004', severity: 'blocking', message: 'La forme libre est trop petite pour être calculée.' });
      }
    }
  }

  if (input.shape === 'l-shape') {
    if (g.notchLengthM <= 0 || g.notchWidthM <= 0) {
      diagnostics.push({ tag: 'SA-TERR-GEO-002', severity: 'blocking', message: 'Les dimensions du décroché en L sont nécessaires.' });
    }
    if (g.notchLengthM >= g.lengthM || g.notchWidthM >= g.widthM) {
      diagnostics.push({ tag: 'SA-TERR-GEO-003', severity: 'blocking', message: 'Le décroché doit rester plus petit que la terrasse.' });
    }
  }

  if (input.shape === 't-shape') {
    if (g.tStemWidthM <= 0 || g.tStemWidthM >= g.lengthM) {
      diagnostics.push({ tag: 'SA-TERR-GEO-T-001', severity: 'blocking', message: 'La largeur du pied du T doit être positive et inférieure à la longueur totale.' });
    }
    if (g.tBarDepthM <= 0 || g.tBarDepthM >= g.widthM) {
      diagnostics.push({ tag: 'SA-TERR-GEO-T-002', severity: 'blocking', message: 'La profondeur de la barre du T doit être positive et inférieure à la largeur totale.' });
    }
  }

  if (input.shape === 'u-shape') {
    if (g.uOpeningWidthM <= 0 || g.uOpeningWidthM >= g.lengthM) {
      diagnostics.push({ tag: 'SA-TERR-GEO-U-001', severity: 'blocking', message: 'La largeur de l’ouverture du U doit être positive et inférieure à la longueur totale.' });
    }
    if (g.uOpeningDepthM <= 0 || g.uOpeningDepthM >= g.widthM) {
      diagnostics.push({ tag: 'SA-TERR-GEO-U-002', severity: 'blocking', message: 'La profondeur de l’ouverture du U doit être positive et inférieure à la largeur totale.' });
    }
  }

  if (input.edgeFinishMode === 'full-perimeter') {
    if (!Number.isFinite(input.edgeCladdingHeightCm) || input.edgeCladdingHeightCm <= 0) {
      diagnostics.push({
        tag: 'SA-TERR-EDGE-HEIGHT-001',
        severity: 'blocking',
        message: 'La hauteur d’habillage doit être renseignée avec une valeur positive.',
        field: 'edgeCladdingHeightCm',
      });
    } else if (input.edgeCladdingHeightCm > input.heightCm) {
      diagnostics.push({
        tag: 'SA-TERR-EDGE-HEIGHT-002',
        severity: 'blocking',
        message: 'La hauteur d’habillage ne peut pas dépasser la hauteur finie de la terrasse.',
        field: 'edgeCladdingHeightCm',
      });
    }
  }

  for (const obstacle of input.obstacles) diagnostics.push(...validateObstacle(obstacle));

  if (!diagnostics.some((item) => item.severity === 'blocking')) {
    for (const obstacle of input.obstacles) {
      if (!isObstacleInsideBaseDeck(input, obstacle)) {
        diagnostics.push({
          tag: 'SA-TERR-GEO-OBS-002',
          severity: 'blocking',
          message: `${obstacle.label || 'Réservation'} doit rester entièrement à l’intérieur de la terrasse.`,
          field: `obstacles.${obstacle.id}`,
        });
      }
    }

    for (let i = 0; i < input.obstacles.length; i += 1) {
      for (let j = i + 1; j < input.obstacles.length; j += 1) {
        if (obstaclesOverlap(input.obstacles[i], input.obstacles[j])) {
          diagnostics.push({
            tag: 'SA-TERR-GEO-OBS-003',
            severity: 'blocking',
            message: `${input.obstacles[i].label} et ${input.obstacles[j].label} se chevauchent. Les réservations doivent être distinctes.`,
          });
        }
      }
    }
  }

  if (board.isDemo) {
    diagnostics.push({
      tag: 'SA-TERR-CATALOG-001',
      severity: 'info',
      message: 'Produit de démonstration : il sera remplacé par le catalogue réel IDEA Bois.',
    });
  }

  return diagnostics;
}
