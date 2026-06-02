const { test, expect } = require('@playwright/test');

test('Staff quotation is visible to client (API-level)', async ({ page }) => {
  // Client login (API)
  const loginResp = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'client1@elios.in', password: 'Demo@1234' }),
  });
  expect(loginResp.status()).toBe(200);
  const loginJson = await loginResp.json();
  const clientToken = loginJson?.data?.accessToken;
  expect(clientToken).toBeTruthy();

  // Create a simple custom sourcing request
  const createResp = await page.request.post('http://localhost:4000/api/v1/requests', {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
    data: JSON.stringify({
      notes: 'Quotation visibility smoke test',
      items: [ { type: 'CUSTOM', productName: 'SmokeTest Item', quantity: 3, unit: 'PCS' } ],
    }),
  });
  expect(createResp.status()).toBe(201);
  const createJson = await createResp.json();
  const request = createJson?.data;
  expect(request).toBeTruthy();
  const requestId = request.id;
  const itemId = request.items?.[0]?.id;
  expect(requestId).toBeTruthy();
  expect(itemId).toBeTruthy();

  // Staff/admin login (API)
  const adminLogin = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: 'admin@elios.in', password: 'Demo@1234' }),
  });
  expect(adminLogin.status()).toBe(200);
  const adminJson = await adminLogin.json();
  const adminToken = adminJson?.data?.accessToken;
  expect(adminToken).toBeTruthy();

  // Staff sends quotation for the created request
  const sendResp = await page.request.post(`http://localhost:4000/api/v1/requests/${requestId}/quotation`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    data: JSON.stringify({ items: [ { id: itemId, quotedRMB: 12 } ], staffNotes: 'Smoke test quote', advanceAmountINR: 500 }),
  });
  expect(sendResp.status()).toBe(200);

  // Client fetch the request — should see quoted fields and request status QUOTED
  const clientGet = await page.request.get(`http://localhost:4000/api/v1/requests/${requestId}`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  expect(clientGet.status()).toBe(200);
  const clientJson = await clientGet.json();
  const updated = clientJson?.data;
  expect(updated).toBeTruthy();
  expect(updated.status).toBe('QUOTED');
  expect(parseFloat(updated.items?.[0]?.quotedRMB)).toBeCloseTo(12);
  expect(parseFloat(updated.items?.[0]?.quotedINR)).toBeGreaterThan(0);
});
