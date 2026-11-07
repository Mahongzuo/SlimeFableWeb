import {defineConfig} from 'vite';
export default defineConfig({build: {rollupOptions: {input: {home: 'index.html', level: 'level.html'}}}});
