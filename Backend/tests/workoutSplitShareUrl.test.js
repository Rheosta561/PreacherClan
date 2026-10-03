const assert = require("node:assert/strict");
const test = require("node:test");
const { getFrontendBaseUrl } = require("../Controllers/workoutSplitController");

test("share links use the configured frontend URL without a trailing slash", () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousClientOrigin = process.env.CLIENT_ORIGIN;
  process.env.FRONTEND_URL = "https://www.preacherclan.in/";
  process.env.CLIENT_ORIGIN = "http://localhost:3001";

  try {
    assert.equal(getFrontendBaseUrl(), "https://www.preacherclan.in");
  } finally {
    if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousFrontendUrl;
    if (previousClientOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = previousClientOrigin;
  }
});

test("share links fall back to the frontend client origin and production site", () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousClientOrigin = process.env.CLIENT_ORIGIN;
  delete process.env.FRONTEND_URL;

  try {
    process.env.CLIENT_ORIGIN = "http://localhost:3001,http://localhost:3002";
    assert.equal(getFrontendBaseUrl(), "http://localhost:3001");

    delete process.env.CLIENT_ORIGIN;
    assert.equal(getFrontendBaseUrl(), "https://preacherclan.in");
  } finally {
    if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousFrontendUrl;
    if (previousClientOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = previousClientOrigin;
  }
});
