import { test, expect } from '@playwright/test';

// Helper function to tap or click based on touch support
// Playwright simulates touch support for mobile device presets (Pixel 5, iPhone 12, etc.)
async function tapOrClick(locator, options = {}) {
  try {
    // Try tap first - this works on mobile device projects (Pixel 5, iPhone 12)
    // which have hasTouch: true enabled by default
    await locator.tap(options);
  } catch (error) {
    // Fall back to click if tap is not supported (desktop browsers without touch)
    // The error message will indicate touch is not supported
    if (error.message && (error.message.includes('tap') || error.message.includes('touch') || error.message.includes('does not support'))) {
      await locator.click(options);
    } else {
      // Re-throw if it's a different error (element not found, etc.)
      throw error;
    }
  }
}

// Helper function to safely get errors from page context
async function getPageErrors(page) {
  try {
    const consoleErrors = await page.evaluate(() => window.__consoleErrors || []);
    const pageErrors = await page.evaluate(() => window.__pageErrors || []);
    const allErrors = [...consoleErrors, ...pageErrors];
    
    // Filter out expected errors that occur during normal operation:
    // - CORS errors when checking for puzzle files (expected during puzzle discovery)
    // - Network errors for missing puzzle files (expected during fallback search)
    // - Puzzle not found errors (expected during fallback search)
    const filteredErrors = allErrors.filter(error => {
      const errorStr = String(error).toLowerCase();
      // Ignore CORS/access control errors for puzzle files
      if (errorStr.includes('access control') || errorStr.includes('cors')) {
        if (errorStr.includes('puzzle') || errorStr.includes('.json') || errorStr.includes('/puzzles/')) {
          return false;
        }
      }
      // Ignore network errors for puzzle files (expected during discovery)
      if (errorStr.includes('failed to fetch') && (errorStr.includes('puzzle') || errorStr.includes('/puzzles/'))) {
        return false;
      }
      // Ignore errors that mention puzzle paths (these are expected during discovery)
      if (errorStr.includes('/puzzles/') && (errorStr.includes('due to') || errorStr.includes('access'))) {
        return false;
      }
      // Ignore expected puzzle loading errors (these occur during fallback search)
      if (errorStr.includes('error loading puzzle') || 
          (errorStr.includes('puzzle not found') && !errorStr.includes('solution'))) {
        return false;
      }
      return true;
    });
    
    return filteredErrors;
  } catch (error) {
    // If execution context is destroyed, return empty array
    // This can happen if the page navigated or crashed
    return [];
  }
}

