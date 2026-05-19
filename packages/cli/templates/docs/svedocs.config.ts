import { defineConfig } from 'svedocs/config';

export default defineConfig({
  site: {
    name: 'My docs',
    title: 'My docs',
    description: 'Documentation built with svedocs'
  },
  source: {
    editBaseUrl: 'https://github.com/acme/my-docs/edit/main'
  }
});
