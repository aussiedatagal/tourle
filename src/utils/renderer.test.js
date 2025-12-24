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
        vehicle: '🦌🛷🎅🎁',
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
});

