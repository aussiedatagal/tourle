export function render(
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
) {
  if (!puzzleData || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rect = canvas.getBoundingClientRect();
  let displayWidth = rect.width;
  let displayHeight = rect.height;
  
  if (displayWidth <= 0 || displayHeight <= 0 || !isFinite(displayWidth) || !isFinite(displayHeight)) {
    const styleWidth = canvas.style ? parseFloat(canvas.style.width) : null;
    const styleHeight = canvas.style ? parseFloat(canvas.style.height) : null;
    displayWidth = (styleWidth && styleWidth > 0) ? styleWidth : canvas.width;
    displayHeight = (styleHeight && styleHeight > 0) ? styleHeight : canvas.height;
  }
  
  const displayScale = Math.min(displayWidth / canvas.width, displayHeight / canvas.height);
  const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
  const minDisplayScale = 0.5;
  const safeDisplayScale = Math.max(displayScale, minDisplayScale);
  
  let scale = isMobile 
    ? (safeDisplayScale < 0.6 ? 3 : 2)
    : 1.5;

  scale = adjustScaleForOverlap(puzzleData, scale);

  drawGrid(ctx);
  drawHouses(ctx, puzzleData, visitedHouses, theme, scale);
  drawNorthPole(ctx, puzzleData, route, visitedHouses, theme, scale);

  if (route.length >= 2) {
    drawRoute(ctx, route, routeAnimationProgress, theme);
  }

  if (dragStartNode && dragTargetNode) {
    drawDragPreview(ctx, dragStartNode, dragTargetNode, theme);
  }

  drawRouteNodes(ctx, puzzleData, route, routeAnimationProgress, theme, scale);

  if (showingSolution && solutionRoute && solutionRoute.length > 1) {
    drawSolutionRoute(ctx, solutionRoute, solutionAnimationIndex, theme);
  }

  if (showingSolution && solutionRoute) {
    drawSolutionRouteNodes(ctx, solutionRoute, solutionAnimationIndex, theme, scale);
  }
}

function adjustScaleForOverlap(puzzleData, baseScale) {
  if (!puzzleData) return baseScale;

  const maxBaseFontSize = 32;
  const maxEmojiSize = maxBaseFontSize * baseScale;
  const minRequiredDistance = maxEmojiSize * 1.2;

  for (const house of puzzleData.houses) {
    const dist = Math.sqrt((np.x - house.x) ** 2 + (np.y - house.y) ** 2);
    minDistance = Math.min(minDistance, dist);
  }
  
  for (let i = 0; i < puzzleData.houses.length; i++) {
    for (let j = i + 1; j < puzzleData.houses.length; j++) {
      const h1 = puzzleData.houses[i];
      const h2 = puzzleData.houses[j];
      const dist = Math.sqrt((h1.x - h2.x) ** 2 + (h1.y - h2.y) ** 2);
      minDistance = Math.min(minDistance, dist);
    }
  }

  if (minDistance < minRequiredDistance && minDistance > 0) {
    const safeScale = minDistance / (maxBaseFontSize * 1.2);
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
    const minScale = isMobile ? 0.8 : 1.0; // Allow mobile to scale down more if needed
    return Math.max(Math.min(baseScale, safeScale), minScale);
  }

  return baseScale;
}

function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 10; i++) {
    const pos = i * 100;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 1000);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(1000, pos);
    ctx.stroke();
  }
}

function drawRoute(ctx, route, animationProgress, theme) {
  if (route.length < 2) return;

  ctx.strokeStyle = theme.colors.route;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  ctx.beginPath();
  
  for (let i = 0; i < route.length - 1; i++) {
    const point = route[i];
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  if (route.length > 1) {
    const lastSegmentStart = route[route.length - 2];
    const lastSegmentEnd = route[route.length - 1];
    
    if (animationProgress === 0) {
      ctx.lineTo(lastSegmentStart.x, lastSegmentStart.y);
    } else if (animationProgress > 0 && animationProgress < 1) {
      const animatedX = lastSegmentStart.x + (lastSegmentEnd.x - lastSegmentStart.x) * animationProgress;
      const animatedY = lastSegmentStart.y + (lastSegmentEnd.y - lastSegmentStart.y) * animationProgress;
      ctx.lineTo(animatedX, animatedY);
    } else {
      ctx.lineTo(lastSegmentEnd.x, lastSegmentEnd.y);
    }
  }
  
  ctx.stroke();
}

function drawDragPreview(ctx, fromNode, toNode, theme) {
  const routeColor = theme.colors.route;
  const rgbMatch = routeColor.match(/\d+/g);
  ctx.strokeStyle = rgbMatch
    ? `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.5)`
    : 'rgba(74, 144, 226, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(fromNode.x, fromNode.y);
  ctx.lineTo(toNode.x, toNode.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHouses(ctx, puzzleData, visitedHouses, theme, scale = 1) {
  const baseFontSize = 28;
  const fontSize = baseFontSize * scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const house of puzzleData.houses) {
    const emoji = visitedHouses.has(house.id)
      ? theme.icons.nodeVisited
      : theme.icons.node;
    ctx.fillText(emoji, house.x, house.y);
  }
}

function drawNorthPole(ctx, puzzleData, route, visitedHouses, theme, scale = 1) {
  const np = puzzleData.north_pole;
  const baseFontSize = 32;
  const fontSize = baseFontSize * scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(theme.icons.startNode, np.x, np.y);
}

function drawRouteNodes(ctx, puzzleData, route, animationProgress, theme, scale = 1) {
  let vehicleNode;
  let vehicleX, vehicleY;

  if (route.length === 0) {
    vehicleNode = puzzleData.north_pole;
    vehicleX = vehicleNode.x;
    vehicleY = vehicleNode.y;
  } else if (route.length === 1) {
    vehicleNode = route[0];
    vehicleX = vehicleNode.x;
    vehicleY = vehicleNode.y;
  } else {
    const lastSegmentStart = route[route.length - 2];
    const lastSegmentEnd = route[route.length - 1];
    
    if (animationProgress < 1) {
      vehicleX = lastSegmentStart.x + (lastSegmentEnd.x - lastSegmentStart.x) * animationProgress;
      vehicleY = lastSegmentStart.y + (lastSegmentEnd.y - lastSegmentStart.y) * animationProgress;
    } else {
      vehicleX = lastSegmentEnd.x;
      vehicleY = lastSegmentEnd.y;
    }
  }

  const baseFontSize = 24;
  const fontSize = baseFontSize * scale;
  const offset = 20 * scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(theme.icons.vehicle, vehicleX, vehicleY - offset);
}

function drawSolutionRoute(ctx, solutionRoute, solutionAnimationIndex, theme) {
  if (!solutionRoute || solutionRoute.length < 2) return;

  ctx.strokeStyle = theme.colors.solution;
  ctx.lineWidth = 4;
  ctx.setLineDash([]);

  ctx.beginPath();
  const endIndex = Math.min(solutionAnimationIndex + 1, solutionRoute.length);

  for (let i = 0; i < endIndex; i++) {
    const point = solutionRoute[i];
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();
}

function drawSolutionRouteNodes(ctx, solutionRoute, solutionAnimationIndex, theme, scale = 1) {
  if (!solutionRoute) return;

  const endIndex = Math.min(solutionAnimationIndex + 1, solutionRoute.length);
  if (endIndex > 0) {
    const currentPoint = solutionRoute[endIndex - 1];
    const baseFontSize = 24;
    const fontSize = baseFontSize * scale;
    const offset = 20 * scale;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(theme.icons.vehicle, currentPoint.x, currentPoint.y - offset);
  }
}

