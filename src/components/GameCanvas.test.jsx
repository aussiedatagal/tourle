import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GameCanvas } from './GameCanvas';
import * as canvasUtils from '../utils/canvasUtils';
import * as renderer from '../utils/renderer';

// Mock the canvas utilities
vi.mock('../utils/canvasUtils', () => ({
  setupCanvas: vi.fn(),
  getCanvasCoords: vi.fn(),
  findNodeAt: vi.fn()
}));

vi.mock('../utils/renderer', () => ({
  render: vi.fn()
}));

describe('GameCanvas', () => {
  let mockPuzzleData;
  let mockTheme;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPuzzleData = {
      north_pole: { x: 500, y: 500 },
      houses: [
        { id: 1, x: 200, y: 200 },
        { id: 2, x: 300, y: 300 }
      ]
    };

    mockTheme = {
      icons: {
        node: '🏠',
        nodeVisited: '🎁',
        startNode: '🏭',
        vehicle: '🦌'
      },
      colors: {
        route: '#4a90e2'
      }
    };

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillText: vi.fn(),
      stroke: vi.fn()
    }));

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 500,
      height: 500
    }));
  });

  it('should render canvas element', () => {
    const { container } = render(
      <GameCanvas
        puzzleData={mockPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={false}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={vi.fn()}
        theme={mockTheme}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas).toHaveClass('game-canvas');
  });

  it('should call setupCanvas on mount', () => {
    const { container } = render(
      <GameCanvas
        puzzleData={mockPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={false}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={vi.fn()}
        theme={mockTheme}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvasUtils.setupCanvas).toHaveBeenCalledWith(canvas);
  });

  it('should call render when puzzleData changes', () => {
    const { rerender } = render(
      <GameCanvas
        puzzleData={mockPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={false}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={vi.fn()}
        theme={mockTheme}
      />
    );

    expect(renderer.render).toHaveBeenCalled();

    const newPuzzleData = { ...mockPuzzleData, houses: [] };
    rerender(
      <GameCanvas
        puzzleData={newPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={false}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={vi.fn()}
        theme={mockTheme}
      />
    );

    expect(renderer.render).toHaveBeenCalledTimes(2);
  });

  it('should handle touch start events', () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <GameCanvas
        puzzleData={mockPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={false}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={onNodeClick}
        theme={mockTheme}
      />
    );

    const canvas = container.querySelector('canvas');
    canvasUtils.getCanvasCoords.mockReturnValue({ x: 500, y: 500 });
    canvasUtils.findNodeAt.mockReturnValue({ type: 'north_pole', x: 500, y: 500 });

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 250, clientY: 250 }]
    });

    expect(canvasUtils.getCanvasCoords).toHaveBeenCalled();
    expect(canvasUtils.findNodeAt).toHaveBeenCalled();
  });

  it('should handle touch end events', () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <GameCanvas
        puzzleData={mockPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={false}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={onNodeClick}
        theme={mockTheme}
      />
    );

    const canvas = container.querySelector('canvas');
    
    // First touch start to set drag state
    canvasUtils.getCanvasCoords.mockReturnValue({ x: 500, y: 500 });
    canvasUtils.findNodeAt.mockReturnValue({ type: 'north_pole', x: 500, y: 500 });
    
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 250, clientY: 250 }]
    });

    // Then touch end with a different node
    canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
    canvasUtils.findNodeAt.mockReturnValue({ type: 'house', id: 1, x: 200, y: 200 });
    
    // Mock getBoundingClientRect for touch end handler
    canvas.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 500,
      height: 500
    }));
    
    fireEvent.touchEnd(canvas, {
      changedTouches: [{ clientX: 100, clientY: 100 }]
    });

    // Verify that onNodeClick was called when dragging to a different node
    expect(onNodeClick).toHaveBeenCalled();
  });

  it('should not handle interactions when game is complete', () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <GameCanvas
        puzzleData={mockPuzzleData}
        route={[]}
        visitedHouses={new Set()}
        gameComplete={true}
        showingSolution={false}
        solutionRoute={null}
        solutionAnimationIndex={0}
        routeAnimationProgress={1}
        onNodeClick={onNodeClick}
        theme={mockTheme}
      />
    );

    const canvas = container.querySelector('canvas');
    canvasUtils.getCanvasCoords.mockReturnValue({ x: 500, y: 500 });
    canvasUtils.findNodeAt.mockReturnValue({ type: 'north_pole', x: 500, y: 500 });

    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 250, clientY: 250 }]
    });
    canvas.dispatchEvent(touchEvent);

    // Should not call findNodeAt when game is complete
    expect(canvasUtils.findNodeAt).not.toHaveBeenCalled();
  });

  describe('Mobile touch event fixes', () => {
    it('should treat simple tap (no movement) as click, not drag', async () => {
      const onNodeClick = vi.fn();
      const { container } = render(
        <GameCanvas
          puzzleData={mockPuzzleData}
          route={[]}
          visitedHouses={new Set()}
          gameComplete={false}
          showingSolution={false}
          solutionRoute={null}
          solutionAnimationIndex={0}
          routeAnimationProgress={1}
          onNodeClick={onNodeClick}
          theme={mockTheme}
        />
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for useEffect to attach listeners
      });

      const canvas = container.querySelector('canvas');
      const node = { type: 'house', id: 1, x: 200, y: 200 };
      
      // Mock canvas properties
      canvas.width = 1000;
      canvas.height = 1000;
      canvas.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 500,
        height: 500
      }));

      // Touch start on a node
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
      canvasUtils.findNodeAt.mockReturnValue(node);
      
      await act(async () => {
        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchStartEvent, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchStartEvent, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchStartEvent);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Touch end on the same node (no movement = simple tap)
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
      canvasUtils.findNodeAt.mockReturnValue(node);
      
      await act(async () => {
        const touchEndEvent = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchEndEvent, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchEndEvent, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchEndEvent);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should call onNodeClick without fromNode (simple tap, not drag)
      await waitFor(() => {
        expect(onNodeClick).toHaveBeenCalledWith(200, 200);
        expect(onNodeClick).not.toHaveBeenCalledWith(200, 200, expect.anything());
      });
    });

    it('should handle multiple sequential taps correctly', async () => {
      const onNodeClick = vi.fn();
      const { container } = render(
        <GameCanvas
          puzzleData={mockPuzzleData}
          route={[]}
          visitedHouses={new Set()}
          gameComplete={false}
          showingSolution={false}
          solutionRoute={null}
          solutionAnimationIndex={0}
          routeAnimationProgress={1}
          onNodeClick={onNodeClick}
          theme={mockTheme}
        />
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for useEffect to attach listeners
      });

      const canvas = container.querySelector('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      canvas.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 500,
        height: 500
      }));

      const node1 = { type: 'house', id: 1, x: 200, y: 200 };
      const node2 = { type: 'house', id: 2, x: 300, y: 300 };

      // First tap
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
      canvasUtils.findNodeAt.mockReturnValue(node1);
      
      await act(async () => {
        const touchStart1 = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchStart1, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchStart1, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchStart1);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        const touchEnd1 = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchEnd1, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchEnd1, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchEnd1);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(onNodeClick).toHaveBeenCalledWith(200, 200);
      });
      onNodeClick.mockClear();

      // Second tap (should work after first tap)
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 300, y: 300 });
      canvasUtils.findNodeAt.mockReturnValue(node2);
      
      await act(async () => {
        const touchStart2 = new TouchEvent('touchstart', {
          touches: [{ clientX: 150, clientY: 150 }],
          cancelable: true
        });
        Object.defineProperty(touchStart2, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchStart2, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchStart2);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        const touchEnd2 = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 150, clientY: 150 }],
          cancelable: true
        });
        Object.defineProperty(touchEnd2, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchEnd2, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchEnd2);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Second tap should also work
      await waitFor(() => {
        expect(onNodeClick).toHaveBeenCalledWith(300, 300);
      });
    });

    it('should distinguish between tap and drag based on movement', async () => {
      const onNodeClick = vi.fn();
      const { container } = render(
        <GameCanvas
          puzzleData={mockPuzzleData}
          route={[]}
          visitedHouses={new Set()}
          gameComplete={false}
          showingSolution={false}
          solutionRoute={null}
          solutionAnimationIndex={0}
          routeAnimationProgress={1}
          onNodeClick={onNodeClick}
          theme={mockTheme}
        />
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for useEffect to attach listeners
      });

      const canvas = container.querySelector('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      canvas.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 500,
        height: 500
      }));

      const startNode = { type: 'house', id: 1, x: 200, y: 200 };
      const endNode = { type: 'house', id: 2, x: 300, y: 300 };

      // Touch start
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
      canvasUtils.findNodeAt.mockReturnValue(startNode);
      
      await act(async () => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchStart, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchStart, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchStart);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Touch move (this marks it as a drag)
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 250, y: 250 });
      canvasUtils.findNodeAt.mockReturnValue(null);
      
      await act(async () => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 125, clientY: 125 }],
          cancelable: true
        });
        Object.defineProperty(touchMove, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchMove, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchMove);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Touch end on different node
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 300, y: 300 });
      canvasUtils.findNodeAt.mockReturnValue(endNode);
      
      await act(async () => {
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 150, clientY: 150 }],
          cancelable: true
        });
        Object.defineProperty(touchEnd, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchEnd, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchEnd);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should call onNodeClick with fromNode (drag, not tap)
      await waitFor(() => {
        expect(onNodeClick).toHaveBeenCalledWith(300, 300, startNode);
      });
    });

    it('should handle tap on same node after movement as simple click', async () => {
      const onNodeClick = vi.fn();
      const { container } = render(
        <GameCanvas
          puzzleData={mockPuzzleData}
          route={[]}
          visitedHouses={new Set()}
          gameComplete={false}
          showingSolution={false}
          solutionRoute={null}
          solutionAnimationIndex={0}
          routeAnimationProgress={1}
          onNodeClick={onNodeClick}
          theme={mockTheme}
        />
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for useEffect to attach listeners
      });

      const canvas = container.querySelector('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      canvas.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 500,
        height: 500
      }));

      const node = { type: 'house', id: 1, x: 200, y: 200 };

      // Touch start
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
      canvasUtils.findNodeAt.mockReturnValue(node);
      
      await act(async () => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchStart, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchStart, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchStart);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Touch move (marks as drag)
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 210, y: 210 });
      canvasUtils.findNodeAt.mockReturnValue(null);
      
      await act(async () => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 105, clientY: 105 }],
          cancelable: true
        });
        Object.defineProperty(touchMove, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchMove, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchMove);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Touch end on same node (should treat as simple tap, not drag)
      canvasUtils.getCanvasCoords.mockReturnValue({ x: 200, y: 200 });
      canvasUtils.findNodeAt.mockReturnValue(node);
      
      await act(async () => {
        const touchEnd = new TouchEvent('touchend', {
          changedTouches: [{ clientX: 100, clientY: 100 }],
          cancelable: true
        });
        Object.defineProperty(touchEnd, 'preventDefault', { value: vi.fn(), writable: true });
        Object.defineProperty(touchEnd, 'stopPropagation', { value: vi.fn(), writable: true });
        canvas.dispatchEvent(touchEnd);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should call onNodeClick without fromNode (simple tap, even though there was movement)
      await waitFor(() => {
        expect(onNodeClick).toHaveBeenCalledWith(200, 200);
        expect(onNodeClick).not.toHaveBeenCalledWith(200, 200, expect.anything());
      });
    });
  });
});

