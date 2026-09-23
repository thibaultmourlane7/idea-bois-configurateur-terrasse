export type ShapeType = 'rectangle' | 'l-shape' | 't-shape' | 'u-shape' | 'circle' | 'freeform';
export type BoardOrientation = 'length' | 'width';
export type LayingDirection = BoardOrientation | 'diagonal-45' | 'diagonal--45';
export type LayingStart = 'left' | 'right' | 'top' | 'bottom' | 'edge';
export type DeckLayingPattern = 'straight' | 'half' | 'third';
export type Severity = 'info' | 'warning' | 'blocking';
export type SupportType = 'new-concrete-slab' | 'existing-concrete-slab' | 'stabilized-ground';
export type SupportSystem = 'adjustable-pedestals' | 'pads' | 'unknown';
export type StructureJoistChoice = 'pin-class4' | 'exotic';
export type EdgeFinishMode = 'none' | 'full-perimeter' | 'per-edge';
export type DrainageAnswer = 'yes' | 'no' | 'unknown';
export type MaterialFamily = 'solid-wood' | 'composite';
export type TechnicalEngine = 'nf-dtu-51-4' | 'manufacturer-rules';

export interface Dimensions {
  lengthM: number;
  widthM: number;
  notchLengthM: number;
  notchWidthM: number;
  circleDiameterM: number;
  tStemWidthM: number;
  tBarDepthM: number;
  uOpeningWidthM: number;
  uOpeningDepthM: number;
}

export type ObstacleKind = 'pool' | 'tree' | 'post' | 'manhole' | 'other';
export type ObstacleShape = 'rectangle' | 'circle';

export interface TerracePoint {
  xM: number;
  yM: number;
}

export type TerraceEdgeContext = 'free' | 'wall' | 'facade' | 'threshold' | 'access' | 'finish';
export type TerraceEdgeTreatment = 'none' | 'cladding' | 'profile' | 'edge-board' | 'drainage';

export interface TerraceEdgeConfig {
  /** Index stable de la rive dans le contour courant : AB = 0, BC = 1, etc. */
  edgeIndex: number;
  /** Contexte chantier déclaré par l'utilisateur. */
  context: TerraceEdgeContext;
  /** Traitement souhaité sur cette rive. */
  treatment: TerraceEdgeTreatment;
  /** Note libre de chantier ; n'alimente aucun calcul automatique. */
  note?: string;
}

export interface TerraceEdgeResult {
  id: string;
  edgeIndex: number;
  label: string;
  start: TerracePoint;
  end: TerracePoint;
  lengthM: number;
  curved: boolean;
  context: TerraceEdgeContext;
  treatment: TerraceEdgeTreatment;
  configured: boolean;
  note?: string;
}

export interface LayingZone {
  id: string;
  label: string;
  /** Polygone de la zone en coordonnées projet. La zone principale correspond au reste de la terrasse. */
  points: TerracePoint[];
  direction: LayingDirection;
  pattern: DeckLayingPattern;
  start: LayingStart;
  startEdgeIndex?: number;
}

export interface ReferencePlanTransform {
  scaleMmPerPixel: number;
  offsetXM: number;
  offsetYM: number;
  rotationDeg: number;
  opacity: number;
  locked: boolean;
  calibrated: boolean;
  calibrationDistanceMm?: number;
  imageWidthPx?: number;
  imageHeightPx?: number;
}

export type SupportLevelMode = 'flat' | 'four-corners';

export interface SupportLevelProfile {
  /** Profil du support existant utilisé pour calculer la hauteur de chaque plot. */
  mode: SupportLevelMode;
  /** Ecarts de niveau du support par rapport au coin haut-gauche. Positif = support plus haut. */
  topLeftDeltaMm: number;
  topRightDeltaMm: number;
  bottomRightDeltaMm: number;
  bottomLeftDeltaMm: number;
  /** Pente volontaire du dessus fini. Positive = le niveau fini monte dans la direction de l'axe. */
  targetSlopeXPercent: number;
  targetSlopeYPercent: number;
}

export interface TerraceObstacle {
  id: string;
  kind: ObstacleKind;
  label: string;
  shape: ObstacleShape;
  /** Position X en mètres par rapport à l'origine de la terrasse. Peut être négative si la réservation déborde à gauche. */
  xM: number;
  /** Position Y en mètres par rapport à l'origine de la terrasse. Peut être négative si la réservation déborde en haut. */
  yM: number;
  widthM?: number;
  heightM?: number;
  diameterM?: number;
}

