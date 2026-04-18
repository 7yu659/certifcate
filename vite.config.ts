import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/certifcate/', // Ensures assets load correctly on GitHub pages subdirectories
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
})
