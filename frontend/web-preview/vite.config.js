import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    root: './',
    build: { outDir: 'dist' },
    resolve: {
        alias: {
            '@assets': path.resolve(__dirname, '../assets'),
        }
    },
    server: {
        host: true, // expone el servidor en la red local (0.0.0.0)
        fs: {
            allow: ['..'] // permite acceder a archivos fuera del root (frontend/assets/)
        }
    }
});
