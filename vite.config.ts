import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base =
  process.env.VITE_BASE_PATH ||
  (process.env.NODE_ENV === 'development' ? '/' : '/seishokasho/')

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
