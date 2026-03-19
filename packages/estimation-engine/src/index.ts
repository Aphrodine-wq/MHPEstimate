export { calculateMaterialCost } from "./calculations/materials";
export { calculateLaborCost } from "./calculations/labor";
export { calculateMargins } from "./calculations/margins";
export { runValidation } from "./validation/runner";
export {
  suggestPrice,
  generateEstimateFromTemplate,
  generatePackageEstimate,
  getCategoryPricing,
  findSimilarLineItems,
  type PricingSuggestion,
  type EstimateFromTemplate,
  type PackageEstimate,
} from "./calculations/pricing";

// ── Moasure Import ──
export {
  parseMoasureFile,
  detectFormat,
  MoasureParseError,
  mapMoasureToEstimate,
  getSupportedProjectTypes,
  validateMoasureMeasurement,
  type MoasureMeasurement,
  type MoasureSegment,
  type MoasureLayer,
  type MoasurePoint,
  type MoasureFileFormat,
  type MoasureMapping,
  type MoasureMappedField,
  type MoasureValidationResult,
  type MoasureValidationSummary,
} from "./importers";

// ── Plan Import ──
export {
  generateTakeoffFromPlan,
  type PlanAnalysisResult,
  type PlanPageAnalysis,
  type PlanTakeoffItem,
  type ExtractedRoom,
  type ExtractedOpening,
  type ExtractedDimension,
} from "./importers";

// ── Pad-to-Estimate ──
export {
  generateEstimateFromPad,
  type PadEstimateConfig,
  type PadEstimateResult,
  type PadDivision,
  type GradingAnalysis,
} from "./importers";

// ── Auto Estimate ──
export {
  generateAutoEstimate,
  type AutoEstimateInput,
  type AutoEstimateResult,
  type AutoEstimateLineItem,
} from "./calculations/auto-estimate";

// Re-export indirect costs for convenience
export {
  INDIRECT_COSTS,
  INDIRECT_COST_CATEGORY_LABELS,
  getIndirectCostsForProject,
  calculateIndirectCost,
  type IndirectCost,
} from "@proestimate/shared/constants/indirect-costs";

// Re-export live pricing utilities for convenience
export {
  TRADE_LABOR_RATES,
  CATEGORY_TO_TRADE,
  getTradeRateForCategory,
  getAdjustedTradeRate,
  type TradeRate,
} from "@proestimate/shared/constants/trade-labor-rates";
export {
  COMMODITY_INDICES,
  calculateCommodityAdjustment,
  getCommodityIndicesForCategory,
  type CommodityIndex,
} from "@proestimate/shared/constants/commodity-indices";

// ── Clone Estimate ──
export {
  cloneAndAdjustEstimate,
  type CloneEstimateInput,
  type CloneEstimateResult,
} from "./calculations/clone-estimate";

// ── Win Prediction ──
export {
  predictWinProbability,
  type WinPredictionInput,
  type WinPredictionResult,
  type PriceSuggestion,
} from "./calculations/win-prediction";

// ── iCal Export ──
export {
  generateICalendar,
  generateVEvent,
  type ICalPhase,
  type ICalOptions,
} from "./ical-export";

// ── Material Cart ──
export {
  buildCartLinks,
  buildHomeDepotCartUrl,
  buildLowesCartUrl,
  type CartLineItem,
  type CartResult,
} from "./material-cart";
