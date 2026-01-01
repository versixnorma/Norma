import { describe, expect, it } from 'vitest';
import {
    calculateCompoundInterest,
    calculateLoanPayment,
    calculateOutstandingBalance,
    calculatePercentage,
    calculatePresentValue,
    calculateSimpleInterest,
    formatCurrency,
} from './utils';

describe('Financial Utils', () => {
  describe('calculateSimpleInterest', () => {
    it('should calculate simple interest correctly', () => {
      const principal = 1000;
      const rate = 0.05; // 5%
      const time = 2; // 2 years

      const result = calculateSimpleInterest(principal, rate, time);
      expect(result).toBe(100); // 1000 * 0.05 * 2 = 100
    });

    it('should handle zero values', () => {
      expect(calculateSimpleInterest(0, 0.05, 2)).toBe(0);
      expect(calculateSimpleInterest(1000, 0, 2)).toBe(0);
      expect(calculateSimpleInterest(1000, 0.05, 0)).toBe(0);
    });
  });

  describe('calculateCompoundInterest', () => {
    it('should calculate compound interest correctly', () => {
      const principal = 1000;
      const rate = 0.05; // 5%
      const time = 2; // 2 years

      const result = calculateCompoundInterest(principal, rate, time);
      expect(result).toBeCloseTo(102.5); // 1000 * (1.05^2) - 1000 = 102.5
    });

    it('should handle different compounding frequencies', () => {
      const principal = 1000;
      const rate = 0.06; // 6%
      const time = 1; // 1 year
      const quarterly = 4;

      const result = calculateCompoundInterest(principal, rate, time, quarterly);
      expect(result).toBeCloseTo(61.36); // 1000 * (1.015^4) - 1000 ≈ 61.36
    });
  });

  describe('calculatePresentValue', () => {
    it('should calculate present value correctly', () => {
      const futureValue = 1100;
      const rate = 0.05; // 5%
      const time = 2; // 2 years

      const result = calculatePresentValue(futureValue, rate, time);
      expect(result).toBeCloseTo(997.73, 2); // 1100 / (1.05^2) ≈ 997.73
    });
  });

  describe('calculateLoanPayment', () => {
    it('should calculate loan payment correctly', () => {
      const principal = 10000;
      const rate = 0.06; // 6%
      const periods = 12; // 12 months

      const result = calculateLoanPayment(principal, rate, periods);
      expect(result).toBeCloseTo(860.66, 2);
    });
  });

  describe('calculateOutstandingBalance', () => {
    it('should calculate outstanding balance correctly', () => {
      const principal = 1000;
      const payments = [100, 100, 100];
      const rate = 0.01; // 1% monthly

      const result = calculateOutstandingBalance(principal, payments, rate);
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when payments exceed debt', () => {
      const principal = 100;
      const payments = [200];
      const rate = 0.01;

      const result = calculateOutstandingBalance(principal, payments, rate);
      expect(result).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in BRL', () => {
      expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
      expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
      expect(formatCurrency(1000000)).toMatch(/R\$\s*1\.000\.000,00/);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 4)).toBe(25);
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('should handle division by zero', () => {
      expect(calculatePercentage(25, 0)).toBe(0);
    });
  });
});
