import { christmasTheme } from './christmas';
import { defaultTheme } from './default';

export const themes = {
  christmas: christmasTheme,
  default: defaultTheme
};

// Helper to get theme value (for backward compatibility)
export function getTheme() {
  // This will be overridden by theme context
  return themes.christmas;
}

// Get theme by name
export function getThemeByName(name) {
  return themes[name] || themes.default;
}

// Get all available theme names
export function getAvailableThemes() {
  return Object.keys(themes);
}

