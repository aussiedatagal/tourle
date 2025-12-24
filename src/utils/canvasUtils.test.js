import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCanvasCoords, findNodeAt, calculateDistance, setupCanvas, isSameNode } from './canvasUtils';

describe('canvasUtils', () => {
  describe('getCanvasCoords', () => {
    it('should convert mouse coordinates to canvas coordinates', () => {
      const mockCanvas = {
        width: 1000,
        height: 1000,
        getBoundingClientRect: vi.fn(() => ({
          left: 100,
          top: 200,
          width: 500,
          height: 500
        }))
      };

      const mockEvent = {
        clientX: 200,
        clientY: 300
      };

      const coords = getCanvasCoords(mockCanvas, mockEvent);
      
      // Scale: 1000/500 = 2
      // X: (200 - 100) * 2 = 200
      // Y: (300 - 200) * 2 = 200
      expect(coords.x).toBe(200);
      expect(coords.y).toBe(200);
    });

    it('should convert touch coordinates to canvas coordinates', () => {
      const mockCanvas = {
        width: 1000,
        height: 1000,
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 500,
          height: 500
        }))
      };

      const mockEvent = {
        touches: [{
          clientX: 250,
          clientY: 250
        }]
      };

      const coords = getCanvasCoords(mockCanvas, mockEvent, true);
      
      // Scale: 1000/500 = 2
      // X: (250 - 0) * 2 = 500
      // Y: (250 - 0) * 2 = 500
      expect(coords.x).toBe(500);
      expect(coords.y).toBe(500);
    });
  });

  describe('findNodeAt', () => {
    let mockPuzzleData;

    beforeEach(() => {
      mockPuzzleData = {
        north_pole: { x: 500, y: 500 },
        houses: [
          { id: 1, x: 200, y: 200 },
          { id: 2, x: 300, y: 300 }
        ]
      };
    });

    it('should find north pole node within default radius', () => {
      const node = findNodeAt(mockPuzzleData, 510, 510);
      expect(node).not.toBeNull();
      expect(node.type).toBe('north_pole');
      expect(node.x).toBe(500);
      expect(node.y).toBe(500);
    });

    it('should find house node within default radius', () => {
      const node = findNodeAt(mockPuzzleData, 210, 210);
      expect(node).not.toBeNull();
      expect(node.type).toBe('house');
      expect(node.id).toBe(1);
    });

    it('should return null when no node is found', () => {
      const node = findNodeAt(mockPuzzleData, 100, 100);
      expect(node).toBeNull();
    });

    it('should use custom click radius when provided', () => {
      // Point at distance ~42.4 from north pole (500, 500), within 60px radius
      const node = findNodeAt(mockPuzzleData, 530, 530, 60);
      expect(node).not.toBeNull();
      expect(node.type).toBe('north_pole');
    });

    it('should use larger radius for mobile devices', () => {
      // Mock mobile environment
      const originalInnerWidth = window.innerWidth;
      const originalTouchStart = window.ontouchstart;
      
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

      // Test that mobile uses larger radius (50px instead of 30px)
      // A point at distance 40px should be found on mobile but not desktop
      const node = findNodeAt(mockPuzzleData, 540, 500);
      expect(node).not.toBeNull();
      expect(node.type).toBe('north_pole');

      // Restore
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      });
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: originalTouchStart
      });
    });
  });

  describe('isSameNode', () => {
    it('should return true for same north pole nodes', () => {
      const node1 = { type: 'north_pole', x: 500, y: 500 };
      const node2 = { type: 'north_pole', x: 500, y: 500 };
      expect(isSameNode(node1, node2)).toBe(true);
    });

    it('should return false for different north pole positions', () => {
      const node1 = { type: 'north_pole', x: 500, y: 500 };
      const node2 = { type: 'north_pole', x: 600, y: 600 };
      expect(isSameNode(node1, node2)).toBe(false);
    });

    it('should return true for same house nodes', () => {
      const node1 = { type: 'house', id: 1, x: 200, y: 200 };
      const node2 = { type: 'house', id: 1, x: 200, y: 200 };
      expect(isSameNode(node1, node2)).toBe(true);
    });

    it('should return false for different house nodes', () => {
      const node1 = { type: 'house', id: 1, x: 200, y: 200 };
      const node2 = { type: 'house', id: 2, x: 200, y: 200 };
      expect(isSameNode(node1, node2)).toBe(false);
    });

    it('should return false for different node types', () => {
      const node1 = { type: 'north_pole', x: 500, y: 500 };
      const node2 = { type: 'house', id: 1, x: 500, y: 500 };
      expect(isSameNode(node1, node2)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for empty or single-node route', () => {
      expect(calculateDistance([])).toBe(0);
      expect(calculateDistance([{ x: 100, y: 100 }])).toBe(0);
    });

    it('should calculate distance for two points', () => {
      const route = [
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      ];
      // Distance = sqrt(3^2 + 4^2) = 5
      expect(calculateDistance(route)).toBe(5);
    });

    it('should calculate total distance for multiple points', () => {
      const route = [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 6, y: 8 }
      ];
      // First segment: sqrt(3^2 + 4^2) = 5
      // Second segment: sqrt(3^2 + 4^2) = 5
      // Total: 10
      expect(calculateDistance(route)).toBe(10);
    });
  });

  describe('setupCanvas', () => {
    const originalInnerHeight = window.innerHeight;

    afterEach(() => {
      window.innerHeight = originalInnerHeight;
    });

    it('should set canvas dimensions and style', () => {
      window.innerHeight = 1400; // Large viewport
      const mockContainer = {
        clientWidth: 1200
      };
      
      const mockCanvas = {
        parentElement: mockContainer,
        width: 0,
        height: 0,
        style: {}
      };

      setupCanvas(mockCanvas);

      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(1000);
      // maxSize = Math.min(1200 - 40, 1400 - 300, 1000) = Math.min(1160, 1100, 1000) = 1000
      expect(mockCanvas.style.width).toBe('1000px');
      expect(mockCanvas.style.height).toBe('1000px');
    });

    it('should limit canvas width to 1000px maximum', () => {
      window.innerHeight = 1500; // Large viewport
      const mockContainer = {
        clientWidth: 2000
      };
      
      const mockCanvas = {
        parentElement: mockContainer,
        width: 0,
        height: 0,
        style: {}
      };

      setupCanvas(mockCanvas);

      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(1000);
      // maxSize = Math.min(2000 - 40, 1500 - 300, 1000) = Math.min(1960, 1200, 1000) = 1000
      expect(mockCanvas.style.width).toBe('1000px');
      expect(mockCanvas.style.height).toBe('1000px');
    });

    it('should handle small container widths', () => {
      window.innerHeight = 800; // Medium viewport
      const mockContainer = {
        clientWidth: 300
      };
      
      const mockCanvas = {
        parentElement: mockContainer,
        width: 0,
        height: 0,
        style: {}
      };

      setupCanvas(mockCanvas);

      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(1000);
      // maxSize = Math.min(300 - 40, 800 - 300, 1000) = Math.min(260, 500, 1000) = 260
      expect(mockCanvas.style.width).toBe('260px');
      expect(mockCanvas.style.height).toBe('260px');
    });

    it('should use viewport height when it limits size', () => {
      window.innerHeight = 600; // Small viewport
      const mockContainer = {
        clientWidth: 1200
      };
      
      const mockCanvas = {
        parentElement: mockContainer,
        width: 0,
        height: 0,
        style: {}
      };

      setupCanvas(mockCanvas);

      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(1000);
      // maxSize = Math.min(1200 - 40, 600 - 300, 1000) = Math.min(1160, 300, 1000) = 300
      expect(mockCanvas.style.width).toBe('300px');
      expect(mockCanvas.style.height).toBe('300px');
    });
  });
});

