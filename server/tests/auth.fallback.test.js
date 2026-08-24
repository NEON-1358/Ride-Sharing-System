const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { once } = require('node:events');

process.env.MONGO_URI = '';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { resetUserStore } = require('../src/utils/userStore');
const app = require('../src/app');

test('signup and login work without MongoDB by using the in-memory fallback store', async () => {
  resetUserStore();

  const server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    const signupResponse = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fallback User',
        email: 'fallback@example.com',
        password: 'password123',
      }),
    });

    assert.equal(signupResponse.status, 201);
    const signupBody = await signupResponse.json();
    assert.ok(signupBody.token);
    assert.equal(signupBody.user.email, 'fallback@example.com');

    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fallback@example.com',
        password: 'password123',
      }),
    });

    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.ok(loginBody.token);
    assert.equal(loginBody.user.email, 'fallback@example.com');
  } finally {
    server.close();
  }
});
