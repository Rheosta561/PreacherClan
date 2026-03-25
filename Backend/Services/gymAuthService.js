const Gym = require("../Models/GymSchema");
const env = require("../config/env");
const { hashValue } = require("../Utils/hash");
const {
  createSessionId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../Utils/jwt");

class AppError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}

const getRequestMeta = (req) => ({
  ip: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .toString()
    .split(",")[0]
    .trim(),
  userAgent: req.get("user-agent") || "unknown",
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.refreshCookie.secure,
  sameSite: env.refreshCookie.sameSite,
  path: env.refreshCookie.path,
  maxAge: env.refreshCookie.maxAge,
  ...(env.refreshCookie.domain ? { domain: env.refreshCookie.domain } : {}),
});

const getAccessCookieOptions = () => ({
  httpOnly: true,
  secure: env.accessCookie.secure,
  sameSite: env.accessCookie.sameSite,
  path: env.accessCookie.path,
  ...(env.accessCookie.domain ? { domain: env.accessCookie.domain } : {}),
});

const clearAccessCookie = (res) => {
  res.clearCookie(env.accessCookie.name, {
    httpOnly: true,
    secure: env.accessCookie.secure,
    sameSite: env.accessCookie.sameSite,
    path: env.accessCookie.path,
    ...(env.accessCookie.domain ? { domain: env.accessCookie.domain } : {}),
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(env.refreshCookie.name, {
    httpOnly: true,
    secure: env.refreshCookie.secure,
    sameSite: env.refreshCookie.sameSite,
    path: env.refreshCookie.path,
    ...(env.refreshCookie.domain ? { domain: env.refreshCookie.domain } : {}),
  });
};

const sanitizeGym = (gym) => {
  if (typeof gym.toSafeObject === "function") {
    return gym.toSafeObject();
  }

  const gymObject = gym.toObject({ versionKey: false });
  delete gymObject.password;
  delete gymObject.refreshTokenHash;
  delete gymObject.refreshSessions;
  return gymObject;
};

const createTokenPairForGym = async (gym, req) => {
  const sessionId = createSessionId();
  const refreshToken = signRefreshToken({ gymId: gym._id, sessionId });
  const accessToken = signAccessToken({ gymId: gym._id, username: gym.username });
  const decodedRefresh = verifyRefreshToken(refreshToken);
  const requestMeta = getRequestMeta(req);

  const session = {
    sessionId,
    tokenHash: hashValue(refreshToken),
    expiresAt: new Date(decodedRefresh.exp * 1000),
    createdAt: new Date(),
    lastUsedAt: new Date(),
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent,
  };

  const activeSessions = (gym.refreshSessions || []).filter(
    (item) => item.expiresAt > new Date()
  );
  activeSessions.push(session);

  if (activeSessions.length > env.refreshSessionLimit) {
    activeSessions.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
  }

  gym.refreshSessions = activeSessions.slice(0, env.refreshSessionLimit);
  gym.refreshTokenHash = session.tokenHash;

  return { accessToken, refreshToken };
};

const registerGym = async (payload, req) => {
  const existingGym = await Gym.findOne({
    $or: [{ username: payload.username.toLowerCase() }, { gymCode: payload.gymCode.toUpperCase() }],
  });

  if (existingGym) {
    if (existingGym.username === payload.username.toLowerCase()) {
      throw new AppError("Username already exists", 409);
    }

    throw new AppError("Gym code already exists", 409);
  }

  const gym = new Gym({
    ...payload,
    username: payload.username.toLowerCase(),
    gymCode: payload.gymCode.toUpperCase(),
    memberSince: payload.memberSince || new Date(),
  });

  const tokens = await createTokenPairForGym(gym, req);
  gym.lastLoginAt = new Date();
  await gym.save();

  return {
    gym: sanitizeGym(gym),
    ...tokens,
  };
};

const loginGym = async ({ username, password }, req) => {
  const gym = await Gym.findOne({ username: username.toLowerCase() })
    .select("+password +refreshSessions +refreshTokenHash");

  if (!gym) {
    throw new AppError("Invalid username or password", 401);
  }

  if (!gym.isActive) {
    throw new AppError("Gym account is inactive", 403);
  }

  const passwordMatches = await gym.comparePassword(password);
  if (!passwordMatches) {
    throw new AppError("Invalid username or password", 401);
  }

  const tokens = await createTokenPairForGym(gym, req);
  gym.lastLoginAt = new Date();
  await gym.save();

  return {
    gym: sanitizeGym(gym),
    ...tokens,
  };
};

const refreshGymSession = async (refreshToken, req) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const gym = await Gym.findById(decoded.sub).select("+refreshSessions +refreshTokenHash");
  if (!gym || !gym.isActive) {
    throw new AppError("Gym account not available", 401);
  }

  const sessionIndex = (gym.refreshSessions || []).findIndex(
    (session) => session.sessionId === decoded.sid
  );

  if (sessionIndex === -1) {
    throw new AppError("Refresh session not found", 401);
  }

  const existingSession = gym.refreshSessions[sessionIndex];
  if (
    existingSession.tokenHash !== hashValue(refreshToken) ||
    existingSession.expiresAt <= new Date()
  ) {
    gym.refreshSessions = [];
    gym.refreshTokenHash = undefined;
    await gym.save();
    throw new AppError("Refresh token reuse detected", 401);
  }

  gym.refreshSessions.splice(sessionIndex, 1);
  const tokens = await createTokenPairForGym(gym, req);
  await gym.save();

  return {
    gym: sanitizeGym(gym),
    ...tokens,
  };
};

const logoutGym = async (gymId, refreshToken) => {
  if (!refreshToken) {
    return;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    return;
  }

  if (gymId && String(decoded.sub) !== String(gymId)) {
    return;
  }

  const gym = await Gym.findById(decoded.sub).select("+refreshSessions +refreshTokenHash");
  if (!gym) {
    return;
  }

  gym.refreshSessions = (gym.refreshSessions || []).filter(
    (session) => session.sessionId !== decoded.sid
  );
  gym.refreshTokenHash =
    gym.refreshSessions.length > 0
      ? gym.refreshSessions[gym.refreshSessions.length - 1].tokenHash
      : undefined;

  await gym.save();
};

const logoutGymFromAllDevices = async (gymId) => {
  const gym = await Gym.findById(gymId).select("+refreshSessions +refreshTokenHash");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  gym.refreshSessions = [];
  gym.refreshTokenHash = undefined;
  await gym.save();
};

const getCurrentGym = async (gymId) => {
  const gym = await Gym.findById(gymId);
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  if (!gym.isActive) {
    throw new AppError("Gym account is inactive", 403);
  }

  return sanitizeGym(gym);
};

module.exports = {
  AppError,
  clearAccessCookie,
  clearRefreshCookie,
  getAccessCookieOptions,
  getCurrentGym,
  getRefreshCookieOptions,
  loginGym,
  logoutGym,
  logoutGymFromAllDevices,
  refreshGymSession,
  registerGym,
};
