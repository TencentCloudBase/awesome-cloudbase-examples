import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	base: '/overcooked-game/', // 使用绝对路径，匹配云开发静态托管的部署路径

	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom'],
					phaser: ['phaser'],
				},
			},
		},
	},
	server: {
		host: '0.0.0.0',
		proxy: {
			'/__auth': {
				target: 'https://envId-appid.tcloudbaseapp.com/',
				changeOrigin: true,
			}
		},
		allowedHosts: true
	}
});
