import { useState, useEffect, useCallback, useRef } from 'react';
import { loadPuzzle, loadSolution } from '../utils/puzzleLoader';
import { calculateDistance, findNodeAt, isSameNode } from '../utils/canvasUtils';
import { saveScore, getBestScore } from '../utils/scoreStorage';

export function useGameState(selectedDate = null, difficulty = 'medium', onDateChange = null) {
  const [puzzleData, setPuzzleData] = useState(null);
  const [route, setRoute] = useState([]);
  const [visitedHouses, setVisitedHouses] = useState(new Set());
  const [gameComplete, setGameComplete] = useState(false);
  const [showingSolution, setShowingSolution] = useState(false);
  const [solutionRoute, setSolutionRoute] = useState(null);
  const [solutionAnimationIndex, setSolutionAnimationIndex] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [routeAnimationProgress, setRouteAnimationProgress] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [currentAttemptStarted, setCurrentAttemptStarted] = useState(false);
  const reminderTimeoutRef = useRef(null);
  const solutionAnimationFrameRef = useRef(null);
  const routeAnimationRef = useRef(null);

  useEffect(() => {
    const loadForDate = async () => {
      try {
        const dateObj = selectedDate
          ? {
              year: selectedDate.split('-')[0],
              month: selectedDate.split('-')[1],
              day: selectedDate.split('-')[2]
            }
          : null;

        const { puzzleData, actualDate } = await loadPuzzle(dateObj, difficulty);

        setPuzzleData(puzzleData);
        setRoute([]);
        setVisitedHouses(new Set());
        setGameComplete(false);
        setShowReminder(false);
        setShowingSolution(false);
        setSolutionRoute(null);
        setSolutionAnimationIndex(0);
        setRouteAnimationProgress(1);
        setAttempts(0);
        setCurrentAttemptStarted(false);

        if (actualDate && actualDate !== selectedDate && onDateChange) {
          onDateChange(actualDate);
        }
      } catch (err) {
        console.error(err);
        setPuzzleData(null);
      }
    };

    loadForDate();
  }, [selectedDate, difficulty, onDateChange]);

  const checkWinCondition = useCallback(() => {
    if (route.length < 2 || !puzzleData) return;

    const first = route[0];
    const last = route[route.length - 1];

    if (first.type === 'north_pole' && last.type === 'north_pole') {
      if (visitedHouses.size === puzzleData.houses.length) {
        // Validate that each house appears exactly once in the route
        const houseIdsInRoute = route
          .filter(node => node.type === 'house')
          .map(node => node.id);
        const uniqueHouseIds = new Set(houseIdsInRoute);
        
        if (uniqueHouseIds.size !== puzzleData.houses.length || houseIdsInRoute.length !== puzzleData.houses.length) {
          // Invalid route: houses are duplicated or missing
          console.warn('Invalid route: houses are not visited exactly once');
          return;
        }
        
        // Count this as a completed attempt if it was a full attempt and not already complete
        if (!gameComplete && currentAttemptStarted) {
          setAttempts(prev => prev + 1);
          setCurrentAttemptStarted(false);
        }
        
        // Save score when game is completed (only once)
        if (!gameComplete) {
          const cleanDate = puzzleData.date.replace(' (Test)', '');
          const currentDist = calculateDistance(route);
          const finalAttempts = attempts + (currentAttemptStarted ? 1 : 0);
          
          // Check if user found a better solution than the stored optimal
          // This can happen for larger puzzles where the generator uses heuristics
          if (currentDist < puzzleData.optimal_distance) {
            const improvement = puzzleData.optimal_distance - currentDist;
            const improvementPercent = ((improvement / puzzleData.optimal_distance) * 100).toFixed(2);
            console.warn(
              `User found a better solution! ` +
              `Stored optimal: ${puzzleData.optimal_distance.toFixed(2)}, ` +
              `User solution: ${currentDist.toFixed(2)} ` +
              `(${improvementPercent}% better)`
            );
            // Use the user's distance as the new optimal for efficiency calculation
            // but still save the original optimal_distance for reference
            const efficiencyValue = '100.00%';
            
            saveScore(cleanDate, difficulty, {
              distance: currentDist,
              optimalDistance: currentDist, // Update to user's better solution
              efficiency: efficiencyValue,
              attempts: finalAttempts > 0 ? finalAttempts : 1,
              timestamp: Date.now()
            });
          } else {
            const efficiencyValue = (Math.min((puzzleData.optimal_distance / currentDist) * 100, 100)).toFixed(2) + '%';
            
            saveScore(cleanDate, difficulty, {
              distance: currentDist,
              optimalDistance: puzzleData.optimal_distance,
              efficiency: efficiencyValue,
              attempts: finalAttempts > 0 ? finalAttempts : 1,
              timestamp: Date.now()
            });
          }
        }
        
        setGameComplete(true);
      }
    }
  }, [route, visitedHouses, puzzleData, currentAttemptStarted, gameComplete, attempts, difficulty]);

  useEffect(() => {
    checkWinCondition();
  }, [checkWinCondition]);

  useEffect(() => {
    if (visitedHouses.size === puzzleData?.houses.length &&
      route.length > 1 &&
      route[route.length - 1].type !== 'north_pole' &&
      !gameComplete) {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
      reminderTimeoutRef.current = setTimeout(() => {
        if (visitedHouses.size === puzzleData.houses.length &&
          route.length > 1 &&
          route[route.length - 1].type !== 'north_pole' &&
          !gameComplete) {
          setShowReminder(true);
        }
      }, 2000);
    } else {
      setShowReminder(false);
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }
    }

    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, [visitedHouses, route, gameComplete, puzzleData]);

  const handleNodeClick = useCallback((x, y, fromNode = null) => {
    if (!puzzleData) {
      return;
    }

    const clickRadius = 30;
    let targetNode = null;

    if (fromNode) {
      const np = puzzleData.north_pole;
      const distToNP = Math.sqrt((x - np.x) ** 2 + (y - np.y) ** 2);

      if (distToNP < clickRadius) {
        targetNode = { type: 'north_pole', x: np.x, y: np.y };
      } else {
        for (const house of puzzleData.houses) {
          const distToHouse = Math.sqrt((x - house.x) ** 2 + (y - house.y) ** 2);
          if (distToHouse < clickRadius) {
            targetNode = { type: 'house', id: house.id, x: house.x, y: house.y };
            break;
          }
        }
      }

      if (targetNode && route.length > 0) {
        const lastNode = route[route.length - 1];
        if (fromNode.type !== lastNode.type ||
          (fromNode.type === 'house' && fromNode.id !== lastNode.id) ||
          (fromNode.type === 'north_pole' && (fromNode.x !== lastNode.x || fromNode.y !== lastNode.y))) {
          return;
        }
      }
    } else {
      targetNode = findNodeAt(puzzleData, x, y);

      if (targetNode && targetNode.type === 'house' && visitedHouses.has(targetNode.id)) {
        return;
      }

      if (targetNode && route.length > 0) {
        const lastNode = route[route.length - 1];
        const secondLastNode = route.length > 1 ? route[route.length - 2] : null;

        if (isSameNode(targetNode, lastNode)) {
          setRoute(prev => {
            const newRoute = [...prev];
            const removedNode = newRoute.pop();
            if (removedNode.type === 'house') {
              setVisitedHouses(prev => {
                const newSet = new Set(prev);
                newSet.delete(removedNode.id);
                return newSet;
              });
            }
            return newRoute;
          });
          setGameComplete(false);
          setShowReminder(false);
          return;
        }

        if (secondLastNode && isSameNode(targetNode, secondLastNode)) {
          setRoute(prev => {
            const newRoute = [...prev];
            const removedNode = newRoute.pop();
            if (removedNode.type === 'house') {
              setVisitedHouses(prev => {
                const newSet = new Set(prev);
                newSet.delete(removedNode.id);
                return newSet;
              });
            }
            return newRoute;
          });
          setGameComplete(false);
          setShowReminder(false);
          return;
        }
      }
    }

    if (!targetNode) {
      return;
    }

    if (targetNode.type === 'north_pole') {
      if (route.length === 0) {
        return;
      } else if (route.length > 1 && visitedHouses.size === puzzleData.houses.length) {
        setRouteAnimationProgress(1);
        setRoute(prev => [...prev, { type: 'north_pole', x: targetNode.x, y: targetNode.y }]);
        setShowReminder(false);
      } else if (route.length > 0 && route[route.length - 1].type !== 'north_pole') {
        if (visitedHouses.size === puzzleData.houses.length) {
          setRouteAnimationProgress(1);
          setRoute(prev => [...prev, { type: 'north_pole', x: targetNode.x, y: targetNode.y }]);
          setShowReminder(false);
        }
      }
      return;
    }

    if (targetNode.type === 'house') {
      if (visitedHouses.has(targetNode.id)) {
        return;
      }

      setRouteAnimationProgress(1);
      
      if (route.length === 0) {
        const np = puzzleData.north_pole;
        setRoute([
          { type: 'north_pole', x: np.x, y: np.y },
          { type: 'house', id: targetNode.id, x: targetNode.x, y: targetNode.y }
        ]);
        setVisitedHouses(prev => new Set(prev).add(targetNode.id));
        setCurrentAttemptStarted(true);
      } else {
        setRoute(prev => [...prev, { type: 'house', id: targetNode.id, x: targetNode.x, y: targetNode.y }]);
        setVisitedHouses(prev => new Set(prev).add(targetNode.id));
        if (!currentAttemptStarted) {
          setCurrentAttemptStarted(true);
        }
      }
      return;
    }
  }, [puzzleData, route, visitedHouses]);

  const undoLastMove = useCallback(() => {
    if (route.length === 0) return;

    let newRouteLength = 0;
    setRoute(prev => {
      const newRoute = [...prev];
      const lastNode = newRoute.pop();
      if (lastNode.type === 'house') {
        setVisitedHouses(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastNode.id);
          return newSet;
        });
      }
      newRouteLength = newRoute.length;
      // If we undo back to just the starting north pole, the attempt hasn't really started
      if (newRoute.length <= 1) {
        setCurrentAttemptStarted(false);
      }
      return newRoute;
    });
    // If we undo after completing, allow a new attempt if there are still houses visited
    if (gameComplete) {
      setCurrentAttemptStarted(newRouteLength > 1);
    }
    setGameComplete(false);
    setShowReminder(false);
  }, [route, gameComplete]);

  const resetRoute = useCallback(() => {
    setRoute([]);
    setVisitedHouses(new Set());
    setGameComplete(false);
    setShowReminder(false);
    setShowingSolution(false);
    setSolutionRoute(null);
    setSolutionAnimationIndex(0);
    setRouteAnimationProgress(1);
    setCurrentAttemptStarted(false);
    if (solutionAnimationFrameRef.current) {
      clearTimeout(solutionAnimationFrameRef.current);
      solutionAnimationFrameRef.current = null;
    }
    if (routeAnimationRef.current) {
      cancelAnimationFrame(routeAnimationRef.current);
      routeAnimationRef.current = null;
    }
  }, []);

  const toggleSolution = useCallback(async () => {
    if (!puzzleData) return;

    // Hard puzzles don't have solutions available
    if (difficulty === 'hard') {
      alert('Solutions are not available for hard puzzles. You must solve it yourself!');
      return;
    }

    if (showingSolution) {
      setShowingSolution(false);
      setSolutionRoute(null);
      setSolutionAnimationIndex(0);
      if (solutionAnimationFrameRef.current) {
        clearTimeout(solutionAnimationFrameRef.current);
        solutionAnimationFrameRef.current = null;
      }
      return;
    }

    try {
      const cleanDate = puzzleData.date.replace(' (Test)', '');
      const solution = await loadSolution(cleanDate, difficulty);
      setSolutionRoute(solution.route);
      setShowingSolution(true);
      setSolutionAnimationIndex(0);

      const animate = () => {
        setSolutionAnimationIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= solution.route.length - 1) {
            return solution.route.length - 1;
          }
          solutionAnimationFrameRef.current = setTimeout(animate, 300);
          return nextIndex;
        });
      };
      solutionAnimationFrameRef.current = setTimeout(animate, 300);
    } catch (error) {
      console.error('Error loading solution:', error);
      alert('Solution not available for this puzzle.');
    }
  }, [puzzleData, showingSolution, difficulty]);

  const animateRouteSegment = useCallback(() => {
    if (routeAnimationRef.current) {
      cancelAnimationFrame(routeAnimationRef.current);
    }

    const startTime = Date.now();
    const duration = 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setRouteAnimationProgress(easedProgress);

      if (progress < 1) {
        routeAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setRouteAnimationProgress(1);
      }
    };

    routeAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // Animation disabled - nodes snap immediately
  // useEffect(() => {
  //   if (route.length >= 2 && routeAnimationProgress === 0) {
  //     animateRouteSegment();
  //   }
  // }, [route.length, routeAnimationProgress, animateRouteSegment]);

  useEffect(() => {
    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
      if (solutionAnimationFrameRef.current) {
        clearTimeout(solutionAnimationFrameRef.current);
      }
      if (routeAnimationRef.current) {
        cancelAnimationFrame(routeAnimationRef.current);
      }
    };
  }, []);

  const currentDistance = calculateDistance(route);
  const efficiency = gameComplete && puzzleData
    ? (Math.min((puzzleData.optimal_distance / currentDistance) * 100, 100)).toFixed(2) + '%'
    : '-';

  return {
    puzzleData,
    route,
    visitedHouses,
    gameComplete,
    showingSolution,
    solutionRoute,
    solutionAnimationIndex,
    showReminder,
    currentDistance,
    efficiency,
    routeAnimationProgress,
    attempts,
    handleNodeClick,
    undoLastMove,
    resetRoute,
    toggleSolution
  };
}

