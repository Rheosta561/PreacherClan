const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const privateKey = fs.readFileSync(
  path.join(__dirname, "../keys/private.pem"),
  "utf8"
);

function decryptPayload(encryptedText) {
  const buffer = Buffer.from(encryptedText, "base64");

  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    buffer
  );

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = decryptPayload;
