import {defineConfig} from 'vite';
export default defineConfig({
  build: {
    rollupOptions: {
      input: {home: 'index.html', level: 'level.html'},
      output: {
        manualChunks(id) {
          const pilot = id.match(/\/content\/([a-z]+-pilots)/);
          if (pilot) return pilot[1];
          const tpl = id.match(/\/src\/templates\/(february|march|april|may|june|july|august|september|october|november|december)-(defense|match|skirmish|rpg)/);
          if (tpl) return `${tpl[1]}-${tpl[2]}`;
        },
      },
    },
  },
});
