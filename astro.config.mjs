import { defineConfig } from 'astro/config';

// Sitio estático para lab.aulamarketing.digital (subdominio servido desde public_html/lab).
export default defineConfig({
  site: 'https://lab.aulamarketing.digital',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', assets: '_astro' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
