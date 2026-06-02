const { test, expect } = require('@playwright/test');

test('Orders page shows skeleton and no empty-state flash', async ({ page }) => {
  // Delay server response slightly to simulate slow network and trigger loader
  await page.route('**/api/v1/orders*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  // Authenticate via backend API to avoid UI flakiness
  const loginResp = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'client1@elios.in', password: 'Demo@1234' }),
  });
  if (loginResp.status() !== 200) throw new Error('Login API failed');
  const loginJson = await loginResp.json();
  const accessToken = loginJson?.data?.accessToken;

  // Extract refresh cookie from headers and set it in the browser context
  const setCookie = loginResp.headers()['set-cookie'] || loginResp.headers()['Set-Cookie'];
  let refreshTokenValue = '';
  if (setCookie) {
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    refreshTokenValue = raw.split(';')[0].split('=')[1] || '';
  }
  if (!refreshTokenValue) throw new Error('No refresh token in login response');

  await page.context().addCookies([
    { name: 'refreshToken', value: refreshTokenValue, domain: 'localhost', path: '/', httpOnly: true },
  ]);

  // Ensure access token is present in localStorage before navigation
  await page.addInitScript((token) => {
    window.localStorage.setItem('elios_access_token', token);
  }, accessToken);

  await page.goto('http://localhost:3000/client-dashboard/orders');

  // Skeleton should be visible while loading and empty-state should NOT flash
  await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=No orders match your filters.')).not.toBeVisible();

  // After load finishes, table rows should appear
  await page.waitForSelector('table tbody tr', { timeout: 7000 });
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeGreaterThan(0);
});

test('Requests page shows skeleton and no empty-state flash', async ({ page }) => {
  await page.route('**/api/v1/requests*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  // Authenticate via backend API to avoid UI flakiness
  const loginResp2 = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'client1@elios.in', password: 'Demo@1234' }),
  });
  if (loginResp2.status() !== 200) throw new Error('Login API failed');
  const loginJson2 = await loginResp2.json();
  const accessToken2 = loginJson2?.data?.accessToken;
  const setCookie2 = loginResp2.headers()['set-cookie'] || loginResp2.headers()['Set-Cookie'];
  let refreshTokenValue2 = '';
  if (setCookie2) {
    const raw = Array.isArray(setCookie2) ? setCookie2[0] : setCookie2;
    refreshTokenValue2 = raw.split(';')[0].split('=')[1] || '';
  }
  if (!refreshTokenValue2) throw new Error('No refresh token in login response');

  await page.context().addCookies([
    { name: 'refreshToken', value: refreshTokenValue2, domain: 'localhost', path: '/', httpOnly: true },
  ]);
  await page.addInitScript((token) => {
    window.localStorage.setItem('elios_access_token', token);
  }, accessToken2);

  await page.goto('http://localhost:3000/client-dashboard/requests');

  await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=No requests in this filter.')).not.toBeVisible();

  await page.waitForSelector('table tbody tr', { timeout: 7000 });
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeGreaterThan(0);
});
