const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  domain: process.env.COOKIE_DOMAIN || undefined,
};

exports.setAccessCookie = (res, accessToken) => {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
};

exports.clearAccessCookie = (res) => {
  res.clearCookie("accessToken", cookieOptions);
};
