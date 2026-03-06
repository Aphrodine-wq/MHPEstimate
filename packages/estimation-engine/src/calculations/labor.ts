interface LaborCostInput {
  hoursEstimated: number;
  hourlyRate: number;
  crewSize: number;
  complexityMultiplier?: number;
}

interface LaborCostResult {
  crewSize: number;
  hoursPerWorker: number;
  totalCrewHours: number;
  hourlyRate: number;
  complexityMultiplier: number;
  totalCost: number;
}

export function calculateLaborCost(input: LaborCostInput): LaborCostResult {
  const complexityMultiplier = input.complexityMultiplier ?? 1.0;
  const totalCrewHours = input.hoursEstimated * input.crewSize * complexityMultiplier;
  const totalCost = totalCrewHours * input.hourlyRate;

  return {
    crewSize: input.crewSize,
    hoursPerWorker: input.hoursEstimated,
    totalCrewHours: Math.round(totalCrewHours * 100) / 100,
    hourlyRate: input.hourlyRate,
    complexityMultiplier,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}
