export const christmasTheme = {
  name: 'christmas',
  title: "🎅 Santa's Sleigh Route",
  subtitle: "Help Santa find the shortest path to deliver all presents!",
  startNodeLabel: 'NP',
  startNodeName: 'North Pole',
  nodeTypeNames: {
    north_pole: 'North Pole',
    house: 'house'
  },
  instructions: {
    title: "How to play:",
    items: [
      "Click or drag from the North Pole (red square) to start",
      "Click or drag to houses (white circles) to visit them",
      "Return to the North Pole to complete the route",
      "Try to minimize your total distance!"
    ]
  },
  winMessage: {
    title: "🎉 Route Complete! 🎉",
    description: "You visited all houses and returned to the North Pole!",
    efficiencyLabel: "Your efficiency:"
  },
  reminder: "✨ All houses visited! Return to the North Pole to complete your route! ✨",
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
    instructionBullet: '❄️',
    node: '🏠', // House for unvisited nodes
    nodeVisited: '🎁', // Present for visited nodes
    startNode: '🏭', // North Pole
    vehicle: '🦌🛷🎅🎁' // Sleigh for current position in tour
  }
};

