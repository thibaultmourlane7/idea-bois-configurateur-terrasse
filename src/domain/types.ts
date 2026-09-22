export type ShapeType = 'rectangle' | 'l-shape' | 't-shape' | 'u-shape' | 'circle';
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

export interface TerraceObstacle {
  id: string;
  kind: ObstacleKind;
  label: string;
  shape: ObstacleShape;
  xM: number;
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
  heightCm: number;
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

export interface LayoutResult {
  rowCount: number;
  requiredPieces: RequiredPiece[];
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
  trace: string[];
}
