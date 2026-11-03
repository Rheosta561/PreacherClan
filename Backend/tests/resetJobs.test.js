const assert = require('node:assert/strict');
const test = require('node:test');
const { sendWeeklyWorkoutUpdates } = require('../Utils/resetJobs');

test('weekly update resets the count, saves a notification, emits it, and emails the user', async () => {
  const user = {
    _id: { toString: () => '507f1f77bcf86cd799439014' },
    name: 'Test Warrior',
    email: 'warrior@example.com',
    workoutHitsPerWeek: 4,
    async save() { this.saved = true; },
  };
  const notifications = [];
  const emails = [];
  const events = [];

  const result = await sendWeeklyWorkoutUpdates([user], {
    NotificationModel: { create: async (data) => { const record = { _id: 'notification-1', ...data }; notifications.push(record); return record; } },
    sendEmail: async (email) => { emails.push(email); },
    onlineUsers: new Map([[user._id.toString(), 'socket-1']]),
    io: { to: (socketId) => ({ emit: (event, notification) => events.push({ socketId, event, notification }) }) },
  });

  assert.equal(result.users, 1);
  assert.equal(result.emailFailures, 0);
  assert.equal(user.workoutHitsPerWeek, 0);
  assert.equal(user.saved, true);
  assert.equal(notifications[0].userId, user._id);
  assert.match(notifications[0].message, /4 workout check-ins/);
  assert.equal(events[0].event, 'notification');
  assert.equal(emails[0].to, user.email);
  assert.match(emails[0].html, /4<\/strong> workout check-ins/);
});

test('weekly email failure is counted without aborting other users', async () => {
  const users = ['a@example.com', 'b@example.com'].map((email, index) => ({
    _id: { toString: () => `user-${index}` },
    email,
    workoutHitsPerWeek: index + 1,
    async save() {},
  }));
  let attempt = 0;
  const result = await sendWeeklyWorkoutUpdates(users, {
    NotificationModel: { create: async (data) => data },
    sendEmail: async () => { attempt += 1; if (attempt === 1) throw new Error('provider unavailable'); },
    onlineUsers: new Map(),
    io: null,
  });

  assert.equal(result.users, 2);
  assert.equal(result.emailFailures, 1);
  assert.equal(attempt, 2);
});
