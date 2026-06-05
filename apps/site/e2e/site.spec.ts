import { expect, test, type APIResponse } from '@playwright/test';

test('serves the official home and docs entry', async ({ request }) => {
  const home = await request.get('/');
  expect(home.ok()).toBe(true);
  await expectResponseToContain(home, ['svedocs', 'Read docs']);

  const docs = await request.get('/docs');
  expect(docs.ok()).toBe(true);
  await expectResponseToContain(docs, ['Quick Start', 'Create a site']);
});

async function expectResponseToContain(response: APIResponse, texts: string[]) {
  const body = await response.text();
  for (const text of texts) {
    expect(body).toContain(text);
  }
}
