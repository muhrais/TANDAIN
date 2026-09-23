import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Biar frontend & backend satu origin lewat tunnel (ngrok dll) — hindari
    // masalah CORS dan localhost:3000 yang salah target pas dibuka dari HP.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    // Terima request dari host manapun (perlu buat tunnel seperti ngrok,
    // yang Host header-nya bukan localhost). Cuma buat dev lokal.
    allowedHosts: true,
  },
})
