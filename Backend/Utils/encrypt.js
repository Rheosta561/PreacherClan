const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const publicKey = fs.readFileSync(
  path.join(__dirname, "../keys/public.pem"),
  "utf8"
);

function encryptPayload(payload) {
  const buffer = Buffer.from(JSON.stringify(payload));

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    buffer
  );

  return encrypted.toString("base64");
}

module.exports = encryptPayload;
