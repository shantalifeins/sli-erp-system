import { describe, it, expect } from 'vitest';
import { calculateStraightLineSchedule, calculateDecliningBalanceSchedule } from '../depreciationEngine.js';

describe('Depreciation Engine Unit Tests', () => {
  it('should calculate Straight Line schedule correctly', () => {
    const schedule = calculateStraightLineSchedule(120000, 0, 12, new Date('2026-01-01'));
    expect(schedule).toHaveLength(12);
    expect(schedule[0].depreciationAmount).toBe('10000.00');
    expect(schedule[11].bookValueAfter).toBe('0.00');
    expect(schedule[11].accumulatedDepreciation).toBe('120000.00');
  });

  it('should calculate Declining Balance with custom annual % rate', () => {
    const schedule = calculateDecliningBalanceSchedule(100000, 0, 12, new Date('2026-01-01'), 20);
    expect(schedule).toHaveLength(12);
    // Monthly rate = 20 / 100 / 12 = 0.016667
    // Period 1 depr = 100000 * 0.016667 = 1666.67
    expect(Number(schedule[0].depreciationAmount)).toBeCloseTo(1666.67, 1);
    expect(Number(schedule[0].bookValueAfter)).toBeCloseTo(98333.33, 1);
  });

  it('should calculate Declining Balance auto double-declining when rate is 0', () => {
    const schedule = calculateDecliningBalanceSchedule(100000, 10000, 36, new Date('2026-01-01'), 0);
    expect(schedule).toHaveLength(36);
    expect(Number(schedule[0].depreciationAmount)).toBeGreaterThan(Number(schedule[1].depreciationAmount));
    expect(Number(schedule[35].bookValueAfter)).toBe(10000);
  });

  it('should throw error for invalid parameters', () => {
    expect(() => calculateStraightLineSchedule(-100, 0, 12, new Date())).toThrow('Invalid depreciation parameters');
    expect(() => calculateDecliningBalanceSchedule(100, 200, 12, new Date())).toThrow('Invalid depreciation parameters');
  });
});
