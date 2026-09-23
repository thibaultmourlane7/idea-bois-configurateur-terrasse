import type { Diagnostic, ProjectInput, TerraceObstacle } from './types';
import { referencePlanDiagnostics } from './referencePlan';
import { getDeckOutlinePointsM, isSimplePolygon, obstacleIntersectsBaseDeck, obstaclesOverlap, polygonArea } from '../engine/geometry';
import { hasEdgeTreatment } from '../engine/edges';
import { zoneFitsBaseDeck, zonesOverlap } from '../engine/layingGeometry';
import { canUseBoardInZone, findBoard } from '../catalog/compatibility';
import { computeTerrainModel } from '../engine/terrain';

export const VALIDATION_TAG = 'SA-TERR-VALID-001';

function validateObstacle(obstacle: TerraceObstacle): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const base = { tag: 'SA-TERR-GEO-OBS-001', severity: 'blocking' as const };

  // Une réservation peut volontairement déborder de la terrasse : xM/yM peuvent être négatifs.
  if (!Number.isFinite(obstacle.xM) || !Number.isFinite(obstacle.yM)) {
    diagnostics.push({ ...base, message: `${obstacle.label || 'Réservation'} : la position doit être renseignée avec des nombres valides.` });
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

  const zones = input.layingZones ?? [];
  for (const zone of zones) {
    if (zone.boardId) {
      const zoneBoard = findBoard(zone.boardId);
      if (!zoneBoard) {
        diagnostics.push({
          tag: 'SA-TERR-COMPAT-ZONE-001',
          severity: 'blocking',
          message: `${zone.label || 'Zone'} : la référence de lame sélectionnée n’existe plus dans le catalogue.`,
          field: `layingZones.${zone.id}.boardId`,
        });
      } else {
        const compatibility = canUseBoardInZone(board, zoneBoard);
        if (!compatibility.allowed) {
          diagnostics.push({
            tag: 'SA-TERR-COMPAT-ZONE-002',
            severity: 'blocking',
            message: `${zone.label || 'Zone'} : ${compatibility.reason}`,
            technicalMessage: `Produit principal : ${board.label}. Produit de zone : ${zoneBoard.label}.`,
            field: `layingZones.${zone.id}.boardId`,
          });
        }
      }
    }

    if (!zone.id.trim() || !zone.label.trim()) {
      diagnostics.push({ tag: 'SA-TERR-ZONE-001', severity: 'blocking', message: 'Chaque zone de pose doit avoir un identifiant et un nom.' });
      continue;
    }
    if (zone.points.length < 3 || !isSimplePolygon(zone.points)) {
      diagnostics.push({ tag: 'SA-TERR-ZONE-002', severity: 'blocking', message: `${zone.label || 'Zone'} : le contour de zone doit être un polygone simple.` });
      continue;
    }
    if (polygonArea(zone.points.map((point) => ({ x: point.xM, y: point.yM }))) < 0.02) {
      diagnostics.push({ tag: 'SA-TERR-ZONE-003', severity: 'blocking', message: `${zone.label} : la zone est trop petite.` });
    }
    if (!zoneFitsBaseDeck(input, zone)) {
      diagnostics.push({ tag: 'SA-TERR-ZONE-004', severity: 'blocking', message: `${zone.label} : tout le contour de la zone doit rester dans la terrasse, sans traverser un décroché.` });
    }
    if (zone.start === 'edge' && (zone.startEdgeIndex == null || zone.startEdgeIndex < 0 || zone.startEdgeIndex >= zone.points.length)) {
      diagnostics.push({ tag: 'SA-TERR-ZONE-005', severity: 'blocking', message: `${zone.label} : la rive de départ sélectionnée n’existe pas.` });
    }

    const levelValues: Array<[string, number | undefined]> = [
      ['finishedLevelOffsetMm', zone.finishedLevelOffsetMm],
      ['supportLevelOffsetMm', zone.supportLevelOffsetMm],
      ['targetSlopeXPercent', zone.targetSlopeXPercent],
      ['targetSlopeYPercent', zone.targetSlopeYPercent],
    ];
    for (const [field, value] of levelValues) {
      if (value != null && !Number.isFinite(value)) {
        diagnostics.push({
          tag: 'SA-TERR-TERRAIN-001',
          severity: 'blocking',
          message: `${zone.label} : les niveaux et pentes de plateforme doivent être des nombres valides.`,
          field: `layingZones.${zone.id}.${field}`,
        });
      }
    }
  }
  for (let i = 0; i < zones.length; i += 1) {
    for (let j = i + 1; j < zones.length; j += 1) {
      if (zonesOverlap(zones[i], zones[j])) {
        diagnostics.push({
          tag: 'SA-TERR-ZONE-006',
          severity: 'blocking',
          message: `${zones[i].label} et ${zones[j].label} se chevauchent. Les zones de pose doivent rester distinctes.`,
        });
      }
    }
  }

  if (input.supportLevelProfile) {
    const profile = input.supportLevelProfile;
    const values = [
      ['supportLevelProfile.topLeftDeltaMm', profile.topLeftDeltaMm],
      ['supportLevelProfile.topRightDeltaMm', profile.topRightDeltaMm],
      ['supportLevelProfile.bottomRightDeltaMm', profile.bottomRightDeltaMm],
      ['supportLevelProfile.bottomLeftDeltaMm', profile.bottomLeftDeltaMm],
      ['supportLevelProfile.targetSlopeXPercent', profile.targetSlopeXPercent],
      ['supportLevelProfile.targetSlopeYPercent', profile.targetSlopeYPercent],
    ] as const;
    for (const [field, value] of values) {
      if (!Number.isFinite(value)) {
        diagnostics.push({
          tag: 'SA-TERR-LEVEL-001',
          severity: 'blocking',
          message: 'Les niveaux et pentes du support doivent être des nombres valides.',
          field,
        });
      }
    }
  }

  if (!diagnostics.some((item) => item.severity === 'blocking')) {
    const terrain = computeTerrainModel(input);
    for (const relation of terrain.relations.filter((item) => item.transitionRequired)) {
      diagnostics.push({
        tag: 'SA-TERR-TERRAIN-TRANSITION-120',
        severity: 'warning',
        message: `${relation.aLabel} / ${relation.bLabel} : différence de niveau fini ${relation.finishedDeltaMinMm.toFixed(0)} à ${relation.finishedDeltaMaxMm.toFixed(0)} mm sur ${relation.sharedBoundaryLengthM.toFixed(2)} m de frontière.`,
        technicalMessage: 'Sprint H calcule les niveaux et relations entre plateformes. Aucune marche, rampe ou pièce de transition n’est ajoutée automatiquement ; ces éléments relèvent du Sprint I ou d’une règle fabricant validée.',
        field: 'layingZones',
      });
    }
  }

  const edgeCount = input.shape === 'circle' ? 1 : getDeckOutlinePointsM(input).length;
  const edgeConfigs = input.edgeConfigs ?? [];
  const seenEdgeIndexes = new Set<number>();
  for (const config of edgeConfigs) {
    if (!Number.isInteger(config.edgeIndex) || config.edgeIndex < 0 || config.edgeIndex >= edgeCount) {
      diagnostics.push({
        tag: 'SA-TERR-EDGE-001',
        severity: 'warning',
        message: 'Une ancienne configuration de rive ne correspond plus au contour actuel et sera ignorée.',
        field: 'edgeConfigs',
      });
      continue;
    }
    if (seenEdgeIndexes.has(config.edgeIndex)) {
      diagnostics.push({
        tag: 'SA-TERR-EDGE-002',
        severity: 'warning',
        message: `La rive ${config.edgeIndex + 1} possède plusieurs configurations ; seule la première sera utilisée.`,
        field: 'edgeConfigs',
      });
    }
    seenEdgeIndexes.add(config.edgeIndex);
  }

  if (hasEdgeTreatment(input, 'cladding')) {
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
    // Une réservation totalement hors terrasse est autorisée et n'impacte aucun calcul.
    for (const obstacle of input.obstacles) {
      if (!obstacleIntersectsBaseDeck(input, obstacle)) {
        diagnostics.push({
          tag: 'SA-TERR-GEO-OBS-004',
          severity: 'info',
          message: `${obstacle.label || 'Réservation'} est actuellement hors de la terrasse et n’impacte pas le calcul.`,
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

  for (const item of referencePlanDiagnostics(input.referencePlan)) {
    diagnostics.push({
      tag: 'SA-TERR-REFPLAN-017',
      severity: item.severity,
      message: item.message,
      technicalMessage: 'Le fond importé reste une référence visuelle ; seule la géométrie vectorielle alimente les calculs.',
    });
  }

  return diagnostics;
}