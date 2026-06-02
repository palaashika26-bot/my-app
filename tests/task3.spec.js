const { test, expect } = require('@playwright/test');

test('Catalog → create sourcing request appears for client and admin', async ({ page }) => {
  // API-only flow: login as client, create a CUSTOM sourcing request, verify via client & admin APIs
  const loginResp = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'client1@elios.in', password: 'Demo@1234' }),
  });
  expect(loginResp.status()).toBe(200);
  const loginJson = await loginResp.json();
  const clientToken = loginJson?.data?.accessToken;
  expect(clientToken).toBeTruthy();

  // Create a custom sourcing request (no productId required)
  const payload = {
    notes: 'E2E test request',
    items: [
      { type: 'CUSTOM', productName: 'Playwright Test Item', quantity: 10, unit: 'PCS' },
    ],
  };

  const createResp = await page.request.post('http://localhost:4000/api/v1/requests', {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
    data: JSON.stringify(payload),
  });
  expect(createResp.status()).toBe(201);
  const createJson = await createResp.json();
  const created = createJson?.data;
  expect(created).toBeTruthy();
  const requestId = created.id;
  const requestNumber = created.requestNumber;

  // Confirm client can GET their request
  const clientGet = await page.request.get('http://localhost:4000/api/v1/requests', {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  expect(clientGet.status()).toBe(200);
  const clientList = (await clientGet.json())?.data || [];
  expect(clientList.find((r) => r.id === requestId)).toBeTruthy();

  // Login as admin and confirm request is visible
  const adminLogin = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'admin@elios.in', password: 'Demo@1234' }),
  });
  expect(adminLogin.status()).toBe(200);
  const adminJson = await adminLogin.json();
  const adminToken = adminJson?.data?.accessToken;

  const getResp = await page.request.get(`http://localhost:4000/api/v1/requests/${requestId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(getResp.status()).toBe(200);
  const getJson = await getResp.json();
  expect(getJson?.data?.id).toBe(requestId);
});
