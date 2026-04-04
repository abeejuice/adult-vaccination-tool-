import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 6144, // inline assets ≤6KB as base64 (covers both SVG logos)
  },
})
