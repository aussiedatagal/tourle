import { describe, it, expect } from 'vitest';
import { christmasTheme } from './christmas';
import { defaultTheme } from './default';
import { themes, getThemeByName, getAvailableThemes } from './index';

describe('Theme System', () => {
  describe('Christmas Theme', () => {
    it('should have all required properties', () => {
      expect(christmasTheme).toHaveProperty('name');
      expect(christmasTheme).toHaveProperty('title');
      expect(christmasTheme).toHaveProperty('subtitle');
      expect(christmasTheme).toHaveProperty('colors');
      expect(christmasTheme).toHaveProperty('icons');
    });

    it('should have correct name', () => {
      expect(christmasTheme.name).toBe('christmas');
    });

    it('should have emoji icons', () => {
      expect(christmasTheme.icons).toHaveProperty('node');
      expect(christmasTheme.icons).toHaveProperty('nodeVisited');
      expect(christmasTheme.icons).toHaveProperty('startNode');
      expect(christmasTheme.icons).toHaveProperty('vehicle');
      expect(christmasTheme.icons).toHaveProperty('instructionBullet');
      
      // Verify emojis are present
      expect(christmasTheme.icons.node).toBe('🏠');
      expect(christmasTheme.icons.nodeVisited).toBe('🎁');
      expect(christmasTheme.icons.startNode).toBe('🏭');
      expect(christmasTheme.icons.vehicle).toBe('🦌🎅');
      expect(christmasTheme.icons.instructionBullet).toBe('❄️');
    });

    it('should have all required color properties', () => {
      const requiredColors = [
        'background', 'canvasBackground', 'primary', 'secondary',
        'route', 'solution', 'startNode', 'house', 'houseVisited',
        'text', 'gold'
      ];
      
      requiredColors.forEach(color => {
        expect(christmasTheme.colors).toHaveProperty(color);
      });
    });

    it('should have instructions', () => {
      expect(christmasTheme.instructions).toHaveProperty('title');
      expect(christmasTheme.instructions).toHaveProperty('items');
      expect(Array.isArray(christmasTheme.instructions.items)).toBe(true);
      expect(christmasTheme.instructions.items.length).toBeGreaterThan(0);
    });
  });

  describe('Default Theme', () => {
    it('should have all required properties', () => {
      expect(defaultTheme).toHaveProperty('name');
      expect(defaultTheme).toHaveProperty('title');
      expect(defaultTheme).toHaveProperty('subtitle');
      expect(defaultTheme).toHaveProperty('colors');
      expect(defaultTheme).toHaveProperty('icons');
    });

    it('should have correct name', () => {
      expect(defaultTheme.name).toBe('default');
    });

    it('should have emoji icons', () => {
      expect(defaultTheme.icons).toHaveProperty('node');
      expect(defaultTheme.icons).toHaveProperty('nodeVisited');
      expect(defaultTheme.icons).toHaveProperty('startNode');
      expect(defaultTheme.icons).toHaveProperty('vehicle');
      
      // Verify emojis are present
      expect(defaultTheme.icons.node).toBe('🏠');
      expect(defaultTheme.icons.nodeVisited).toBe('📦');
      expect(defaultTheme.icons.startNode).toBe('🏣');
      expect(defaultTheme.icons.vehicle).toBe('🚐');
    });

    it('should have postal theme elements', () => {
      expect(defaultTheme.title).toContain('Postal');
      expect(defaultTheme.startNodeName).toBe('Post Office');
      expect(defaultTheme.icons.startNode).toBe('🏣');
    });

    it('should have all required color properties', () => {
      const requiredColors = [
        'background', 'canvasBackground', 'primary', 'secondary',
        'route', 'solution', 'startNode', 'house', 'houseVisited',
        'text', 'gold'
      ];
      
      requiredColors.forEach(color => {
        expect(defaultTheme.colors).toHaveProperty(color);
      });
    });
  });

  describe('Theme Index', () => {
    it('should export all themes', () => {
      expect(themes).toHaveProperty('christmas');
      expect(themes).toHaveProperty('default');
    });

    it('should get theme by name', () => {
      expect(getThemeByName('christmas')).toBe(christmasTheme);
      expect(getThemeByName('default')).toBe(defaultTheme);
      expect(getThemeByName('invalid')).toBe(defaultTheme); // Should default
    });

    it('should get available theme names', () => {
      const available = getAvailableThemes();
      expect(Array.isArray(available)).toBe(true);
      expect(available).toContain('christmas');
      expect(available).toContain('default');
    });
  });

  describe('Theme Consistency', () => {
    it('should have consistent structure across themes', () => {
      const christmasKeys = Object.keys(christmasTheme);
      const defaultKeys = Object.keys(defaultTheme);
      
      // Both themes should have the same top-level keys
      expect(christmasKeys.sort()).toEqual(defaultKeys.sort());
    });

    it('should have consistent icon structure', () => {
      const christmasIconKeys = Object.keys(christmasTheme.icons);
      const defaultIconKeys = Object.keys(defaultTheme.icons);
      
      expect(christmasIconKeys.sort()).toEqual(defaultIconKeys.sort());
    });

    it('should have consistent color structure', () => {
      const christmasColorKeys = Object.keys(christmasTheme.colors);
      const defaultColorKeys = Object.keys(defaultTheme.colors);
      
      expect(christmasColorKeys.sort()).toEqual(defaultColorKeys.sort());
    });
  });

  describe('Node icon changes on visit', () => {
    it('should have different icons for unvisited and visited nodes in Christmas theme', () => {
      expect(christmasTheme.icons.node).not.toBe(christmasTheme.icons.nodeVisited);
      expect(christmasTheme.icons.node).toBe('🏠');
      expect(christmasTheme.icons.nodeVisited).toBe('🎁');
    });

    it('should have different icons for unvisited and visited nodes in Default theme', () => {
      expect(defaultTheme.icons.node).not.toBe(defaultTheme.icons.nodeVisited);
      expect(defaultTheme.icons.node).toBe('🏠');
      expect(defaultTheme.icons.nodeVisited).toBe('📦');
    });

    it('should have nodeVisited icon different from node icon in all themes', () => {
      Object.values(themes).forEach(theme => {
        expect(theme.icons.node).toBeDefined();
        expect(theme.icons.nodeVisited).toBeDefined();
        expect(theme.icons.node).not.toBe(theme.icons.nodeVisited);
      });
    });
  });
});

