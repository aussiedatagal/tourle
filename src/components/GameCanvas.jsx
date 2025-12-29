import { useEffect, useRef, useState, useCallback } from 'react';
import { setupCanvas, getCanvasCoords, findNodeAt } from '../utils/canvasUtils';
import { render } from '../utils/renderer';

export function GameCanvas({ puzzleData, route, visitedHouses, gameComplete, showingSolution, solutionRoute, solutionAnimationIndex, routeAnimationProgress, onNodeClick, theme, revealHardSolution, difficulty }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartNode, setDragStartNode] = useState(null);
  const [dragTargetNode, setDragTargetNode] = useState(null);
  const touchHandledRef = useRef(false);
  const stateRef = useRef({ isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route, visitedHouses, difficulty, revealHardSolution });
  const touchDragStateRef = useRef({ isDragging: false, dragStartNode: null, hasMoved: false, lastVisitedNode: null });
  const lastVisitedNodeRef = useRef(null);
  
  // Hidden backdoor: track north pole clicks for reveal
  const northPoleClickCountRef = useRef(0);
  const northPoleClickTimeoutRef = useRef(null);
  
  useEffect(() => {
    stateRef.current = { isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route, visitedHouses, difficulty, revealHardSolution };
  }, [isDragging, dragStartNode, gameComplete, puzzleData, onNodeClick, route, visitedHouses, difficulty, revealHardSolution]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas(canvas);
    const handleResize = () => setupCanvas(canvas);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isSameNode = (node1, node2) => {
      if (!node1 || !node2) return false;
      if (node1.type !== node2.type) return false;
      if (node1.type === 'house') return node1.id === node2.id;
      if (node1.type === 'north_pole') return node1.x === node2.x && node1.y === node2.y;
      return false;
    };

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

      e.preventDefault();
      e.stopPropagation();
      touchHandledRef.current = true;
      
      setIsDragging(true);
      setDragStartNode(node);
      lastVisitedNodeRef.current = node;
      touchDragStateRef.current = { 
        isDragging: true, 
        dragStartNode: node, 
        hasMoved: false,
        lastVisitedNode: node
      };
      
      // Hidden backdoor: 5 taps on north pole within 2 seconds reveals hard solution
      if (state.difficulty === 'hard' && state.revealHardSolution && node && node.type === 'north_pole') {
        northPoleClickCountRef.current += 1;
        
        // Clear existing timeout
        if (northPoleClickTimeoutRef.current) {
          clearTimeout(northPoleClickTimeoutRef.current);
        }
        
        // If 5 taps within 2 seconds, reveal solution
        if (northPoleClickCountRef.current >= 5) {
          northPoleClickCountRef.current = 0;
          state.revealHardSolution();
          return;
        }
        
        // Reset counter after 2 seconds
        northPoleClickTimeoutRef.current = setTimeout(() => {
          northPoleClickCountRef.current = 0;
        }, 2000);
      }
      
      if (node) {
        if (node.type === 'house' && state.visitedHouses && state.visitedHouses.has(node.id)) {
        } else if (node.type === 'north_pole' && state.route && state.route.length === 0) {
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
        
        if (node) {
          setDragTargetNode(node);
        } else {
          setDragTargetNode(null);
        }
        
        if (node && !isSameNode(node, lastVisitedNodeRef.current)) {
          if (node.type === 'house' && state.visitedHouses && state.visitedHouses.has(node.id)) {
            return;
          }
          
          if (state.route && state.route.length > 0) {
            const lastRouteNode = state.route[state.route.length - 1];
            if (isSameNode(node, lastRouteNode)) {
              return;
            }
          }
          
          lastVisitedNodeRef.current = node;
          touchDragStateRef.current.lastVisitedNode = node;
          
          if (state.route && state.route.length > 0) {
            const lastRouteNode = state.route[state.route.length - 1];
            state.onNodeClick(node.x, node.y, lastRouteNode);
          } else {
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

      setIsDragging(false);
      setDragStartNode(null);
      setDragTargetNode(null);
      lastVisitedNodeRef.current = null;
      touchDragStateRef.current = { isDragging: false, dragStartNode: null, hasMoved: false, lastVisitedNode: null };
      touchHandledRef.current = false;

      if (!hasMoved && endNode) {
        state.onNodeClick(endNode.x, endNode.y);
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
  }, []);

  const [scrollKey, setScrollKey] = useState(0);
  
  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setScrollKey(prev => prev + 1);
          rafId = null;
        });
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.documentElement.addEventListener('scroll', handleScroll, { passive: true });
    
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && puzzleData) {
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

  // Hidden backdoor: keyboard shortcut (Ctrl+Shift+H) to reveal hard solution
  useEffect(() => {
    if (difficulty !== 'hard' || !revealHardSolution) return;

    const handleKeyDown = (event) => {
      // Ctrl+Shift+H (or Cmd+Shift+H on Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        revealHardSolution();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [difficulty, revealHardSolution]);

  // Cleanup north pole click timeout
  useEffect(() => {
    return () => {
      if (northPoleClickTimeoutRef.current) {
        clearTimeout(northPoleClickTimeoutRef.current);
      }
    };
  }, []);

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

    setIsDragging(true);
    setDragStartNode(node);
    lastVisitedNodeRef.current = node;
    canvas.style.cursor = 'grabbing';
    
    if (node) {
      if (node.type === 'house' && visitedHouses && visitedHouses.has(node.id)) {
      } else if (node.type === 'north_pole' && route && route.length === 0) {
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

    if (node) {
      setDragTargetNode(node);
    } else {
      setDragTargetNode(null);
    }
    
    if (node && !isSameNode(node, lastVisitedNodeRef.current)) {
      if (node.type === 'house' && visitedHouses && visitedHouses.has(node.id)) {
        return;
      }
      
      if (route && route.length > 0) {
        const lastRouteNode = route[route.length - 1];
        if (isSameNode(node, lastRouteNode)) {
          return;
        }
      }
      
      lastVisitedNodeRef.current = node;
      
      if (route && route.length > 0) {
        const lastRouteNode = route[route.length - 1];
        onNodeClick(node.x, node.y, lastRouteNode);
      } else {
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
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    
    if (isDragging || gameComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(canvas, event);
    const node = findNodeAt(puzzleData, coords.x, coords.y);
    
    // Hidden backdoor: 5 clicks on north pole within 2 seconds reveals hard solution
    if (difficulty === 'hard' && revealHardSolution && node && node.type === 'north_pole') {
      northPoleClickCountRef.current += 1;
      
      // Clear existing timeout
      if (northPoleClickTimeoutRef.current) {
        clearTimeout(northPoleClickTimeoutRef.current);
      }
      
      // If 5 clicks within 2 seconds, reveal solution
      if (northPoleClickCountRef.current >= 5) {
        northPoleClickCountRef.current = 0;
        revealHardSolution();
        return;
      }
      
      // Reset counter after 2 seconds
      northPoleClickTimeoutRef.current = setTimeout(() => {
        northPoleClickCountRef.current = 0;
      }, 2000);
    }
    
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

