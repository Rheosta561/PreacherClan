function generateJamCode(prefix = "JAM") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let code = "";

  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}-${code}`;
}

module.exports = generateJamCode;
