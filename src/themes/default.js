export const defaultTheme = {
  name: 'default',
  title: "📮 Postal Route Puzzle",
  subtitle: "Find the shortest path visiting all houses and returning to the post office!",
  startNodeLabel: 'PO',
  startNodeName: 'Post Office',
  nodeTypeNames: {
    north_pole: 'Post Office',
    house: 'house'
  },
  instructions: {
    title: "How to play:",
    items: [
      "Click or drag from the Post Office to begin",
      "Click or drag to houses to visit them",
      "Return to the Post Office to complete the route",
      "Try to minimize your total distance!"
    ]
  },
  winMessage: {
    title: "🎉 Route Complete! 🎉",
    description: "You visited all houses and returned to the Post Office!",
    efficiencyLabel: "Your efficiency:"
  },
  reminder: "✨ All houses visited! Return to the Post Office to complete your route! ✨",
  colors: {
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
    canvasBackground: '#0f1429',
    primary: '#c41e3a',
    primaryGradient: 'linear-gradient(135deg, #c41e3a 0%, #8b1538 100%)',
    secondary: '#4a90e2',
    secondaryGradient: 'linear-gradient(135deg, #4a90e2 0%, #2e5c8a 100%)',
    warning: '#ff9800',
    warningGradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    route: '#4a90e2',
    solution: '#ffd700',
    startNode: '#c41e3a',
    startNodeActive: '#ff6b6b',
    house: '#ffffff',
    houseVisited: '#90EE90',
    houseOutline: '#cccccc',
    houseOutlineVisited: '#228B22',
    text: '#ffffff',
    textSecondary: '#b8d4f0',
    gold: '#ffd700'
  },
  icons: {
    instructionBullet: '📍',
    node: '🏠', // House for unvisited nodes
    nodeVisited: '📦', // Package for visited nodes
    startNode: '🏣', // Post office for start node
    vehicle: '🚐' // Van for current position in tour
  }
};

