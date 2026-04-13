const assert = require('node:assert/strict');

const gatewayBaseUrl = process.env.API_GATEWAY_URL || 'http://127.0.0.1:3000';

async function requestJson(path, init) {
  const headers = new Headers(init?.headers || {});
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(`${gatewayBaseUrl}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json();
  return { response, payload };
}

function collectSetCookies(response) {
  const headerValue = response.headers.get('set-cookie');
  const getter = response.headers.getSetCookie;
  const parsed = typeof getter === 'function' ? getter.call(response.headers) : [];

  return [
    ...(Array.isArray(parsed) ? parsed : []),
    ...(typeof headerValue === 'string' && headerValue.trim().length > 0 ? [headerValue] : [])
  ];
}

async function run() {
  const summary = [];
  const stamp = Date.now();
  const email = `smoke.${stamp}@example.com`;
  const username = `smoke_${stamp}`;
  const password = 'SmokePass123!';

  const health = await requestJson('/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.intOpCode, 'GW_HEALTH_OK');
  summary.push('gateway health ok');

  const register = await requestJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, full_name: 'Smoke Test' }),
  });
  assert.equal(register.response.status, 201);
  assert.equal(register.payload.intOpCode, 'USR_REGISTER_OK');
  summary.push('register ok');

  const login = await requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.payload.intOpCode, 'USR_LOGIN_OK');
  assert.equal(typeof login.payload.data?.token, 'string');
  const token = login.payload.data.token;
  assert.ok(
    collectSetCookies(login.response).some((cookie) => cookie.includes('auth.token=')),
    'login should set an auth cookie'
  );
  summary.push('login ok');

  const logout = await requestJson('/auth/logout', {
    method: 'POST'
  });
  assert.equal(logout.response.status, 200);
  assert.equal(logout.payload.intOpCode, 'GW_LOGOUT_OK');
  assert.ok(
    collectSetCookies(logout.response).some((cookie) => cookie.includes('Max-Age=0')),
    'logout should clear the auth cookie'
  );
  summary.push('logout clears cookie');

  const ticketsWithoutAuth = await requestJson('/tickets');
  assert.equal(ticketsWithoutAuth.response.status, 401);
  assert.equal(ticketsWithoutAuth.payload.intOpCode, 'GW_AUTH_REQUIRED');
  summary.push('protected route blocks anonymous');

  const ticketsWithAuth = await requestJson('/tickets', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(ticketsWithAuth.response.status, 403);
  assert.equal(ticketsWithAuth.payload.intOpCode, 'GW_PERM_DENIED');
  summary.push('permission check enforced');

  console.log('Gateway smoke tests passed');
  summary.forEach((item) => console.log(`- ${item}`));
}

(async () => {
  try {
    await run();
  } catch (error) {
    console.error('Gateway smoke tests failed');
    console.error(error);
    process.exit(1);
  }
})();
