import { describe, it, expect } from 'vitest';
import { calculateStraightLineSchedule } from '../src/modules/assets/lib/depreciationEngine.js';

describe('Phase 5 — Depreciation Engine Unit Tests', () => {
  it('should generate N-period straight-line depreciation schedule matching usefulLifeMonths', () => {
    const cost = 120000;
    const salvage = 0;
    const months = 12;
    const startDate = new Date('2026-01-01');

    const schedule = calculateStraightLineSchedule(cost, salvage, months, startDate);

    expect(schedule.length).toBe(12);
    expect(schedule[0].periodNumber).toBe(1);
    expect(schedule[11].periodNumber).toBe(12);

    // Each month should be 10000.00
    expect(schedule[0].depreciationAmount).toBe('10000.00');
    expect(schedule[11].depreciationAmount).toBe('10000.00');
    expect(schedule[11].accumulatedDepreciation).toBe('120000.00');
    expect(schedule[11].bookValueAfter).toBe('0.00');
  });

  it('should adjust final period for rounding differences without floating point drift', () => {
    // 1000 cost over 3 months -> 333.33 + 333.33 + 333.34 = 1000.00
    const cost = 1000;
    const salvage = 0;
    const months = 3;
    const startDate = new Date('2026-01-01');

    const schedule = calculateStraightLineSchedule(cost, salvage, months, startDate);

    expect(schedule.length).toBe(3);
    expect(schedule[0].depreciationAmount).toBe('333.33');
    expect(schedule[1].depreciationAmount).toBe('333.33');
    expect(schedule[2].depreciationAmount).toBe('333.34'); // rounding adjustment

    const totalDep = schedule.reduce((sum, item) => sum + Number(item.depreciationAmount), 0);
    expect(totalDep).toBe(1000);
    expect(schedule[2].bookValueAfter).toBe('0.00');
  });

  it('should stop book value exactly at salvageValue after final period', () => {
    const cost = 50000;
    const salvage = 5000;
    const months = 6;
    const startDate = new Date('2026-01-01');

    const schedule = calculateStraightLineSchedule(cost, salvage, months, startDate);

    expect(schedule.length).toBe(6);
    expect(schedule[5].bookValueAfter).toBe('5000.00');
    expect(schedule[5].accumulatedDepreciation).toBe('45000.00');
  });

  it('should throw error on invalid depreciation inputs', () => {
    expect(() => calculateStraightLineSchedule(-100, 0, 12, new Date())).toThrow();
    expect(() => calculateStraightLineSchedule(1000, 2000, 12, new Date())).toThrow();
    expect(() => calculateStraightLineSchedule(1000, 0, 0, new Date())).toThrow();
  });
});
