const User = require("../Models/User");

/**
 * Normalize string into username-safe format
 */
const normalize = (str = "") =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);

/**
 * Generate collision-free username
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 */
async function generateUsername({ name, email }) {
  const baseFromName = normalize(name?.split(" ")[0]);
  const baseFromEmail = normalize(email?.split("@")[0]);

  let base = baseFromName || baseFromEmail || "user";

  // Try base username
  let exists = await User.exists({ username: base });
  if (!exists) return base;

  // Try base_lastname
  if (name?.includes(" ")) {
    const [first, last] = name.split(" ");
    const combo = normalize(`${first}_${last}`);

    exists = await User.exists({ username: combo });
    if (!exists) return combo;
  }

  // Try numbered suffix
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}_${i}`;
    exists = await User.exists({ username: candidate });
    if (!exists) return candidate;
  }

  // Fallback random suffix
  while (true) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${base}_${random}`;

    exists = await User.exists({ username: candidate });
    if (!exists) return candidate;
  }
}

module.exports = generateUsername;
