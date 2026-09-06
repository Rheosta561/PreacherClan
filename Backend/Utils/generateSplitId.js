const { randomUUID } = require("crypto");

const generateSplitId = () => randomUUID();

module.exports = { generateSplitId };
