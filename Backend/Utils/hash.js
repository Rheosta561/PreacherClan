const crypto = require("crypto");

const hashValue = (value) => {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
};

module.exports = {
  hashValue,
};
