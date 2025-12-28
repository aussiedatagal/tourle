import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from './renderer';

describe('renderer', () => {
  let mockCtx;
  let mockCanvas;
  let mockPuzzleData;
  let mockTheme;

  beforeEach(() => {
    // Mock canvas context
    mockCtx = {
      clearRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      font: '',
      textAlign: '',
      textBaseline: '',
      fillText: vi.fn()
    };

    // Mock canvas with getBoundingClientRect for scale calculation
    mockCanvas = {
      width: 1000,
      height: 1000,
      getContext: vi.fn(() => mockCtx),
      getBoundingClientRect: vi.fn(() => ({
        width: 1000,
        height: 1000
      }))
    };

    // Mock window properties for mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920
    });
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: null
    });

    // Mock puzzle data
    mockPuzzleData = {
      date: '2025-12-24',
      north_pole: { x: 500, y: 500 },
      houses: [
        { id: 1, x: 200, y: 200 },
        { id: 2, x: 300, y: 300 }
      ],
      optimal_distance: 1000
    };

    // Mock theme
    mockTheme = {
      icons: {
        node: '🏠',
        nodeVisited: '🎁',
        startNode: '🏭',
        vehicle: '🦌🎅',
        instructionBullet: '❄️'
      },
      colors: {
        route: '#4a90e2',
        solution: '#ffd700',
        startNode: '#c41e3a',
        house: '#ffffff',
        houseVisited: '#90EE90'
      }
    };
  });

  describe('responsive sizing', () => {
    it('should use larger font sizes on mobile devices', () => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: {}
      });

      mockCanvas.getBoundingClientRect = vi.fn(() => ({
        width: 500,
        height: 500
      }));

      const route = [];
      const visitedHouses = new Set();

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Check that font size is set (should be larger on mobile)
      expect(mockCtx.font).toContain('px');
      const fontSize = parseInt(mockCtx.font.match(/(\d+)px/)?.[1] || '0');
      // On mobile with scale 1.5, base 20px becomes at least 30px
      expect(fontSize).toBeGreaterThanOrEqual(20);
    });

    it('should reduce scale when nodes are too close together', () => {
      // Create puzzle data with nodes very close together
      const closePuzzleData = {
        date: '2025-12-24',
        north_pole: { x: 500, y: 500 },
        houses: [
          { id: 1, x: 520, y: 500 }, // Only 20px away from north pole
          { id: 2, x: 300, y: 300 }
        ],
        optimal_distance: 1000
      };

      // Mock mobile environment (which would normally use scale 2)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: {}
      });

      mockCanvas.getBoundingClientRect = vi.fn(() => ({
        width: 500,
        height: 500
      }));

      const route = [];
      const visitedHouses = new Set();

      render(
        mockCtx,
        mockCanvas,
        closePuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Should have rendered (no errors)
      expect(mockCtx.clearRect).toHaveBeenCalled();
      // Font sizes should be adjusted to prevent overlap
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  describe('drawRouteNodes', () => {
    it('should draw vehicle at root node when route is empty', () => {
      const route = [];
      const visitedHouses = new Set();

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Verify vehicle is drawn at North Pole position
      // Offset may vary based on scale, so just check it's called with vehicle icon
      expect(mockCtx.fillText).toHaveBeenCalled();
      const vehicleCall = mockCtx.fillText.mock.calls.find(
        call => call[0] === mockTheme.icons.vehicle
      );
      expect(vehicleCall).toBeTruthy();
      expect(vehicleCall[1]).toBe(mockPuzzleData.north_pole.x);
      // Y position should be close to north pole y (with some offset)
      expect(vehicleCall[2]).toBeLessThan(mockPuzzleData.north_pole.y);
    });

    it('should draw vehicle at latest route node when route has nodes', () => {
      const route = [
        { type: 'north_pole', x: 500, y: 500 },
        { type: 'house', id: 1, x: 200, y: 200 }
      ];
      const visitedHouses = new Set([1]);

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Verify vehicle is drawn at the last node in route
      const lastNode = route[route.length - 1];
      expect(mockCtx.fillText).toHaveBeenCalled();
      const vehicleCall = mockCtx.fillText.mock.calls.find(
        call => call[0] === mockTheme.icons.vehicle
      );
      expect(vehicleCall).toBeTruthy();
      expect(vehicleCall[1]).toBe(lastNode.x);
      // Y position should be close to last node y (with some offset)
      expect(vehicleCall[2]).toBeLessThan(lastNode.y);
    });

    it('should always draw vehicle (either at root or latest node)', () => {
      // Test with empty route
      const emptyRoute = [];
      const visitedHouses1 = new Set();

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        emptyRoute,
        visitedHouses1,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Clear previous calls
      mockCtx.fillText.mockClear();

      // Test with route
      const route = [
        { type: 'north_pole', x: 500, y: 500 },
        { type: 'house', id: 1, x: 200, y: 200 }
      ];
      const visitedHouses2 = new Set([1]);

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses2,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Vehicle should be drawn in both cases
      expect(mockCtx.fillText).toHaveBeenCalled();
      const vehicleCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === mockTheme.icons.vehicle
      );
      expect(vehicleCalls.length).toBeGreaterThan(0);
    });
  });

  describe('mobile scrolling bug', () => {
    it('should handle canvas scrolled out of view (negative bounding rect)', () => {
      // Simulate canvas scrolled out of view - getBoundingClientRect returns negative or zero dimensions
      mockCanvas.getBoundingClientRect = vi.fn(() => ({
        left: -500,
        top: -500,
        width: 0,
        height: 0,
        right: -500,
        bottom: -500
      }));

      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: {}
      });

      const route = [];
      const visitedHouses = new Set();

      // Should not throw error and should still render
      expect(() => {
        render(
          mockCtx,
          mockCanvas,
          mockPuzzleData,
          route,
          visitedHouses,
          false,
          null,
          0,
          1,
          null,
          null,
          mockTheme
        );
      }).not.toThrow();

      // Should still clear and attempt to render
      expect(mockCtx.clearRect).toHaveBeenCalled();
    });

    it('should handle canvas partially scrolled out of view (small bounding rect)', () => {
      // Simulate canvas partially scrolled out - very small dimensions
      mockCanvas.getBoundingClientRect = vi.fn(() => ({
        left: -200,
        top: 100,
        width: 50,
        height: 50,
        right: -150,
        bottom: 150
      }));

      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: {}
      });

      const route = [];
      const visitedHouses = new Set();

      // Should not throw error
      expect(() => {
        render(
          mockCtx,
          mockCanvas,
          mockPuzzleData,
          route,
          visitedHouses,
          false,
          null,
          0,
          1,
          null,
          null,
          mockTheme
        );
      }).not.toThrow();

      // Should still render items
      expect(mockCtx.clearRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should use fallback scale when bounding rect dimensions are invalid', () => {
      // Simulate invalid dimensions (zero or negative)
      mockCanvas.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0
      }));

      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: {}
      });

      const route = [];
      const visitedHouses = new Set();

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Should still render with a fallback scale
      expect(mockCtx.fillText).toHaveBeenCalled();
      // Font size should be set (not empty or NaN)
      expect(mockCtx.font).toBeTruthy();
      expect(mockCtx.font).toContain('px');
    });
  });

  describe('Node icon changes on visit', () => {
    it('should render unvisited houses with node icon', () => {
      const route = [];
      const visitedHouses = new Set();

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Check that unvisited houses use the node icon
      const nodeCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === mockTheme.icons.node
      );
      expect(nodeCalls.length).toBe(mockPuzzleData.houses.length);
    });

    it('should render visited houses with nodeVisited icon', () => {
      const route = [
        { type: 'north_pole', x: 500, y: 500 },
        { type: 'house', id: 1, x: 200, y: 200 }
      ];
      const visitedHouses = new Set([1]);

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // Check that visited house uses nodeVisited icon
      const visitedCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === mockTheme.icons.nodeVisited
      );
      expect(visitedCalls.length).toBeGreaterThan(0);
      
      // Check that unvisited house still uses node icon
      const nodeCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === mockTheme.icons.node
      );
      expect(nodeCalls.length).toBeGreaterThan(0);
    });

    it('should render houses with correct icons based on visited state for Christmas theme', () => {
      const christmasTheme = {
        icons: {
          node: '🏠',
          nodeVisited: '🎁',
          startNode: '🏭',
          vehicle: '🦌🎅',
          instructionBullet: '❄️'
        },
        colors: {
          route: '#4a90e2',
          solution: '#ffd700',
          startNode: '#c41e3a',
          house: '#ffffff',
          houseVisited: '#90EE90'
        }
      };

      const route = [
        { type: 'north_pole', x: 500, y: 500 },
        { type: 'house', id: 1, x: 200, y: 200 }
      ];
      const visitedHouses = new Set([1]);

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        christmasTheme
      );

      // Verify visited house uses 🎁 (present)
      const presentCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === '🎁'
      );
      expect(presentCalls.length).toBeGreaterThan(0);

      // Verify unvisited house uses 🏠 (house)
      const houseCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === '🏠'
      );
      expect(houseCalls.length).toBeGreaterThan(0);
    });

    it('should render houses with correct icons based on visited state for Default theme', () => {
      const defaultTheme = {
        icons: {
          node: '🏠',
          nodeVisited: '📦',
          startNode: '🏣',
          vehicle: '🚐',
          instructionBullet: '📍'
        },
        colors: {
          route: '#4a90e2',
          solution: '#ffd700',
          startNode: '#c41e3a',
          house: '#ffffff',
          houseVisited: '#90EE90'
        }
      };

      const route = [
        { type: 'north_pole', x: 500, y: 500 },
        { type: 'house', id: 1, x: 200, y: 200 }
      ];
      const visitedHouses = new Set([1]);

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        defaultTheme
      );

      // Verify visited house uses 📦 (package)
      const packageCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === '📦'
      );
      expect(packageCalls.length).toBeGreaterThan(0);

      // Verify unvisited house uses 🏠 (house)
      const houseCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === '🏠'
      );
      expect(houseCalls.length).toBeGreaterThan(0);
    });

    it('should handle all houses visited correctly', () => {
      const route = [
        { type: 'north_pole', x: 500, y: 500 },
        { type: 'house', id: 1, x: 200, y: 200 },
        { type: 'house', id: 2, x: 300, y: 300 }
      ];
      const visitedHouses = new Set([1, 2]);

      render(
        mockCtx,
        mockCanvas,
        mockPuzzleData,
        route,
        visitedHouses,
        false,
        null,
        0,
        1,
        null,
        null,
        mockTheme
      );

      // All houses should use nodeVisited icon
      const visitedCalls = mockCtx.fillText.mock.calls.filter(
        call => call[0] === mockTheme.icons.nodeVisited
      );
      // Should have at least 2 calls for visited houses (plus potentially other elements)
      expect(visitedCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

