import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Plugin to copy puzzles folder to dist
function copyPuzzlesPlugin() {
  return {
    name: 'copy-puzzles',
    closeBundle() {
      const puzzlesSrc = join(process.cwd(), 'puzzles')
      const puzzlesDest = join(process.cwd(), 'dist', 'puzzles')
      
      function copyRecursive(src, dest) {
        mkdirSync(dest, { recursive: true })
        const entries = readdirSync(src)
        
        for (const entry of entries) {
          const srcPath = join(src, entry)
          const destPath = join(dest, entry)
          const stat = statSync(srcPath)
          
          if (stat.isDirectory()) {
            copyRecursive(srcPath, destPath)
          } else {
            copyFileSync(srcPath, destPath)
          }
        }
      }
      
      try {
        copyRecursive(puzzlesSrc, puzzlesDest)
        console.log('✓ Copied puzzles folder to dist')
      } catch (error) {
        console.error('Error copying puzzles:', error)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/tourle/',
  plugins: [react(), copyPuzzlesPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
})
