const dotenv = require("dotenv");

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const required = [
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`Missing required env vars: ${missing.join(", ")}`);
}

const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "",
  process.env.MCP_ALLOWED_ORIGINS || "",
]
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (isProduction) return false;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch (error) {
    return false;
  }
};

const env = {
  nodeEnv,
  isProduction,
  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || "30d",
  },
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  accessCookie: {
    name: process.env.GYM_ACCESS_COOKIE_NAME || "gymAccessToken",
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  },
  refreshCookie: {
    name: process.env.GYM_REFRESH_COOKIE_NAME || "gymRefreshToken",
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/gym-auth",
    maxAge: toNumber(process.env.REFRESH_COOKIE_MAX_AGE_MS, 30 * 24 * 60 * 60 * 1000),
  },
  refreshSessionLimit: toNumber(process.env.GYM_REFRESH_SESSION_LIMIT, 5),
  isOriginAllowed,
  cors: {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, false);
      }

      if (isOriginAllowed(origin)) {
        return callback(null, origin);
      }

      return callback(null, false);
    },
  },
};

module.exports = env;
