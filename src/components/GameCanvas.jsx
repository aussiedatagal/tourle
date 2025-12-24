import { useEffect, useRef, useState, useCallback } from 'react';
import { setupCanvas, getCanvasCoords, findNodeAt } from '../utils/canvasUtils';
import { render } from '../utils/renderer';

export function GameCanvas({ puzzleData, route, visitedHouses, gameComplete, showingSolution, solutionRoute, solutionAnimationIndex, routeAnimationProgress, onNodeClick, theme }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartNode, setDragStartNode] = useState(null);
  const [dragTargetNode, setDragTargetNode] = useState(null);
  const touchHandledRef = useRef(false);
  
  // Use refs to store latest values for event listeners
  const stateRef = useRef({ isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route });
  
  // Track touch drag state locally (synchronously) to avoid async state issues
  const touchDragStateRef = useRef({ isDragging: false, dragStartNode: null, hasMoved: false });
  
  useEffect(() => {
    stateRef.current = { isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route };
  }, [isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas(canvas);
    const handleResize = () => setupCanvas(canvas);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add native touch event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create wrapper functions that will always have access to latest refs
    const touchStartHandler = (e) => {
      const state = stateRef.current;
      
      if (!state.puzzleData || state.gameComplete) {
        return;
      }
      
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      
      // Always prevent default to stop scrolling/zooming
      e.preventDefault();
      e.stopPropagation();
      touchHandledRef.current = true;

      const coords = getCanvasCoords(canvas, e, true);
      const node = findNodeAt(state.puzzleData, coords.x, coords.y);

      if (node) {
        // Found a node - start potential drag (but mark that we haven't moved yet)
        setIsDragging(true);
        setDragStartNode(node);
        touchDragStateRef.current = { isDragging: true, dragStartNode: node, hasMoved: false };
      } else {
        // No node found - clear any previous state
        setIsDragging(false);
        setDragStartNode(null);
        touchDragStateRef.current = { isDragging: false, dragStartNode: null, hasMoved: false };
      }
    };

    const touchMoveHandler = (e) => {
      const touchState = touchDragStateRef.current;
      const state = stateRef.current;
      
      if (!touchState.isDragging || !touchState.dragStartNode) {
        return;
      }
      
      // Mark that we've moved - this distinguishes a drag from a tap
      touchDragStateRef.current.hasMoved = true;
      
      e.preventDefault();
      e.stopPropagation();
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        const node = findNodeAt(state.puzzleData, x, y);
        
        if (node && node !== touchState.dragStartNode) {
          setDragTargetNode(node);
        } else {
          setDragTargetNode(null);
        }
      }
    };

    const touchEndHandler = (e) => {
      const touchState = touchDragStateRef.current;
      const state = stateRef.current;
      
      const canvas = canvasRef.current;
      if (!canvas || !state.puzzleData || state.gameComplete) {
        touchHandledRef.current = false;
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();

      if (!e.changedTouches || e.changedTouches.length === 0) {
        // No touch data - just reset
        setIsDragging(false);
        setDragStartNode(null);
        setDragTargetNode(null);
        touchDragStateRef.current = { isDragging: false, dragStartNode: null, hasMoved: false };
        touchHandledRef.current = false;
        return;
      }

      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      const endNode = findNodeAt(state.puzzleData, x, y);
      
      // Save the drag start node before resetting state
      const startNode = touchState.dragStartNode;
      const hasMoved = touchState.hasMoved;
      // Only treat as drag if we actually moved (touchMove was called)
      const wasDragging = touchState.isDragging && startNode && hasMoved;

      // Check if nodes match (same node)
      const nodesMatch = startNode && endNode && (
        (startNode.type === endNode.type && 
         ((startNode.type === 'house' && startNode.id === endNode.id) ||
          (startNode.type === 'north_pole' && startNode.x === endNode.x && startNode.y === endNode.y)))
      );

      // Always reset state first
      setIsDragging(false);
      setDragStartNode(null);
      setDragTargetNode(null);
      touchDragStateRef.current = { isDragging: false, dragStartNode: null, hasMoved: false };
      touchHandledRef.current = false;

      // Now handle the click based on what happened
      if (!wasDragging || nodesMatch) {
        // No drag was started, or dragged but ended on same node - treat as simple tap/click
        if (endNode) {
          state.onNodeClick(endNode.x, endNode.y);
        } else {
          state.onNodeClick(x, y);
        }
      } else {
        // We had a drag (with movement) to a different node - handle drag end
        if (endNode) {
          // Dragged from one node to a different node
          state.onNodeClick(endNode.x, endNode.y, startNode);
        }
        // If no endNode, user dragged off canvas - don't do anything
      }
    };

    // Use native event listeners with { passive: false } to allow preventDefault
    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    canvas.addEventListener('touchend', touchEndHandler, { passive: false });
    canvas.addEventListener('touchcancel', touchEndHandler, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', touchStartHandler);
      canvas.removeEventListener('touchmove', touchMoveHandler);
      canvas.removeEventListener('touchend', touchEndHandler);
      canvas.removeEventListener('touchcancel', touchEndHandler);
    };
  }, []); // Only attach once - handlers use refs for latest values

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !puzzleData) return;

    const ctx = canvas.getContext('2d');
    render(
      ctx,
      canvas,
      puzzleData,
      route,
      visitedHouses,
      showingSolution,
      solutionRoute,
      solutionAnimationIndex,
      routeAnimationProgress,
      dragStartNode,
      dragTargetNode,
      theme
    );
  }, [puzzleData, route, visitedHouses, showingSolution, solutionRoute, solutionAnimationIndex, routeAnimationProgress, dragStartNode, dragTargetNode, theme]);

  const handleMouseDown = (event) => {
    if (gameComplete) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(canvas, event);
    const node = findNodeAt(puzzleData, coords.x, coords.y);

    if (node) {
      setIsDragging(true);
      setDragStartNode(node);
      canvas.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (event) => {
    if (!isDragging || !dragStartNode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(canvas, event);
    const node = findNodeAt(puzzleData, coords.x, coords.y);

    if (node && node !== dragStartNode) {
      setDragTargetNode(node);
    } else {
      setDragTargetNode(null);
    }
  };

  const handleMouseUp = (event) => {
    if (!isDragging || !dragStartNode) {
      setIsDragging(false);
      setDragStartNode(null);
      setDragTargetNode(null);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'crosshair';
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(canvas, event);
    const node = findNodeAt(puzzleData, coords.x, coords.y);

    if (node && node !== dragStartNode) {
      onNodeClick(node.x, node.y, dragStartNode);
    }

    setIsDragging(false);
    setDragStartNode(null);
    setDragTargetNode(null);
    if (canvas) canvas.style.cursor = 'crosshair';
  };


  const handleClick = (event) => {
    // Prevent click handler from firing after touch events on mobile
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    
    if (isDragging || gameComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(canvas, event);
    onNodeClick(coords.x, coords.y);
  };

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    />
  );
}