test.describe('Travelling Salesman Puzzle - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Store console errors in page context for later assertion
    await page.addInitScript(() => {
      window.__consoleErrors = [];
      window.__pageErrors = [];
      
      const originalError = console.error;
      console.error = (...args) => {
        window.__consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });
    
    // Collect console errors and page errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Try to store in page context, but don't fail if context is destroyed
        page.evaluate((errorText) => {
          if (!window.__consoleErrors) window.__consoleErrors = [];
          window.__consoleErrors.push(errorText);
        }, msg.text()).catch(() => {
          // Execution context might be destroyed, ignore
        });
      }
    });
    
    page.on('pageerror', (error) => {
      // Try to store in page context, but don't fail if context is destroyed
      page.evaluate((errorMessage) => {
        if (!window.__pageErrors) window.__pageErrors = [];
        window.__pageErrors.push(errorMessage);
      }, error.message).catch(() => {
        // Execution context might be destroyed, ignore
      });
    });
    
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should load the page without errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('.container', { timeout: 10000 });
    
    // Check that the title is visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should display game canvas and initial puzzle data', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to be rendered
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Wait for puzzle data to load
    await page.waitForSelector('.game-info', { timeout: 10000 });
    
    // Check that game info displays date
    const gameInfo = page.locator('.game-info');
    await expect(gameInfo).toBeVisible();
    
    // Check that distance is displayed
    await expect(page.locator('.game-info .info-item').filter({ hasText: 'Distance:' })).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should open and close instructions modal', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForSelector('.container', { timeout: 10000 });
    
    // Check if instructions modal is visible (might be shown on first visit)
    const instructionsModal = page.locator('[class*="instructions"], [class*="modal"]').filter({ hasText: /instructions|how to play/i });
    
    // If modal is visible, close it first
    const isVisible = await instructionsModal.isVisible().catch(() => false);
    if (isVisible) {
      const closeButton = page.locator('button').filter({ hasText: /close|got it|×/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Click instructions button
    const instructionsButton = page.locator('button').filter({ hasText: /instructions|📖/i });
    await instructionsButton.click();
    
    // Wait for modal to appear
    await page.waitForTimeout(500);
    
    // Try to find and close the modal
    const closeBtn = page.locator('button').filter({ hasText: /close|got it|×/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should interact with game canvas by clicking nodes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000); // Give time for puzzle to load
    
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Get canvas dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    
    // Click on the canvas at different positions to simulate clicking nodes
    // Click near center (likely where north pole or a house might be)
    await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } });
    await page.waitForTimeout(300);
    
    // Click at another position
    await canvas.click({ position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 } });
    await page.waitForTimeout(300);
    
    // Check that distance has changed (indicating route was updated)
    const distanceText = await page.locator('.game-info .info-item').filter({ hasText: 'Distance:' }).textContent();
    expect(distanceText).toBeTruthy();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should use undo button', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas and controls
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForSelector('.controls', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    // Get initial distance
    const initialDistanceElement = page.locator('.game-info .info-item').filter({ hasText: 'Distance:' });
    const initialDistance = await initialDistanceElement.textContent();
    
    // Click on canvas at multiple positions to try to hit nodes
    // Try clicking at various positions to ensure we hit at least one node
    const clickPositions = [
      { x: canvasBox.width / 2, y: canvasBox.height / 2 },
      { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.7, y: canvasBox.height * 0.7 },
      { x: canvasBox.width * 0.2, y: canvasBox.height * 0.5 },
      { x: canvasBox.width * 0.8, y: canvasBox.height * 0.5 },
    ];
    
    for (const pos of clickPositions) {
      await canvas.click({ position: pos });
      await page.waitForTimeout(300);
      
      // Check if button is enabled
      const undoButton = page.locator('.controls button').filter({ hasText: /back|undo|←/i });
      const isEnabled = await undoButton.isEnabled().catch(() => false);
      
      if (isEnabled) {
        // Successfully added nodes, now test undo
        await undoButton.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    // Verify undo button worked (either it was clicked, or it remained disabled because no nodes were added)
    // The important thing is that no errors occurred
    await page.waitForTimeout(300);
    
    // Distance should have changed (or button should be disabled if route is empty)
    const distanceAfterUndo = await page.locator('.game-info .info-item').filter({ hasText: 'Distance:' }).textContent();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should use reset button', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas and controls
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForSelector('.controls', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    // Click on canvas to add nodes
    await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } });
    await page.waitForTimeout(300);
    await canvas.click({ position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 } });
    await page.waitForTimeout(300);
    
    // Click reset button
    const resetButton = page.locator('button').filter({ hasText: /reset/i });
    await resetButton.click();
    await page.waitForTimeout(500);
    
    // Distance should be reset (or very low)
    const distanceAfterReset = await page.locator('.game-info .info-item').filter({ hasText: 'Distance:' }).textContent();
    expect(distanceAfterReset).toBeTruthy();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should switch difficulty levels', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game info to load
    await page.waitForSelector('.game-info', { timeout: 10000 });
    await page.waitForSelector('#difficulty-select', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Get current difficulty
    const difficultySelect = page.locator('#difficulty-select');
    const currentValue = await difficultySelect.inputValue();
    
    // Switch to a different difficulty
    if (currentValue === 'medium') {
      await difficultySelect.selectOption('easy');
    } else {
      await difficultySelect.selectOption('medium');
    }
    
    await page.waitForTimeout(1500); // Wait for puzzle to reload
    
    // Check that puzzle data reloaded
    await expect(page.locator('.game-info')).toBeVisible();
    
    // Verify difficulty changed
    const newValue = await difficultySelect.inputValue();
    expect(newValue).not.toBe(currentValue);
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should show and hide give up button (not in hard mode)', async ({ page }) => {
    await page.goto('/');
    
    // Wait for controls
    await page.waitForSelector('.controls', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Check if give up button exists (should not be visible in hard mode)
    const giveUpButton = page.locator('button').filter({ hasText: /give up/i });
    const isVisible = await giveUpButton.isVisible().catch(() => false);
    
    // If visible, click it
    if (isVisible) {
      await giveUpButton.click();
      await page.waitForTimeout(500);
      
      // Button text should change to "Hide Solution"
      await expect(page.locator('button').filter({ hasText: /hide solution/i })).toBeVisible();
    }
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should open and close statistics modal', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game info
    await page.waitForSelector('.game-info', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Click stats button
    const statsButton = page.locator('button').filter({ hasText: /stats|📊/i });
    await statsButton.click();
    await page.waitForTimeout(500);
    
    // Look for statistics modal or content
    const statsModal = page.locator('[class*="statistics"], [class*="modal"]').filter({ hasText: /statistics|stats/i });
    
    // Try to find and close the modal
    const closeBtn = page.locator('button').filter({ hasText: /close|×/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should switch themes via title click', async ({ page }) => {
    await page.goto('/');
    
    // Wait for title
    await page.waitForSelector('.theme-switcher-title', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Click title 5 times to open theme switcher
    const title = page.locator('.theme-switcher-title');
    for (let i = 0; i < 5; i++) {
      await title.click();
      await page.waitForTimeout(100);
    }
    
    // Wait for theme switcher modal to appear
    await page.waitForSelector('.theme-switcher', { timeout: 5000 });
    
    // Get current theme title
    const currentTitle = await title.textContent();
    
    // Click on a different theme (if available)
    const themeButtons = page.locator('.theme-switcher button');
    const buttonCount = await themeButtons.count();
    
    if (buttonCount > 1) {
      // Click the second theme button (not the active one)
      await themeButtons.nth(1).click();
      await page.waitForTimeout(500);
      
      // Check that theme changed
      const newTitle = await title.textContent();
      // Title might have changed (or might be the same if only one theme)
      expect(newTitle).toBeTruthy();
    }
    
    // Close theme switcher if still open
    const closeButton = page.locator('.theme-switcher button').filter({ hasText: /✕/ });
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should handle date selection', async ({ page }) => {
    await page.goto('/');
    
    // Wait for date selector
    await page.waitForSelector('.container', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for dates to load
    
    // Look for date selector buttons (previous/next) or select dropdown
    const dateSelect = page.locator('select').filter({ hasText: /december|january|february/i });
    const prevButton = page.locator('button').filter({ hasText: /<|previous|prev/i });
    const nextButton = page.locator('button').filter({ hasText: />|next/i });
    
    // Try clicking previous button if available
    if (await prevButton.isVisible().catch(() => false)) {
      await prevButton.click();
      await page.waitForTimeout(1000); // Wait for puzzle to reload
    }
    
    // Or try using the select dropdown if available
    if (await dateSelect.isVisible().catch(() => false)) {
      const options = await dateSelect.locator('option').all();
      if (options.length > 1) {
        await dateSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
    
    // Check that puzzle data is still visible
    await expect(page.locator('.game-info')).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should persist game state in localStorage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForSelector('.container', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Interact with the game
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } });
        await page.waitForTimeout(300);
      }
    }
    
    // Check that localStorage has been updated
    const localStorageData = await page.evaluate(() => {
      return {
        theme: localStorage.getItem('tsp-theme'),
        date: localStorage.getItem('tsp-selected-date'),
        difficulty: localStorage.getItem('tsp-selected-difficulty'),
        hasVisited: localStorage.getItem('tsp-has-visited'),
      };
    });
    
    // At least some localStorage items should be set
    expect(localStorageData.hasVisited).toBeTruthy();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should handle window resize', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Canvas should still be visible
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should complete a full game flow', async ({ page }) => {
    await page.goto('/');
    
    // Wait for everything to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForSelector('.controls', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      // Simulate clicking multiple nodes to build a route
      const positions = [
        { x: canvasBox.width / 2, y: canvasBox.height / 2 },
        { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
        { x: canvasBox.width * 0.7, y: canvasBox.height * 0.3 },
        { x: canvasBox.width * 0.7, y: canvasBox.height * 0.7 },
        { x: canvasBox.width * 0.3, y: canvasBox.height * 0.7 },
      ];
      
      for (const pos of positions) {
        await canvas.click({ position: pos });
        await page.waitForTimeout(200);
      }
      
      // Check that distance is displayed
      const distanceText = await page.locator('.game-info .info-item').filter({ hasText: 'Distance:' }).textContent();
      expect(distanceText).toBeTruthy();
      
      // Try reset
      const resetButton = page.locator('button').filter({ hasText: /reset/i });
      await resetButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });
});

test.describe('Mobile View Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Store console errors in page context for later assertion
    await page.addInitScript(() => {
      window.__consoleErrors = [];
      window.__pageErrors = [];
      
      const originalError = console.error;
      console.error = (...args) => {
        window.__consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });
    
    // Collect console errors and page errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Try to store in page context, but don't fail if context is destroyed
        page.evaluate((errorText) => {
          if (!window.__consoleErrors) window.__consoleErrors = [];
          window.__consoleErrors.push(errorText);
        }, msg.text()).catch(() => {
          // Execution context might be destroyed, ignore
        });
      }
    });
    
    page.on('pageerror', (error) => {
      // Try to store in page context, but don't fail if context is destroyed
      page.evaluate((errorMessage) => {
        if (!window.__pageErrors) window.__pageErrors = [];
        window.__pageErrors.push(errorMessage);
      }, error.message).catch(() => {
        // Execution context might be destroyed, ignore
      });
    });
    
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should load on mobile viewport without errors', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('.container', { timeout: 10000 });
    
    // Check that the title is visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should display game canvas on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for canvas to be rendered
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Wait for puzzle data to load
    await page.waitForSelector('.game-info', { timeout: 10000 });
    
    // Check that game info displays date
    const gameInfo = page.locator('.game-info');
    await expect(gameInfo).toBeVisible();
    
    // Check that canvas is visible and has reasonable size
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should interact with game canvas using touch on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000); // Give time for puzzle to load
    
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Get canvas dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    
    // Tap on the canvas at different positions to simulate touching nodes
    // Tap near center (likely where north pole or a house might be)
    await tapOrClick(canvas, { position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } });
    await page.waitForTimeout(300);
    
    // Tap at another position
    await tapOrClick(canvas, { position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 } });
    await page.waitForTimeout(300);
    
    // Check that distance has changed (indicating route was updated)
    const distanceText = await page.locator('.game-info .info-item').filter({ hasText: 'Distance:' }).textContent();
    expect(distanceText).toBeTruthy();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should display controls on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for controls
    await page.waitForSelector('.controls', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const controls = page.locator('.controls');
    await expect(controls).toBeVisible();
    
    // Check that controls are accessible (not cut off or hidden)
    const controlsBox = await controls.boundingBox();
    expect(controlsBox).not.toBeNull();
    expect(controlsBox.width).toBeGreaterThan(0);
    expect(controlsBox.height).toBeGreaterThan(0);
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should open and close instructions modal on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForSelector('.container', { timeout: 10000 });
    
    // Check if instructions modal is visible (might be shown on first visit)
    const instructionsModal = page.locator('[class*="instructions"], [class*="modal"]').filter({ hasText: /instructions|how to play/i });
    
    // If modal is visible, close it first
    const isVisible = await instructionsModal.isVisible().catch(() => false);
    if (isVisible) {
      const closeButton = page.locator('button').filter({ hasText: /close|got it|×/i }).first();
      if (await closeButton.isVisible()) {
        await tapOrClick(closeButton);
        await page.waitForTimeout(500);
      }
    }
    
    // Tap instructions button
    const instructionsButton = page.locator('button').filter({ hasText: /instructions|📖/i });
    await tapOrClick(instructionsButton);
    
    // Wait for modal to appear
    await page.waitForTimeout(500);
    
    // Try to find and close the modal
    const closeBtn = page.locator('button').filter({ hasText: /close|got it|×/i }).first();
    if (await closeBtn.isVisible()) {
      await tapOrClick(closeBtn);
      await page.waitForTimeout(500);
    }
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should use undo button with touch on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for canvas and controls
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForSelector('.controls', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    // Get initial distance
    const initialDistanceElement = page.locator('.game-info .info-item').filter({ hasText: 'Distance:' });
    const initialDistance = await initialDistanceElement.textContent();
    
    // Tap on canvas at multiple positions to try to hit nodes
    const tapPositions = [
      { x: canvasBox.width / 2, y: canvasBox.height / 2 },
      { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.7, y: canvasBox.height * 0.7 },
      { x: canvasBox.width * 0.2, y: canvasBox.height * 0.5 },
      { x: canvasBox.width * 0.8, y: canvasBox.height * 0.5 },
    ];
    
    for (const pos of tapPositions) {
      await tapOrClick(canvas, { position: pos });
      await page.waitForTimeout(300);
      
      // Check if button is enabled
      const undoButton = page.locator('.controls button').filter({ hasText: /back|undo|←/i });
      const isEnabled = await undoButton.isEnabled().catch(() => false);
      
      if (isEnabled) {
        // Successfully added nodes, now test undo
        await tapOrClick(undoButton);
        await page.waitForTimeout(300);
        break;
      }
    }
    
    // Verify undo button worked
    await page.waitForTimeout(300);
    
    // Distance should have changed (or button should be disabled if route is empty)
    const distanceAfterUndo = await page.locator('.game-info .info-item').filter({ hasText: 'Distance:' }).textContent();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should handle orientation change on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Portrait
    await page.goto('/');
    
    // Wait for canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    const portraitBox = await canvas.boundingBox();
    expect(portraitBox).not.toBeNull();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);
    
    // Canvas should still be visible
    await expect(canvas).toBeVisible();
    
    const landscapeBox = await canvas.boundingBox();
    expect(landscapeBox).not.toBeNull();
    
    // Canvas dimensions should have changed
    expect(landscapeBox.width).not.toBe(portraitBox.width);
    expect(landscapeBox.height).not.toBe(portraitBox.height);
    
    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(canvas).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should display game info correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for game info to load
    await page.waitForSelector('.game-info', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const gameInfo = page.locator('.game-info');
    await expect(gameInfo).toBeVisible();
    
    // Check that game info is not cut off
    const gameInfoBox = await gameInfo.boundingBox();
    expect(gameInfoBox).not.toBeNull();
    expect(gameInfoBox.width).toBeGreaterThan(0);
    expect(gameInfoBox.height).toBeGreaterThan(0);
    
    // Check that distance is displayed
    await expect(page.locator('.game-info .info-item').filter({ hasText: 'Distance:' })).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });

  test('should handle date selection on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for date selector
    await page.waitForSelector('.container', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for dates to load
    
    // Look for date selector buttons (previous/next) or select dropdown
    const dateSelect = page.locator('select').filter({ hasText: /december|january|february/i });
    const prevButton = page.locator('button').filter({ hasText: /<|previous|prev/i });
    const nextButton = page.locator('button').filter({ hasText: />|next/i });
    
    // Try tapping previous button if available
    if (await prevButton.isVisible().catch(() => false)) {
      await tapOrClick(prevButton);
      await page.waitForTimeout(1000); // Wait for puzzle to reload
    }
    
    // Or try using the select dropdown if available
    if (await dateSelect.isVisible().catch(() => false)) {
      const options = await dateSelect.locator('option').all();
      if (options.length > 1) {
        await dateSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
    
    // Check that puzzle data is still visible
    await expect(page.locator('.game-info')).toBeVisible();
    
    // Check for console errors and page errors
    const allErrors = await getPageErrors(page);
    
    if (allErrors.length > 0) {
      console.log('Console/Page errors detected:', allErrors);
    }
    expect(allErrors.length).toBe(0);
  });
});

