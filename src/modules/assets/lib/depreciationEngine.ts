export interface SchedulePeriod {
  periodNumber: number;
  periodDate: Date;
  depreciationAmount: string;
  accumulatedDepreciation: string;
  bookValueAfter: string;
  status: 'Scheduled' | 'Posted' | 'Cancelled';
}

/**
 * Calculates a straight-line depreciation schedule given cost, salvage value, useful life in months, and start date.
 * Handles floating-point rounding so that the sum of depreciation amounts equals (acquisitionCost - salvageValue)
 * and the final bookValueAfter equals salvageValue.
 */
export function calculateStraightLineSchedule(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  startDate: Date
): SchedulePeriod[] {
  if (usefulLifeMonths <= 0 || acquisitionCost < 0 || salvageValue < 0 || acquisitionCost < salvageValue) {
    throw new Error('Invalid depreciation parameters');
  }

  const depreciableAmount = Number((acquisitionCost - salvageValue).toFixed(2));
  const baseMonthlyDep = Number((depreciableAmount / usefulLifeMonths).toFixed(2));
  
  const schedule: SchedulePeriod[] = [];
  let accum = 0;

  for (let i = 1; i <= usefulLifeMonths; i++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + i);

    let periodDep = baseMonthlyDep;
    if (i === usefulLifeMonths) {
      // Adjust last period for rounding differences
      periodDep = Number((depreciableAmount - accum).toFixed(2));
    }
    accum = Number((accum + periodDep).toFixed(2));
    const bookValueAfter = Number((acquisitionCost - accum).toFixed(2));

    schedule.push({
      periodNumber: i,
      periodDate,
      depreciationAmount: periodDep.toFixed(2),
      accumulatedDepreciation: accum.toFixed(2),
      bookValueAfter: bookValueAfter.toFixed(2),
      status: 'Scheduled'
    });
  }

  return schedule;
}

/**
 * Calculates a declining balance depreciation schedule.
 * Uses accelerated depreciation where early periods carry higher depreciation amounts.
 */
export function calculateDecliningBalanceSchedule(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  startDate: Date,
  annualRatePercent?: number
): SchedulePeriod[] {
  if (usefulLifeMonths <= 0 || acquisitionCost < 0 || salvageValue < 0 || acquisitionCost < salvageValue) {
    throw new Error('Invalid depreciation parameters');
  }

  const depreciableAmount = Number((acquisitionCost - salvageValue).toFixed(2));
  if (depreciableAmount === 0) {
    return [];
  }

  const usefulLifeYears = usefulLifeMonths / 12;
  // Calculate annual rate (using custom % rate if provided, else auto formula)
  let annualRate = 0;
  if (annualRatePercent && annualRatePercent > 0) {
    annualRate = annualRatePercent / 100;
  } else if (salvageValue > 0) {
    annualRate = 1 - Math.pow(salvageValue / acquisitionCost, 1 / usefulLifeYears);
  } else {
    // Standard double-declining rate (2 / years) capped at 0.5
    annualRate = Math.min(2 / Math.max(usefulLifeYears, 1), 0.5);
  }
  const monthlyRate = annualRate / 12;

  const schedule: SchedulePeriod[] = [];
  let currentBookValue = acquisitionCost;
  let accum = 0;

  for (let i = 1; i <= usefulLifeMonths; i++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + i);

    let periodDep = Number((currentBookValue * monthlyRate).toFixed(2));
    
    // Ensure book value doesn't drop below salvage value
    if (currentBookValue - periodDep < salvageValue || i === usefulLifeMonths) {
      periodDep = Number((currentBookValue - salvageValue).toFixed(2));
    }
    if (periodDep < 0) periodDep = 0;

    accum = Number((accum + periodDep).toFixed(2));
    currentBookValue = Number((acquisitionCost - accum).toFixed(2));

    schedule.push({
      periodNumber: i,
      periodDate,
      depreciationAmount: periodDep.toFixed(2),
      accumulatedDepreciation: accum.toFixed(2),
      bookValueAfter: currentBookValue.toFixed(2),
      status: 'Scheduled'
    });
  }

  return schedule;
}

