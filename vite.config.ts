import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      // Rutas relativas: funciona en GitHub Pages con cualquier nombre de repositorio.
      base: mode === 'production' ? './' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Sello de versión visible en el pie de página: commit y fecha de compilación (UTC).
      define: {
        __BUILD_ID__: JSON.stringify(`${(process.env.GITHUB_SHA || 'local').slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
