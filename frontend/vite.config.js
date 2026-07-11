import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '127.0.0.1',   // Chi dung IPv4, tranh browser tu chuyen sang [::1]
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
                timeout: 60000,         // 60 giay — Gemini co the cham
                proxyTimeout: 60000,
                configure: (proxy) => {
                    proxy.on('error', (err) => {
                        // Im lang loi ECONNRESET thuong gap khi backend restart
                        if (err.code !== 'ECONNRESET') {
                            console.error('[proxy error]', err.code, err.message);
                        }
                    });
                },
            },
        },
    },
});
