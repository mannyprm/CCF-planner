import { test, expect } from '@playwright/test';

test('login with email sets token and redirects', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Continue with Email/i }).click();
  await page.getByRole('textbox').fill('tester@ccf.org');
  await page.getByRole('button', { name: /^Continue$/ }).click();

  await page.waitForURL('/');
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  expect(token).toBeTruthy();
});

test('login with google stub works', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  await page.waitForURL('/');
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  expect(token).toBe('dev-google-token');
});

test('login shows correct logo for light/dark', async ({ browser }) => {
  // Light mode: default
  const contextLight = await browser.newContext();
  const pageLight = await contextLight.newPage();
  await pageLight.goto('/login');
  await expect(pageLight.getByTestId('logo-black')).toBeVisible();
  await expect(pageLight.getByTestId('logo-white')).toBeHidden();
  await contextLight.close();

  // Dark mode: add class before load
  const contextDark = await browser.newContext();
  const pageDark = await contextDark.newPage();
  await pageDark.addInitScript(() => {
    localStorage.setItem('ccf-theme', 'dark');
  });
  await pageDark.goto('/login');
  await expect(pageDark.getByTestId('logo-black')).toBeHidden();
  await expect(pageDark.getByTestId('logo-white')).toBeVisible();
  await contextDark.close();
});
