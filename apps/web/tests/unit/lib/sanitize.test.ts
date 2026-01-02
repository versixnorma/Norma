import { describe, expect, it } from 'vitest';
import { sanitizeSearchQuery, sanitizeUUID } from '../../../src/lib/sanitize';

describe('sanitize', () => {
  describe('sanitizeSearchQuery', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeSearchQuery('')).toBe('');
    });

    it('should remove special characters', () => {
      const input = "user's data % code _ test";
      const expected = 'users data  code  test'; // removed ', %, _
      expect(sanitizeSearchQuery(input)).toBe(expected);
    });

    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  test  ')).toBe('test');
    });

    it('should handle SQL injection attempts', () => {
      const input = "admin'; DROP TABLE users; --";
      const expected = 'admin DROP TABLE users --'; // removed ';
      expect(sanitizeSearchQuery(input)).toBe(expected);
    });
  });

  describe('sanitizeUUID', () => {
    it('should return valid UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(sanitizeUUID(validUUID)).toBe(validUUID);
    });

    it('should match case insensitive', () => {
      const validUUID = '123E4567-E89B-12D3-A456-426614174000';
      expect(sanitizeUUID(validUUID)).toBe(validUUID);
    });

    it('should throw error for invalid UUID', () => {
      expect(() => sanitizeUUID('invalid-uuid')).toThrow('UUID inválido');
    });

    it('should throw error for Malformed UUID', () => {
      expect(() => sanitizeUUID('123e4567-e89b-12d3-a456-42661417400')).toThrow('UUID inválido');
    });
  });
});
