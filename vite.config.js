import { defineConfig } from 'vite';

// GitHub Pages alt klasörde yayınlar (/wonderful-yapi-yeni-site/); yerelde kök (/) kullanılır.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
});
