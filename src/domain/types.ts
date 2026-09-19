export type ShapeType = 'rectangle' | 'l-shape';
export type BoardOrientation = 'length' | 'width';
export type Severity = 'info' | 'warning' | 'blocking';

export interface Dimensions {
  lengthM: number;
  widthM: number;
  notchLengthM: number;
  notchWidthM: number;
}

export interface BoardSpec {
  id: string;
  label: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm?: number;
  gapMm: number;
  priceTtcPerM2?: number;
  isDemo: boolean;
}

export interface ProjectInput {
  projectName: string;
  shape: ShapeType;
  dimensions: Dimensions;
  orientation: BoardOrientation;
  board: BoardSpec;
}

export interface Diagnostic {
  tag: string;
  severity: Severity;
  message: string;
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
}

export interface PricingResult {
  materialTtc?: number;
  unitPriceTtcPerM2?: number;
}

export interface ConfiguratorResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  geometry?: GeometryResult;
  layout?: LayoutResult;
  pricing?: PricingResult;
  trace: string[];
}
