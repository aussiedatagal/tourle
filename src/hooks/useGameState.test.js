import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from './useGameState';
import { loadPuzzle, loadSolution } from '../utils/puzzleLoader';

// Mock the puzzle loader
vi.mock('../utils/puzzleLoader', () => ({
  loadPuzzle: vi.fn(() => Promise.resolve({
    puzzleData: {
      date: '2025-12-24',
      north_pole: { x: 100, y: 100 },
      houses: [
        { id: 1, x: 200, y: 200 },
        { id: 2, x: 300, y: 300 }
      ],
      optimal_distance: 500
    }
  })),
  loadSolution: vi.fn(() => Promise.resolve({
    route: [
      { type: 'north_pole', x: 100, y: 100 },
      { type: 'house', id: 1, x: 200, y: 200 },
      { type: 'house', id: 2, x: 300, y: 300 },
      { type: 'north_pole', x: 100, y: 100 }
    ]
  }))
}));

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('First click line drawing', () => {
    it('should add both north pole and house to route when clicking first house', async () => {
      const { result } = renderHook(() => useGameState());

      // Wait for puzzle to load
      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      expect(result.current.puzzleData).not.toBeNull();

      // Initially route should be empty
      expect(result.current.route.length).toBe(0);

      // Click on first house
      await act(() => {
        result.current.handleNodeClick(200, 200);
      });

      // Route should now have 2 items: north pole and house
      expect(result.current.route.length).toBe(2);
      expect(result.current.route[0].type).toBe('north_pole');
      expect(result.current.route[1].type).toBe('house');
      expect(result.current.route[1].id).toBe(1);
      
      // Visited houses should include the clicked house
      expect(result.current.visitedHouses.has(1)).toBe(true);
    });

    it('should draw a line from north pole to first house (route length >= 2)', async () => {
      const { result } = renderHook(() => useGameState());

      // Wait for puzzle to load
      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      expect(result.current.puzzleData).not.toBeNull();

      // Click on first house
      await act(() => {
        result.current.handleNodeClick(200, 200);
      });

      // Route should have at least 2 points to draw a line
      expect(result.current.route.length).toBeGreaterThanOrEqual(2);
      
      // Verify the route contains both north pole and house
      const hasNorthPole = result.current.route.some(node => node.type === 'north_pole');
      const hasHouse = result.current.route.some(node => node.type === 'house' && node.id === 1);
      
      expect(hasNorthPole).toBe(true);
      expect(hasHouse).toBe(true);
    });

    it('should not allow visiting the same house twice', async () => {
      const { result } = renderHook(() => useGameState());

      // Wait for puzzle to load
      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      expect(result.current.puzzleData).not.toBeNull();

      // Click on first house
      await act(() => {
        result.current.handleNodeClick(200, 200);
      });

      const initialRouteLength = result.current.route.length;
      const initialVisitedCount = result.current.visitedHouses.size;

      // Try to click the same house again
      await act(() => {
        result.current.handleNodeClick(200, 200);
      });

      // Route and visited houses should not change
      expect(result.current.route.length).toBe(initialRouteLength);
      expect(result.current.visitedHouses.size).toBe(initialVisitedCount);
    });

    it('should automatically draw line from root to selected node after reset', async () => {
      const { result } = renderHook(() => useGameState());

      // Wait for puzzle to load
      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      expect(result.current.puzzleData).not.toBeNull();

      // Build a route first
      await act(() => {
        result.current.handleNodeClick(200, 200); // First house
      });
      await act(() => {
        result.current.handleNodeClick(300, 300); // Second house
      });

      // Verify route has nodes
      expect(result.current.route.length).toBeGreaterThan(0);

      // Reset the route
      await act(() => {
        result.current.resetRoute();
      });

      // After reset, route should be empty
      expect(result.current.route.length).toBe(0);
      expect(result.current.visitedHouses.size).toBe(0);

      // Click on a house (not the root node)
      await act(() => {
        result.current.handleNodeClick(300, 300); // Click on second house
      });

      // Route should have exactly 2 nodes: root (north pole) and selected house
      expect(result.current.route.length).toBe(2);
      expect(result.current.route[0].type).toBe('north_pole');
      expect(result.current.route[0].x).toBe(100);
      expect(result.current.route[0].y).toBe(100);
      expect(result.current.route[1].type).toBe('house');
      expect(result.current.route[1].id).toBe(2);
      expect(result.current.route[1].x).toBe(300);
      expect(result.current.route[1].y).toBe(300);

      // Vehicle marker should be on the selected node (last node in route)
      const lastNode = result.current.route[result.current.route.length - 1];
      expect(lastNode.type).toBe('house');
      expect(lastNode.id).toBe(2);
      expect(lastNode.x).toBe(300);
      expect(lastNode.y).toBe(300);
    });
  });

  describe('Date selection', () => {
    it('should load puzzle with no date (defaults to today)', async () => {
      const { result } = renderHook(() => useGameState());

      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      expect(loadPuzzle).toHaveBeenCalledWith(null, 'medium');
      expect(result.current.puzzleData).not.toBeNull();
      expect(result.current.puzzleData.date).toBe('2025-12-24');
    });

    it('should load puzzle with specific date when provided', async () => {
      const dateObj = { year: '2025', month: '12', day: '01' };
      const { result } = renderHook(() => useGameState('2025-12-01'));

      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      expect(loadPuzzle).toHaveBeenCalledWith(dateObj, 'medium');
      expect(result.current.puzzleData).not.toBeNull();
    });

    it('should reset game state when date changes', async () => {
      const { result, rerender } = renderHook(
        ({ date }) => useGameState(date),
        { initialProps: { date: '2025-12-01' } }
      );

      // Wait for initial puzzle to load
      await act(async () => {
        let attempts = 0;
        while (!result.current.puzzleData && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      // Build some route
      await act(() => {
        result.current.handleNodeClick(200, 200);
      });

      expect(result.current.route.length).toBeGreaterThan(0);
      expect(result.current.visitedHouses.size).toBeGreaterThan(0);

      // Change date
      vi.mocked(loadPuzzle).mockResolvedValueOnce({
        puzzleData: {
          date: '2025-12-02',
          north_pole: { x: 100, y: 100 },
          houses: [
            { id: 1, x: 200, y: 200 },
            { id: 2, x: 300, y: 300 }
          ],
          optimal_distance: 500
        }
      });

      rerender({ date: '2025-12-02' });

      // Wait for new puzzle to load
      await act(async () => {
        let attempts = 0;
        while (result.current.puzzleData?.date !== '2025-12-02' && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
      });

      // Game state should be reset
      expect(result.current.route.length).toBe(0);
      expect(result.current.visitedHouses.size).toBe(0);
      expect(result.current.gameComplete).toBe(false);
      expect(result.current.showingSolution).toBe(false);
      expect(result.current.puzzleData.date).toBe('2025-12-02');
    });

    it('should call loadPuzzle with correct date object format', async () => {
      renderHook(() => useGameState('2025-12-15'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(loadPuzzle).toHaveBeenCalledWith({
        year: '2025',
        month: '12',
        day: '15'
      }, 'medium');
    });
  });
});

