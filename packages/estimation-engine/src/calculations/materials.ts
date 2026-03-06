import { PROJECT_TYPES, type ProjectType } from "@proestimate/shared/constants";

interface MaterialCostInput {
  quantity: number;
  unitPrice: number;
  projectType: ProjectType;
  customWasteFactor?: number;
}

interface MaterialCostResult {
  baseQuantity: number;
  wasteFactor: number;
  adjustedQuantity: number;
  unitPrice: number;
  totalCost: number;
}

export function calculateMaterialCost(input: MaterialCostInput): MaterialCostResult {
  const wasteFactor = input.customWasteFactor ?? PROJECT_TYPES[input.projectType].defaultWasteFactor;
  const adjustedQuantity = input.quantity * (1 + wasteFactor);
  const totalCost = adjustedQuantity * input.unitPrice;

  return {
    baseQuantity: input.quantity,
    wasteFactor,
    adjustedQuantity: Math.ceil(adjustedQuantity),
    unitPrice: input.unitPrice,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}
