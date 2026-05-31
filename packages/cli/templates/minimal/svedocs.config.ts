import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'svedocs minimal',
    title: 'svedocs minimal',
    description: 'A minimal documentation site powered by svedocs.'
  },
  theme: {
    palette: {
      // Try "sky", "indigo", "rose", "amber", or any CSS color.
      accent: 'emerald'
    }
  },
  ai: false
});