export interface BoardTechnicalData {
  materialFamily: MaterialFamily;
  mechanicalClass?: 'C18' | 'C24' | 'D18' | 'D24' | 'D30' | 'D40' | 'D50';
  useClass?: '3.1' | '3.2' | '4';
  densityKgM3?: number;
  technicalEngine: TechnicalEngine;
  manufacturerRulesValidated: boolean;
  sourceLabel: string;
  sourceVersion?: string;
}

export interface BoardCatalogVariant {
  lengthMm: number;
  /** Référence fabricant / produit uniquement quand elle est explicitement vérifiée. */
  productRef?: string;
  unitPriceTtcPerM2?: number;
  sourceUrl: string;
  sourceDate: string;
}

export interface BoardCatalogData {
  internalCodes: string[];
  family: string;
  range: string;
  material: string;
  profile: string;
  color: string;
  fixation: string;
  treatment: string;
  availabilitySnapshot: string;
  sourceUrl: string;
  sourceDate: string;
  sourceStatus: string;
  /** Variantes longueur issues de pages/catégories IDEA Bois vérifiées. */
  variants?: BoardCatalogVariant[];
}

export type TextureQualityStatus = 'exact' | 'close' | 'neutral';
export type TextureFinishType = 'smooth' | 'grooved' | 'brushed' | 'structured' | 'reversible' | 'other';
export type TextureMaterialFamily = 'wood' | 'composite' | 'bamboo' | 'other';

export interface ProductTextureAsset {
  id: string;
  boardIds: string[];
  label: string;
  materialFamily: TextureMaterialFamily;
  finishType: TextureFinishType;
  tone: string;
  status: TextureQualityStatus;
  previewImageUrl?: string;
  textureImageUrl?: string;
  sourceLabel: string;
  sourceUrl?: string;
  sourceLicense?: string;
  referenceSourceUrl?: string;
  textureScaleMmX: number;
  textureScaleMmY: number;
  repeatMode: 'repeat' | 'cover';
  tintColor?: string;
  tintOpacity?: number;
  grooveCount?: number;
  notes?: string;
}

export interface BoardVisualData {
  baseColor: string;
  grainColor: string;
  accentColor?: string;
  imageUrl?: string;
  imageSourcePageUrl?: string;
  officialProductCode?: string;
  imageStatus: 'verified-media' | 'verified-product-page' | 'unmapped';
}

export interface BoardSpec {
  id: string;
  label: string;
  subtitle: string;
  widthMm: number;
  lengthMm: number;
  availableLengthsMm?: number[];
  thicknessMm: number;
  gapMm?: number;
  gapRangeMm?: [number, number];
  priceTtcPerM2?: number;
  isDemo: boolean;
  visual?: BoardVisualData;
  catalog?: BoardCatalogData;
  commercialRecipeId?:
    | 'idea-pin-nord-145x27'
    | 'idea-resineux-class4'
    | 'idea-cumaru-145x21'
    | 'idea-garapa-145x21'
    | 'idea-padouk-120x21'
    | 'idea-ipe-140x20'
    | 'idea-bamboo-137x20'
    | 'silvadec-atmosphere-138x23';
  technical: BoardTechnicalData;
}

export interface JoistSpec {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  mechanicalClass: 'C18' | 'C24' | 'D18' | 'D24' | 'D35' | 'D45';
  isDemo: boolean;
}

export interface ProjectInput {
  projectName: string;
  shape: ShapeType;
  dimensions: Dimensions;
  obstacles: TerraceObstacle[];
  /** Sommets utilisés uniquement lorsque shape === 'freeform'. */
  freeformPoints?: TerracePoint[];
  referencePlan?: ReferencePlanTransform;
  heightCm: number;
  supportLevelProfile?: SupportLevelProfile;
  /** Option client : doubler la lambourde sur les axes de jonction de lames. Désactivé par défaut. */
  doubleJoistsAtButtJoints?: boolean;
  supportType: SupportType;
  supportSystem: SupportSystem;
  /** Choix explicite quand plusieurs familles de lambourdes sont documentées pour la lame. */
  structureJoistChoice?: StructureJoistChoice;
  edgeFinishMode: EdgeFinishMode;
  /** Configuration métier rive par rive. Les anciens projets peuvent ne pas avoir ce champ. */
  edgeConfigs?: TerraceEdgeConfig[];
  edgeCladdingHeightCm: number;
  includeGeotextile: boolean;
  drainage: DrainageAnswer;
  orientation: BoardOrientation;
  /** Direction réelle des lames. orientation reste conservé pour compatibilité des anciens projets. */
  layingDirection?: LayingDirection;
  /** Rive / côté depuis lequel le motif global démarre. */
  layingStart?: LayingStart;
  /** Index de rive lorsque layingStart === 'edge'. */
  layingStartEdgeIndex?: number;
  /** Zones explicites qui remplacent localement les réglages de la zone principale. */
  layingZones?: LayingZone[];
  /** Motif de départ des lames. */
  layingPattern?: DeckLayingPattern;
  board: BoardSpec;
  joist: JoistSpec;
  usage: 'residential';
}

