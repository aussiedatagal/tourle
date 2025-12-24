export function getCanvasCoords(canvas, event, touch = false) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX, clientY;
  if (touch && event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

export function findNodeAt(puzzleData, x, y, clickRadius = null) {
  if (!puzzleData) return null;

  // Use larger click radius for mobile/touch devices
  if (clickRadius === null) {
    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || 'ontouchstart' in window);
    clickRadius = isMobile ? 50 : 30; // 50px for mobile, 30px for desktop
  }

  const np = puzzleData.north_pole;
  const distToNP = Math.sqrt((x - np.x) ** 2 + (y - np.y) ** 2);
  if (distToNP < clickRadius) {
    return { type: 'north_pole', x: np.x, y: np.y };
  }

  for (const house of puzzleData.houses) {
    const distToHouse = Math.sqrt((x - house.x) ** 2 + (y - house.y) ** 2);
    if (distToHouse < clickRadius) {
      return { type: 'house', id: house.id, x: house.x, y: house.y };
    }
  }

  return null;
}

export function isSameNode(node1, node2) {
  if (node1.type !== node2.type) return false;
  if (node1.type === 'north_pole') {
    return node1.x === node2.x && node1.y === node2.y;
  }
  if (node1.type === 'house') {
    return node1.id === node2.id;
  }
  return false;
}

export function calculateDistance(route) {
  if (route.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i];
    const p2 = route[i + 1];
    total += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }
  return total;
}

export function setupCanvas(canvas) {
  const container = canvas.parentElement;
  if (!container) return;
  
  const containerWidth = container.clientWidth - 40;
  
  // Calculate available viewport height for the canvas
  // Account for other UI elements that might be above/below
  const viewportHeight = window.innerHeight;
  const estimatedOtherElementsHeight = 300; // Conservative estimate for header, controls, padding
  const availableHeight = viewportHeight - estimatedOtherElementsHeight;
  
  // Use the smaller of width or available height to ensure it fits
  // Still cap at 1000px max
  const maxSize = Math.min(containerWidth, availableHeight, 1000);

  canvas.width = 1000;
  canvas.height = 1000;
  canvas.style.width = maxSize + 'px';
  canvas.style.height = maxSize + 'px';
}

