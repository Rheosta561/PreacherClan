const { validationResult } = require("express-validator");
const {
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
} = require("../Services/gymAuthService");
const env = require("../config/env");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const buildValidationError = (req) => {
  const errors = validationResult(req).array();
  return new AppError("Validation failed", 422, errors);
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(env.refreshCookie.name, refreshToken, getRefreshCookieOptions());
};

const setAccessCookie = (res, accessToken) => {
  res.cookie(env.accessCookie.name, accessToken, getAccessCookieOptions());
};

const register = asyncHandler(async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    throw buildValidationError(req);
  }

  const result = await registerGym(req.body, req);
  setAccessCookie(res, result.accessToken);
  setRefreshCookie(res, result.refreshToken);

  return res.status(201).json({
    message: "Gym registered successfully",
    accessToken: result.accessToken,
    gym: result.gym,
  });
});

const login = asyncHandler(async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    throw buildValidationError(req);
  }

  const result = await loginGym(req.body, req);
  setAccessCookie(res, result.accessToken);
  setRefreshCookie(res, result.refreshToken);

  return res.status(200).json({
    message: "Gym login successful",
    accessToken: result.accessToken,
    gym: result.gym,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.refreshCookie.name];
  if (!refreshToken) {
    throw new AppError("Refresh token missing", 401);
  }

  const result = await refreshGymSession(refreshToken, req);
  setAccessCookie(res, result.accessToken);
  setRefreshCookie(res, result.refreshToken);

  return res.status(200).json({
    message: "Token refreshed successfully",
    accessToken: result.accessToken,
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.refreshCookie.name];
  await logoutGym(req.gym?.id, refreshToken);
  clearAccessCookie(res);
  clearRefreshCookie(res);

  return res.status(200).json({
    message: "Gym logged out successfully",
  });
});

const logoutAll = asyncHandler(async (req, res) => {
  await logoutGymFromAllDevices(req.gym.id);
  clearAccessCookie(res);
  clearRefreshCookie(res);

  return res.status(200).json({
    message: "Gym logged out from all devices",
  });
});

const me = asyncHandler(async (req, res) => {
  const gym = await getCurrentGym(req.gym.id);

  return res.status(200).json({
    gym,
  });
});

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const response = {
    message: err.message || "Internal server error",
  };

  if (err.details) {
    response.errors = err.details;
  }

  if (!env.isProduction && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  errorHandler,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
};
