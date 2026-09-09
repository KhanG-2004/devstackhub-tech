import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://devstackhub.tech',
  trailingSlash: 'always',
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin/'),
    }),
    mdx(),
  ],
});