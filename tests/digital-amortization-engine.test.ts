import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/modules/digitalAssets/lib/digitalAmortizationEngine.js';

describe('Digital Amortization Engine', () => {

  it('should generate correct schedule for whole months (no pro-rata)', () => {
    const cost = 12000;
    const months = 12;
    const startDate = new Date('2025-01-01');

    const schedule = generateSchedule(cost, months, startDate);

    expect(schedule.length).toBe(12);
    expect(schedule[0].amortizationAmount).toBe('1000.00');
    expect(schedule[11].bookValueAfter).toBe('0.00');

    const totalAmortized = schedule.reduce((sum, row) => sum + parseFloat(row.amortizationAmount), 0);
    expect(Math.abs(totalAmortized - cost)).toBeLessThan(0.01);
  });

  it('should apply pro-rata for partial first month', () => {
    const cost = 3000;
    const months = 3;
    // Start mid-month: 15th of Jan (17 days active out of 31)
    const startDate = new Date('2025-01-15');

    const schedule = generateSchedule(cost, months, startDate);

    // First period should be less than full monthly amount (1000)
    expect(parseFloat(schedule[0].amortizationAmount)).toBeLessThan(1000);

    // Total amortized should still equal cost
    const totalAmortized = schedule.reduce((sum, row) => sum + parseFloat(row.amortizationAmount), 0);
    expect(Math.abs(totalAmortized - cost)).toBeLessThan(0.02);

    // Last row book value should be zero
    expect(parseFloat(schedule[schedule.length - 1].bookValueAfter)).toBe(0);
  });

  it('should handle 1-month amortization (no pro-rata)', () => {
    const cost = 5000;
    const months = 1;
    const startDate = new Date('2025-03-01');

    const schedule = generateSchedule(cost, months, startDate);

    expect(schedule.length).toBe(1);
    expect(schedule[0].amortizationAmount).toBe('5000.00');
    expect(schedule[0].accumulatedAmortization).toBe('5000.00');
    expect(schedule[0].bookValueAfter).toBe('0.00');
  });

  it('should handle 1-month amortization with pro-rata', () => {
    const cost = 3100;
    const months = 1;
    const startDate = new Date('2025-01-16'); // 16 days active out of 31

    const schedule = generateSchedule(cost, months, startDate);

    // Will have 2 periods (partial month + remainder)
    expect(schedule.length).toBeGreaterThanOrEqual(1);

    const totalAmortized = schedule.reduce((sum, row) => sum + parseFloat(row.amortizationAmount), 0);
    expect(Math.abs(totalAmortized - cost)).toBeLessThan(0.02);
    expect(parseFloat(schedule[schedule.length - 1].bookValueAfter)).toBe(0);
  });

  it('should throw error for zero months', () => {
    expect(() => generateSchedule(1000, 0, new Date())).toThrow('Amortization months must be greater than 0');
  });

  it('should throw error for negative months', () => {
    expect(() => generateSchedule(1000, -1, new Date())).toThrow('Amortization months must be greater than 0');
  });

  it('should throw error for zero cost', () => {
    expect(() => generateSchedule(0, 12, new Date())).toThrow('Cost must be greater than 0');
  });

  it('should correctly set period numbers sequentially', () => {
    const schedule = generateSchedule(6000, 6, new Date('2025-01-01'));
    schedule.forEach((row, i) => {
      expect(row.periodNumber).toBe(i + 1);
    });
  });

  it('accumulated amortization should increase monotonically', () => {
    const schedule = generateSchedule(12000, 12, new Date('2025-01-01'));
    for (let i = 1; i < schedule.length; i++) {
      expect(parseFloat(schedule[i].accumulatedAmortization))
        .toBeGreaterThan(parseFloat(schedule[i - 1].accumulatedAmortization));
    }
  });

  it('book value should decrease monotonically and end at zero', () => {
    const schedule = generateSchedule(12000, 12, new Date('2025-01-01'));
    for (let i = 1; i < schedule.length; i++) {
      expect(parseFloat(schedule[i].bookValueAfter))
        .toBeLessThan(parseFloat(schedule[i - 1].bookValueAfter));
    }
    expect(parseFloat(schedule[schedule.length - 1].bookValueAfter)).toBe(0);
  });
});
