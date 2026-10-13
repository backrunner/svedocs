import { expect, test } from '@playwright/test';

test('renders citations from current Cloudflare chunk-array events', async ({ page }) => {
  await page.route('**/api/ask*', (route) => route.fulfill({
    contentType: 'text/event-stream',
    body: 'event: chunks\ndata: [{"item":{"metadata":{"svedocs":"{\\"title\\":\\"Configuration\\",\\"url\\":\\"/docs/configuration\\"}"}}}]\n\n'
      + 'data: {"choices":[{"delta":{"content":"Configure your site in svedocs.config.ts."}}]}\n\n'
      + 'data: [DONE]\n\n'
  }));
  await page.goto('/docs');
  const panel = page.getByRole('dialog', { name: 'Ask AI' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Ask AI' }).click();
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 8_000 });
  await panel.getByRole('textbox', { name: 'Ask anything about svedocs' }).fill('How do I configure my site?');
  await panel.getByRole('button', { name: 'Send' }).click();
  await expect(panel.getByText('Configure your site in svedocs.config.ts.')).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Configuration' })).toHaveAttribute('href', '/docs/configuration');
  await panel.getByRole('link', { name: 'Configuration' }).click();
  await expect(page).toHaveURL(/\/docs\/configuration$/);
});