export interface Diagnostic {
  tag: string;
  severity: Severity;
  message: string;
  technicalMessage?: string;
  field?: string;
  source?: string;
}

export interface GeometryResult {
  /** Surface nette réellement couverte par les lames. */
  areaM2: number;
  /** Périmètre extérieur, conservé pour compatibilité avec les finitions de rive. */
  perimeterM: number;
  grossAreaM2: number;
  /** Somme des surfaces de réservations qui intersectent réellement la terrasse. */
  excludedAreaM2: number;
  outerPerimeterM: number;
  obstaclePerimeterM: number;
  obstacleCount: number;
}

export interface RequiredPiece {
  id: string;
  rowIndex: number;
  lengthMm: number;
}

export type CutSourceType = 'stock-board' | 'offcut';
export type CutOffcutStatus = 'reused' | 'remaining';

export interface CutPlacement {
  id: string;
  pieceId: string;
  rowIndex: number;
  lengthMm: number;
  sourceType: CutSourceType;
  sourceId: string;
  sourceLengthBeforeMm: number;
  remainingAfterMm: number;
  resultingOffcutId?: string;
}

export interface CutOffcut {
  id: string;
  stockBoardId: string;
  createdByCutId: string;
  lengthMm: number;
  status: CutOffcutStatus;
  reusedByCutId?: string;
}

export interface StockBoard {
  index: number;
  id: string;
  stockLengthMm: number;
  cuts: CutPlacement[];
  remainingMm: number;
  finalOffcutId?: string;
  reuseCount: number;
}

export interface CutReuseRules {
  status: 'pending-manufacturer-validation' | 'validated';
  minimumReusableLengthMm?: number;
  minimumJointDistanceMm?: number;
  kerfMm?: number;
  note: string;
}

export interface CutOptimizationResult {
  boards: StockBoard[];
  offcuts: CutOffcut[];
  totalStockMm: number;
  totalRequiredMm: number;
  finalRemainingMm: number;
  reusedOffcutCount: number;
  rules: CutReuseRules;
}

/** Segment réellement posé dans une rangée, utilisé pour rendre les raccords visibles. */
export interface LayoutBoardSegment {
  id: string;
  rowIndex: number;
  intervalIndex: number;
  segmentIndex: number;
  transverseCenterMm: number;
  startMm: number;
  endMm: number;
  lengthMm: number;
  zoneId?: string;
  direction?: LayingDirection;
  x1M?: number;
  y1M?: number;
  x2M?: number;
  y2M?: number;
  dirX?: number;
  dirY?: number;
  normalX?: number;
  normalY?: number;
}

/** Raccord entre deux morceaux de lame dans une rangée donnée. */
export interface LayoutButtJoint {
  id: string;
  rowIndex: number;
  transverseCenterMm: number;
  axisPositionMm: number;
  zoneId?: string;
  xM?: number;
  yM?: number;
  dirX?: number;
  dirY?: number;
  normalX?: number;
  normalY?: number;
}

export interface LayoutZoneResult {
  id: string;
  label: string;
  direction: LayingDirection;
  pattern: DeckLayingPattern;
  start: LayingStart;
  dirX: number;
  dirY: number;
  normalX: number;
  normalY: number;
  minUMm: number;
  maxUMm: number;
  minVMm: number;
  maxVMm: number;
  rowCount: number;
  buttJointAxisPositionsMm: number[];
}

export interface LayoutResult {
  rowCount: number;
  requiredPieces: RequiredPiece[];
  /** Zones de pose réellement calculées, y compris la zone principale restante. */
  zones: LayoutZoneResult[];
  /** Segments de lames réellement positionnés, rangée par rangée. */
  boardSegments: LayoutBoardSegment[];
  /** Raccords de lames réels, rangée par rangée. */
  buttJoints: LayoutButtJoint[];
  totalRequiredLinearM: number;
  stockBoards: StockBoard[];
  cutOptimization: CutOptimizationResult;
  purchasedLinearM: number;
  wasteLinearM: number;
  wastePercent: number;
  purchasedAreaM2: number;
  hasButtJoints: boolean;
}

export interface JoistLine {
  index: number;
  axisPositionMm: number;
  lengthMm: number;
  supportCount: number;
}

