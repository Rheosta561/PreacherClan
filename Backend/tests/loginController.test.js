const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailService = require('../Utils/emailService');
const User = require('../Models/User');

const previousAccessSecret = process.env.ACCESS_TOKEN_SECRET;
const previousRefreshSecret = process.env.REFRESH_TOKEN_SECRET;
process.env.ACCESS_TOKEN_SECRET = 'login-controller-test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'login-controller-test-refresh-secret';

const loginController = require('../Controllers/loginController');

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

test('email login greets the user by name and returns usable scoped tokens without the password hash', async (t) => {
  const user = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    name: 'Test User',
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
  let sentEmail;
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(bcrypt, 'compare', async () => true);
  t.mock.method(emailService, 'sendEmail', async (message) => {
    sentEmail = message;
  });

  const response = createResponse();
  await loginController.login(
    {
      body: { email: 'test@example.com', password: 'correct-password' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      useragent: { platform: 'test', browser: 'test' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.message, 'Access Granted');
  assert.match(sentEmail.html, /Hi Test User,/);
  assert.doesNotMatch(sentEmail.html, /Hi undefined,/);
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

test('signup welcome email greets the user by their display name', async (t) => {
  const user = {
    _id: { toString: () => '507f1f77bcf86cd799439012' },
    name: 'New Member',
    username: 'new-member',
    email: 'new@example.com',
    toObject() {
      return { ...this };
    },
  };
  let sentEmail;
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'create', async () => user);
  t.mock.method(bcrypt, 'hash', async () => 'hashed-password');
  t.mock.method(emailService, 'sendEmail', async (message) => {
    sentEmail = message;
  });

  const response = createResponse();
  await loginController.signUp(
    {
      body: {
        name: 'New Member',
        email: 'new@example.com',
        username: 'new-member',
        password: 'correct-password',
      },
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.match(sentEmail.html, /Hi New Member,/);
  assert.doesNotMatch(sentEmail.html, /Hi undefined,/);
});

test('invalid password does not return access or refresh tokens', async (t) => {
  t.mock.method(User, 'findOne', async () => ({
    password: 'hashed-password',
  }));
  t.mock.method(bcrypt, 'compare', async () => false);
  t.mock.method(emailService, 'sendEmail', async () => undefined);

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

test('password reset emails a generated temporary password without revealing account existence', async (t) => {
  const user = {
    email: 'test@example.com',
    password: 'old-hash',
    async save() {},
  };
  let sentEmail;
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(emailService, 'sendEmail', async (message) => {
    sentEmail = message;
  });

  const response = createResponse();
  await loginController.resetPassword({ body: { email: ' TEST@example.com ' } }, response);

  assert.equal(response.statusCode, 200);
  assert.match(response.body.message, /If an account exists/);
  assert.equal(sentEmail.to, user.email);
  const temporaryPassword = sentEmail.text.match(/is: (.+)\n/)[1];
  assert.ok(await bcrypt.compare(temporaryPassword, user.password));
  assert.notEqual(user.password, 'old-hash');
});

test('password reset rolls back the password hash when email delivery fails', async (t) => {
  const user = {
    email: 'test@example.com',
    password: 'old-hash',
    saveCount: 0,
    async save() {
      this.saveCount += 1;
    },
  };
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(emailService, 'sendEmail', async () => {
    throw new Error('provider unavailable');
  });

  const response = createResponse();
  await loginController.resetPassword({ body: { email: user.email } }, response);

  assert.equal(response.statusCode, 500);
  assert.equal(user.password, 'old-hash');
  assert.equal(user.saveCount, 2);
});
