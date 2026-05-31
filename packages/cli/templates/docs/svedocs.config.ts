import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  theme: {
    palette: {
      // Try "sky", "indigo", "rose", "amber", or any CSS color.
      accent: 'emerald'
    }
  },
  source: {
    editBaseUrl: 'https://github.com/acme/my-docs/edit/main'
  }
});
