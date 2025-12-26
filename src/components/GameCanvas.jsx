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
  const stateRef = useRef({ isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route, visitedHouses });
  
  // Track touch drag state locally (synchronously) to avoid async state issues
  const touchDragStateRef = useRef({ isDragging: false, dragStartNode: null, hasMoved: false, lastVisitedNode: null });
  
  // Track last visited node during drag to avoid adding same node multiple times
  const lastVisitedNodeRef = useRef(null);
  
  useEffect(() => {
    stateRef.current = { isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route, visitedHouses };
  }, [isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route, visitedHouses]);

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

    // Helper function to check if a node is the same as another
    const isSameNode = (node1, node2) => {
      if (!node1 || !node2) return false;
      if (node1.type !== node2.type) return false;
      if (node1.type === 'house') return node1.id === node2.id;
      if (node1.type === 'north_pole') return node1.x === node2.x && node1.y === node2.y;
      return false;
    };

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

      const coords = getCanvasCoords(canvas, e, true);
      const node = findNodeAt(state.puzzleData, coords.x, coords.y);

      // Always prevent default to allow continuous dragging
      e.preventDefault();
      e.stopPropagation();
      touchHandledRef.current = true;
      
      // Start dragging - can start from a node or empty space
      setIsDragging(true);
      setDragStartNode(node);
      lastVisitedNodeRef.current = node; // Track the starting node if we started on one
      touchDragStateRef.current = { 
        isDragging: true, 
        dragStartNode: node, 
        hasMoved: false,
        lastVisitedNode: node
      };
      
      // If we started on a node, visit it immediately (if valid)
      // Only visit if it's not already visited (for houses) or if route is not empty (for north_pole)
      if (node) {
        if (node.type === 'house' && state.visitedHouses && state.visitedHouses.has(node.id)) {
          // Already visited, don't add
        } else if (node.type === 'north_pole' && state.route && state.route.length === 0) {
          // Can't start from north_pole with empty route
        } else {
          state.onNodeClick(node.x, node.y);
        }
      }
    };

    const touchMoveHandler = (e) => {
      const touchState = touchDragStateRef.current;
      const state = stateRef.current;
      
      if (!touchState.isDragging) {
        return;
      }
      
      // Mark that we've moved - this distinguishes a drag from a tap
      touchDragStateRef.current.hasMoved = true;
      
      e.preventDefault();
      e.stopPropagation();
      
      const canvas = canvasRef.current;
      if (!canvas || !state.puzzleData) return;

      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        const node = findNodeAt(state.puzzleData, x, y);
        
        // Update drag target for visual feedback
        if (node) {
          setDragTargetNode(node);
        } else {
          setDragTargetNode(null);
        }
        
        // If we're near a node and it's different from the last one we visited, add it
        if (node && !isSameNode(node, lastVisitedNodeRef.current)) {
          // Check if this is a house that's already been visited - skip it
          if (node.type === 'house' && state.visitedHouses && state.visitedHouses.has(node.id)) {
            // Already visited, don't add again
            return;
          }
          
          // Check if this is the same as the last node in the route - skip it
          if (state.route && state.route.length > 0) {
            const lastRouteNode = state.route[state.route.length - 1];
            if (isSameNode(node, lastRouteNode)) {
              return;
            }
          }
          
          // Add this node to the route
          lastVisitedNodeRef.current = node;
          touchDragStateRef.current.lastVisitedNode = node;
          
          // Call onNodeClick to add the node
          // Pass the last node in the route as fromNode if route exists, otherwise just click normally
          if (state.route && state.route.length > 0) {
            const lastRouteNode = state.route[state.route.length - 1];
            state.onNodeClick(node.x, node.y, lastRouteNode);
          } else {
            // No route yet, just click normally (will handle starting from north_pole if needed)
            state.onNodeClick(node.x, node.y);
          }
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
        lastVisitedNodeRef.current = null;
        touchDragStateRef.current = { isDragging: false, dragStartNode: null, hasMoved: false, lastVisitedNode: null };
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
      const hasMoved = touchState.hasMoved;

      // Always reset state first
      setIsDragging(false);
      setDragStartNode(null);
      setDragTargetNode(null);
      lastVisitedNodeRef.current = null;
      touchDragStateRef.current = { isDragging: false, dragStartNode: null, hasMoved: false, lastVisitedNode: null };
      touchHandledRef.current = false;

      // If no movement occurred, treat as a simple tap/click
      // (Nodes were already handled during drag in touchMoveHandler)
      if (!hasMoved && endNode) {
        state.onNodeClick(endNode.x, endNode.y);
      }
      // If movement occurred, nodes were already handled during the drag, so nothing to do here
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

  // Track scroll position to force re-render on scroll
  const [scrollKey, setScrollKey] = useState(0);
  
  useEffect(() => {
    // Listen for scroll events to trigger re-render
    // Use requestAnimationFrame to batch updates and avoid excessive re-renders
    let rafId = null;
    const handleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setScrollKey(prev => prev + 1);
          rafId = null;
        });
      }
    };
    
    // Listen to scroll on window, document, and document.documentElement
    // This ensures we catch scroll events on mobile devices
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.documentElement.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen to visibility change to re-render when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setScrollKey(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      document.documentElement.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Use IntersectionObserver to re-render when canvas becomes visible
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && puzzleData) {
            // Force re-render when canvas becomes visible
            setScrollKey(prev => prev + 1);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [puzzleData]);

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
  }, [puzzleData, route, visitedHouses, showingSolution, solutionRoute, solutionAnimationIndex, routeAnimationProgress, dragStartNode, dragTargetNode, theme, scrollKey]);

  // Helper function to check if a node is the same as another
  const isSameNode = useCallback((node1, node2) => {
    if (!node1 || !node2) return false;
    if (node1.type !== node2.type) return false;
    if (node1.type === 'house') return node1.id === node2.id;
    if (node1.type === 'north_pole') return node1.x === node2.x && node1.y === node2.y;
    return false;
  }, []);

  const handleMouseDown = (event) => {
    if (gameComplete) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(canvas, event);
    const node = findNodeAt(puzzleData, coords.x, coords.y);

    // Start dragging - can start from a node or empty space
    setIsDragging(true);
    setDragStartNode(node);
    lastVisitedNodeRef.current = node; // Track the starting node if we started on one
    canvas.style.cursor = 'grabbing';
    
    // If we started on a node, visit it immediately (if valid)
    // Only visit if it's not already visited (for houses) or if route is not empty (for north_pole)
    if (node) {
      if (node.type === 'house' && visitedHouses && visitedHouses.has(node.id)) {
        // Already visited, don't add
      } else if (node.type === 'north_pole' && route && route.length === 0) {
        // Can't start from north_pole with empty route
      } else {
        onNodeClick(node.x, node.y);
      }
    }
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas || !puzzleData) return;

    const coords = getCanvasCoords(canvas, event);
    const node = findNodeAt(puzzleData, coords.x, coords.y);

    // Update drag target for visual feedback
    if (node) {
      setDragTargetNode(node);
    } else {
      setDragTargetNode(null);
    }
    
    // If we're near a node and it's different from the last one we visited, add it
    if (node && !isSameNode(node, lastVisitedNodeRef.current)) {
      // Check if this is a house that's already been visited - skip it
      if (node.type === 'house' && visitedHouses && visitedHouses.has(node.id)) {
        // Already visited, don't add again
        return;
      }
      
      // Check if this is the same as the last node in the route - skip it
      if (route && route.length > 0) {
        const lastRouteNode = route[route.length - 1];
        if (isSameNode(node, lastRouteNode)) {
          return;
        }
      }
      
      // Add this node to the route
      lastVisitedNodeRef.current = node;
      
      // Call onNodeClick to add the node
      // Pass the last node in the route as fromNode if route exists, otherwise just click normally
      if (route && route.length > 0) {
        const lastRouteNode = route[route.length - 1];
        onNodeClick(node.x, node.y, lastRouteNode);
      } else {
        // No route yet, just click normally (will handle starting from north_pole if needed)
        onNodeClick(node.x, node.y);
      }
    }
  };

  const handleMouseUp = (event) => {
    setIsDragging(false);
    setDragStartNode(null);
    setDragTargetNode(null);
    lastVisitedNodeRef.current = null;
    const canvas = canvasRef.current;
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

