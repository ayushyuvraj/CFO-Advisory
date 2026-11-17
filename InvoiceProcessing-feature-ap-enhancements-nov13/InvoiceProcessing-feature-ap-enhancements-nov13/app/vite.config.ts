import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend (FastAPI) runs on :8000. Proxying /api keeps the browser on one
// origin, so no CORS and the same relative URLs work behind a load balancer.
// On Cloud Run the frontend service runs `vite preview` and VITE_API_TARGET is
// the backend service's URL (cloudrun-frontend.env.yaml).
const API = process.env.VITE_API_TARGET ?? 'http://localhost:8000'

// Invoice processing and Zoho posting can take a while — match Cloud Run's 900 s.
const proxy = { '/api': { target: API, changeOrigin: true, timeout: 900_000, proxyTimeout: 900_000 } }

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy,
  },
  preview: {
    // Cloud Run tells the container which port to listen on.
    port: Number(process.env.PORT) || 4173,
    // Cloud Run serves the app on *.run.app; vite refuses unknown host names otherwise.
    allowedHosts: ['.run.app', 'localhost', '127.0.0.1'],
    proxy,
  },
})