export interface SupportPlanPoint {
  id: string;
  xM: number;
  yM: number;
  multiplicity: number;
  surfaceDeltaMm: number;
  targetFinishedDeltaMm: number;
  requiredPlotHeightMm: number;
  plotMaterialId?: string;
  plotLabel?: string;
  productRef?: string;
  unitPriceTtc?: number;
  status: 'exact' | 'unsupported';
}

export interface SupportPlanGroup {
  materialId: string;
  label: string;
  productRef?: string;
  quantity: number;
  unitPriceTtc: number;
  totalTtc: number;
  minHeightMm: number;
  maxHeightMm: number;
  sourceUrl: string;
}

export type PlannedJoistRole = 'field' | 'perimeter' | 'butt-joint' | 'zone-boundary';

export interface PlannedJoistSegment {
  id: string;
  axisPositionMm: number;
  x1M: number;
  y1M: number;
  x2M: number;
  y2M: number;
  lengthMm: number;
  multiplicity: 1 | 2;
  buttJointSupport: boolean;
  /** Rôle métier du segment. */
  role?: PlannedJoistRole;
  zoneId?: string;
}

export interface SupportPlanResult {
  status: 'exact' | 'partial' | 'unavailable';
  joistSpacingMm?: number;
  plotSpacingMm?: number;
  joistSegments: PlannedJoistSegment[];
  joistLinearM: number;
  doubleJoistLinearM: number;
  joistStockBoards: StockBoard[];
  /** Positions historiques des axes, fiables directement pour un calepinage mono-zone. */
  buttJointAxisPositionsMm: number[];
  /** Nombre total d’axes de raccord locaux, additionné zone par zone. */
  buttJointAxisCount?: number;
  supportPoints: SupportPlanPoint[];
  plotGroups: SupportPlanGroup[];
  unsupportedPointCount: number;
  minRequiredPlotHeightMm?: number;
  maxRequiredPlotHeightMm?: number;
  sourceLabel?: string;
  sourceUrl?: string;
  /** Un contour courbe a été détecté ; la lambourde périphérique droite reste à confirmer pour cette portion. */
  pendingCurvedPerimeter?: boolean;
  note?: string;
}

export interface StructureResult {
  joistMaxSpacingMm: number;
  joistActualSpacingMm: number;
  joistSupportMaxSpacingMm: number;
  joistLines: JoistLine[];
  joistLinearM: number;
  supportPointCount: number;
  fixingCount?: number;
  fixingStatus: 'exact' | 'pending-joint-layout' | 'unavailable';
}

export interface PricingResult {
  unitPriceTtcPerM2?: number;
  surfaceNetTtc?: number;
  boardPurchaseTtc?: number;
  materialTtc?: number;
  status: 'unavailable' | 'surface-price' | 'board-purchase';
  isCompleteMaterialTotal: boolean;
  missingCostFamilies: string[];
  sourceDate?: string;
}

export type BasketLineStatus = 'exact' | 'range' | 'informative' | 'pending';
export type BasketFamily = 'decking' | 'joists' | 'supports' | 'fixings' | 'protection' | 'accessories';

export interface StockLengthBreakdown {
  /** Longueur commerciale réellement sélectionnée par l'optimiseur. */
  lengthMm: number;
  /** Nombre de lames à acheter dans cette longueur. */
  quantity: number;
  /** Référence uniquement si une correspondance longueur → SKU est explicitement validée. */
  productRef?: string;
}

export interface BasketLine {
  id: string;
  family: BasketFamily;
  label: string;
  productRef?: string;
  quantity?: number;
  quantityMin?: number;
  quantityMax?: number;
  unit: string;
  unitPriceTtc?: number;
  totalTtc?: number;
  totalMinTtc?: number;
  totalMaxTtc?: number;
  status: BasketLineStatus;
  required: boolean;
  note?: string;
  /** Répartition réelle par longueur commerciale. Aucune référence n'est déduite sans mapping validé. */
  stockBreakdown?: StockLengthBreakdown[];
  sourceUrl?: string;
}

export interface BasketResult {
  lines: BasketLine[];
  knownSubtotalTtc: number;
  totalTtc?: number;
  totalMinTtc?: number;
  totalMaxTtc?: number;
  status: 'complete' | 'range' | 'partial';
  missingFamilies: string[];
}

export interface ConfiguratorResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  geometry?: GeometryResult;
  structure?: StructureResult;
  layout?: LayoutResult;
  pricing?: PricingResult;
  basket?: BasketResult;
  supportPlan?: SupportPlanResult;
  /** Rives métier réellement dérivées du contour et de la configuration chantier. */
  edges?: TerraceEdgeResult[];
  trace: string[];
}