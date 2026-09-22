export type ShapeType = 'rectangle' | 'l-shape' | 't-shape' | 'u-shape' | 'circle' | 'freeform';
export type BoardOrientation = 'length' | 'width';
export type Severity = 'info' | 'warning' | 'blocking';
export type SupportType = 'new-concrete-slab' | 'existing-concrete-slab' | 'stabilized-ground';
export type SupportSystem = 'adjustable-pedestals' | 'pads' | 'unknown';
export type EdgeFinishMode = 'none' | 'full-perimeter';
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
  commercialRecipeId?: 'idea-pin-nord-145x27' | 'idea-cumaru-145x21' | 'idea-garapa-145x21' | 'idea-padouk-120x21' | 'idea-ipe-140x20' | 'silvadec-atmosphere-138x23';
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
  heightCm: number;
  supportLevelProfile?: SupportLevelProfile;
  /** Option client : doubler la lambourde sur les axes de jonction de lames. Désactivé par défaut. */
  doubleJoistsAtButtJoints?: boolean;
  supportType: SupportType;
  supportSystem: SupportSystem;
  edgeFinishMode: EdgeFinishMode;
  edgeCladdingHeightCm: number;
  includeGeotextile: boolean;
  drainage: DrainageAnswer;
  orientation: BoardOrientation;
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

export interface CutPlacement {
  pieceId: string;
  rowIndex: number;
  lengthMm: number;
}

export interface StockBoard {
  index: number;
  stockLengthMm: number;
  cuts: CutPlacement[];
  remainingMm: number;
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
}

/** Raccord entre deux morceaux de lame dans une rangée donnée. */
export interface LayoutButtJoint {
  id: string;
  rowIndex: number;
  transverseCenterMm: number;
  axisPositionMm: number;
}

export interface LayoutResult {
  rowCount: number;
  requiredPieces: RequiredPiece[];
  /** Segments de lames réellement positionnés, rangée par rangée. */
  boardSegments: LayoutBoardSegment[];
  /** Raccords de lames réels, rangée par rangée. */
  buttJoints: LayoutButtJoint[];
  totalRequiredLinearM: number;
  stockBoards: StockBoard[];
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

export type PlannedJoistRole = 'field' | 'perimeter' | 'butt-joint';

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
}

export interface SupportPlanResult {
  status: 'exact' | 'partial' | 'unavailable';
  joistSpacingMm?: number;
  plotSpacingMm?: number;
  joistSegments: PlannedJoistSegment[];
  joistLinearM: number;
  doubleJoistLinearM: number;
  joistStockBoards: StockBoard[];
  buttJointAxisPositionsMm: number[];
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
  trace: string[];
}
