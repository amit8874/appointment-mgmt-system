import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Filter out benign websocket disconnect noise when client reloads or closes tab
const customLogger = createLogger();
const originalLoggerError = customLogger.error;
customLogger.error = (msg, options) => {
  if (
    typeof msg === 'string' &&
    (msg.includes('ECONNABORTED') || msg.includes('ECONNRESET') || msg.includes('EPIPE') || msg.includes('ws proxy socket error'))
  ) {
    return;
  }
  originalLoggerError(msg, options);
};

// https://vite.dev/config/
export default defineConfig({
  customLogger,
  plugins: [
    react(),tailwindcss(),
  ],
  server: {
    historyApiFallback: true,
    host: true,
    allowedHosts: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err.code)) return;
            console.log('proxy error', err);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err.code)) return;
            });
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-toastify'],
          'vendor-utils': ['axios', 'date-fns', 'socket.io-client'],
          'charts': ['recharts'],
          'redux-store': ['@reduxjs/toolkit', 'react-redux'],
        }
      }
    }
  }
})
