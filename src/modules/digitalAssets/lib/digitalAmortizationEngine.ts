import { Decimal } from 'decimal.js';
import { addMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export interface AmortizationScheduleRow {
  periodNumber: number;
  periodDate: Date;
  amortizationAmount: string;
  accumulatedAmortization: string;
  bookValueAfter: string;
}

export function generateSchedule(cost: number | string, months: number, startDate: Date): AmortizationScheduleRow[] {
  if (months <= 0) {
    throw new Error('Amortization months must be greater than 0');
  }

  const totalCost = new Decimal(cost);
  if (totalCost.lte(0)) {
    throw new Error('Cost must be greater than 0');
  }

  const schedule: AmortizationScheduleRow[] = [];
  const monthlyAmount = totalCost.div(months);

  let accumulated = new Decimal(0);
  let remainingBookValue = totalCost;

  let currentPeriodDate = startOfMonth(startDate);

  // Pro-rata first period if startDate is not the 1st of the month
  const startDay = startDate.getDate();
  const daysInFirstMonth = differenceInDays(endOfMonth(startDate), startOfMonth(startDate)) + 1;
  const daysActiveInFirstMonth = daysInFirstMonth - startDay + 1;

  let firstPeriodFraction = new Decimal(1);
  if (daysActiveInFirstMonth < daysInFirstMonth) {
    firstPeriodFraction = new Decimal(daysActiveInFirstMonth).div(daysInFirstMonth);
  }

  // Adjust total periods if first month is pro-rated (we might need an extra month to finish the amount)
  let periods = months;
  if (firstPeriodFraction.lt(1)) {
    periods = months + 1;
  }

  for (let i = 1; i <= periods; i++) {
    let currentAmortization = monthlyAmount;

    if (i === 1) {
      currentAmortization = monthlyAmount.mul(firstPeriodFraction);
    } else if (i === periods) {
      // Last period takes the remainder
      currentAmortization = remainingBookValue;
    } else if (remainingBookValue.lt(currentAmortization)) {
      currentAmortization = remainingBookValue;
    }

    currentAmortization = currentAmortization.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    if (currentAmortization.gt(remainingBookValue)) {
      currentAmortization = remainingBookValue; // Sanity check to not over-amortize
    }

    accumulated = accumulated.add(currentAmortization);
    remainingBookValue = remainingBookValue.sub(currentAmortization);

    schedule.push({
      periodNumber: i,
      periodDate: new Date(currentPeriodDate),
      amortizationAmount: currentAmortization.toFixed(2),
      accumulatedAmortization: accumulated.toFixed(2),
      bookValueAfter: remainingBookValue.toFixed(2),
    });

    currentPeriodDate = addMonths(currentPeriodDate, 1);
    
    if (remainingBookValue.lte(0)) {
      break;
    }
  }

  return schedule;
}
