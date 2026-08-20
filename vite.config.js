import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base casa com o caminho do GitHub Pages: joao-vi.github.io/caderneta/
export default defineConfig({
  base: '/caderneta/',
  plugins: [react(), tailwindcss()],
});
