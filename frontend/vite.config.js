import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',   // слушаем на всех интерфейсах — для доступа по LAN
        port: 3000,
        proxy: {
            // Все /api запросы уходят на бэкенд
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            // Загруженные файлы тоже через бэкенд
            '/uploads': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
});
