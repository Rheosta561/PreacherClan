const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../Models/User');

const previousAccessSecret = process.env.ACCESS_TOKEN_SECRET;
const previousRefreshSecret = process.env.REFRESH_TOKEN_SECRET;
process.env.ACCESS_TOKEN_SECRET = 'login-controller-test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'login-controller-test-refresh-secret';

const originalCreateTransport = nodemailer.createTransport;
nodemailer.createTransport = () => ({ sendMail: async () => undefined });
const loginController = require('../Controllers/loginController');
nodemailer.createTransport = originalCreateTransport;

test.after(() => {
  if (previousAccessSecret === undefined) {
    delete process.env.ACCESS_TOKEN_SECRET;
  } else {
    process.env.ACCESS_TOKEN_SECRET = previousAccessSecret;
  }

  if (previousRefreshSecret === undefined) {
    delete process.env.REFRESH_TOKEN_SECRET;
  } else {
    process.env.REFRESH_TOKEN_SECRET = previousRefreshSecret;
  }
});

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('successful username/password login returns usable scoped tokens without the password hash', async (t) => {
  const user = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    username: 'test-user',
    email: 'test@example.com',
    password: 'hashed-password',
    toObject() {
      return {
        _id: this._id,
        username: this.username,
        email: this.email,
        password: this.password,
      };
    },
  };
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(bcrypt, 'compare', async () => true);

  const response = createResponse();
  await loginController.login(
    {
      body: { username: 'test-user', password: 'correct-password' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      useragent: { platform: 'test', browser: 'test' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.message, 'Access Granted');
  assert.equal('password' in response.body.user, false);

  const claims = jwt.verify(
    response.body.accessToken,
    process.env.ACCESS_TOKEN_SECRET
  );
  assert.equal(claims.sub, '507f1f77bcf86cd799439011');
  assert.equal(claims.role, 'user');
  assert.equal(claims.type, 'access');
  assert.deepEqual(claims.scope, ['mcp:write:split']);

  const refreshClaims = jwt.verify(
    response.body.refreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  assert.equal(refreshClaims.type, 'refresh');
});

test('invalid password does not return access or refresh tokens', async (t) => {
  t.mock.method(User, 'findOne', async () => ({
    password: 'hashed-password',
  }));
  t.mock.method(bcrypt, 'compare', async () => false);

  const response = createResponse();
  await loginController.login(
    {
      body: { username: 'test-user', password: 'wrong-password' },
    },
    response
  );

  assert.equal(response.statusCode, 401);
  assert.equal('accessToken' in response.body, false);
  assert.equal('refreshToken' in response.body, false);
});
