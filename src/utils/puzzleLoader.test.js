import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadPuzzle, loadSolution } from './puzzleLoader';

// Mock fetch globally
global.fetch = vi.fn();

describe('puzzleLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadPuzzle', () => {
    it('should load puzzle for today when no date is provided', async () => {
      const mockPuzzle = {
        date: '2025-12-24',
        north_pole: { x: 500, y: 500 },
        houses: [{ id: 1, x: 100, y: 100 }],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPuzzle
      });

      const result = await loadPuzzle();

      expect(result.puzzleData).toEqual(mockPuzzle);
      expect(result.isTest).toBe(false);
    });

    it('should load puzzle for specific date when date object is provided', async () => {
      const mockPuzzle = {
        date: '2025-12-01',
        north_pole: { x: 500, y: 500 },
        houses: [{ id: 1, x: 100, y: 100 }],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPuzzle
      });

      const dateObj = { year: '2025', month: '12', day: '01' };
      const result = await loadPuzzle(dateObj);

      expect(global.fetch).toHaveBeenCalledWith('/puzzles/2025/12/01_medium.json');
      expect(result.puzzleData).toEqual(mockPuzzle);
      expect(result.isTest).toBe(false);
    });

    it('should construct correct puzzle path from date object', async () => {
      const mockPuzzle = {
        date: '2025-12-15',
        north_pole: { x: 500, y: 500 },
        houses: [],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPuzzle
      });

      const dateObj = { year: '2025', month: '12', day: '15' };
      await loadPuzzle(dateObj);

      expect(global.fetch).toHaveBeenCalledWith('/puzzles/2025/12/15_medium.json');
    });

    it('should load puzzle with specified difficulty', async () => {
      const mockPuzzle = {
        date: '2025-12-15',
        north_pole: { x: 500, y: 500 },
        houses: [],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPuzzle
      });

      const dateObj = { year: '2025', month: '12', day: '15' };
      await loadPuzzle(dateObj, 'hard');

      expect(global.fetch).toHaveBeenCalledWith('/puzzles/2025/12/15_hard.json');
    });

    it('should fallback to test puzzle when puzzle is not found', async () => {
      const mockFallbackPuzzle = {
        date: '2025-12-24',
        north_pole: { x: 500, y: 500 },
        houses: [],
        optimal_distance: 1000
      };

      // First fetch fails (puzzle not found)
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      // Legacy format for same date fails
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      // Fallback puzzle with difficulty succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFallbackPuzzle
      });

      const dateObj = { year: '2025', month: '12', day: '99' };
      const result = await loadPuzzle(dateObj);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(global.fetch).toHaveBeenNthCalledWith(1, '/puzzles/2025/12/99_medium.json');
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/puzzles/2025/12/99.json');
      expect(global.fetch).toHaveBeenNthCalledWith(3, '/puzzles/2025/12/24_medium.json');
      expect(result.puzzleData.date).toBe('2025-12-24 (Test)');
      expect(result.isTest).toBe(true);
    });

    it('should fallback to legacy puzzle format when difficulty puzzle not found', async () => {
      const mockLegacyPuzzle = {
        date: '2025-12-15',
        north_pole: { x: 500, y: 500 },
        houses: [],
        optimal_distance: 1000
      };

      // First fetch fails (difficulty puzzle not found)
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      // Legacy format for same date succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLegacyPuzzle
      });

      const dateObj = { year: '2025', month: '12', day: '15' };
      const result = await loadPuzzle(dateObj, 'easy');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, '/puzzles/2025/12/15_easy.json');
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/puzzles/2025/12/15.json');
      expect(result.puzzleData).toEqual(mockLegacyPuzzle);
      expect(result.isTest).toBe(false);
    });

    it('should throw error when both puzzle and fallback fail', async () => {
      // Both fetches fail
      global.fetch.mockResolvedValue({
        ok: false
      });

      const dateObj = { year: '2025', month: '12', day: '99' };

      await expect(loadPuzzle(dateObj)).rejects.toThrow('Fallback puzzle also not found');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const dateObj = { year: '2025', month: '12', day: '01' };

      await expect(loadPuzzle(dateObj)).rejects.toThrow();
    });
  });

  describe('loadSolution', () => {
    it('should load solution for given puzzle date', async () => {
      const mockSolution = {
        date: '2025-12-15',
        route: [
          { type: 'north_pole', x: 500, y: 500 },
          { type: 'house', id: 1, x: 100, y: 100 },
          { type: 'north_pole', x: 500, y: 500 }
        ],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSolution
      });

      const result = await loadSolution('2025-12-15');

      expect(global.fetch).toHaveBeenCalledWith('/puzzles/2025/12/15_medium_solution.json');
      expect(result).toEqual(mockSolution);
    });

    it('should load solution with specified difficulty', async () => {
      const mockSolution = {
        date: '2025-12-15',
        route: [],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSolution
      });

      await loadSolution('2025-12-15', 'hard');

      expect(global.fetch).toHaveBeenCalledWith('/puzzles/2025/12/15_hard_solution.json');
    });

    it('should parse date string correctly', async () => {
      const mockSolution = {
        date: '2025-12-01',
        route: [],
        optimal_distance: 1000
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSolution
      });

      await loadSolution('2025-12-01');

      expect(global.fetch).toHaveBeenCalledWith('/puzzles/2025/12/01_medium_solution.json');
    });

    it('should fallback to legacy solution format when difficulty solution not found', async () => {
      const mockSolution = {
        date: '2025-12-15',
        route: [],
        optimal_distance: 1000
      };

      // First fetch fails (difficulty solution not found)
      global.fetch.mockResolvedValueOnce({
        ok: false
      });

      // Fallback to legacy format succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSolution
      });

      const result = await loadSolution('2025-12-15', 'easy');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, '/puzzles/2025/12/15_easy_solution.json');
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/puzzles/2025/12/15_solution.json');
      expect(result).toEqual(mockSolution);
    });

    it('should throw error when solution is not found', async () => {
      // Both difficulty and legacy format fail
      global.fetch.mockResolvedValue({
        ok: false
      });

      await expect(loadSolution('2025-12-99')).rejects.toThrow('Solution not found');
    });

    it('should handle network errors when loading solution', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(loadSolution('2025-12-15')).rejects.toThrow('Network error');
    });
  });
});

