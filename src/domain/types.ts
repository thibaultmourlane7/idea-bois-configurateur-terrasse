export type ShapeType = 'rectangle' | 'l-shape';
export type BoardOrientation = 'length' | 'width';
export type Severity = 'info' | 'warning' | 'blocking';
export type SupportType = 'new-concrete-slab' | 'existing-concrete-slab' | 'stabilized-ground';
export type DrainageAnswer = 'yes' | 'no' | 'unknown';
export type MaterialFamily = 'solid-wood' | 'composite';
export type TechnicalEngine = 'nf-dtu-51-4' | 'manufacturer-rules';

export interface Dimensions {
  lengthM: number;
  widthM: number;
  notchLengthM: number;
  notchWidthM: number;
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

export interface BoardSpec {
  id: string;
  label: string;
  subtitle: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  gapMm: number;
  priceTtcPerM2?: number;
  isDemo: boolean;
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
  heightCm: number;
  supportType: SupportType;
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
  areaM2: number;
  perimeterM: number;
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
  materialTtc?: number;
  unitPriceTtcPerM2?: number;
}

export interface ConfiguratorResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  geometry?: GeometryResult;
  structure?: StructureResult;
  layout?: LayoutResult;
  pricing?: PricingResult;
  trace: string[];
}
