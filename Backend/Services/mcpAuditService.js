const McpAuditEvent = require("../Models/McpAuditEvent");

const recordMcpAuditEvent = async ({
  principal,
  operation,
  toolName,
  outcome,
  httpStatus,
  durationMs,
  requestId,
}) => {
  try {
    await McpAuditEvent.create({
      timestamp: new Date(),
      ...(principal.userId ? { userId: principal.userId } : {}),
      clientId: principal.clientId,
      scopes: principal.scopes,
      operation,
      ...(toolName ? { toolName } : {}),
      outcome,
      httpStatus,
      durationMs,
      ...(requestId ? { requestId } : {}),
    });
  } catch (error) {
    console.error("MCP audit event could not be recorded:", error.message);
    return false;
  }
  return true;
};

module.exports = { recordMcpAuditEvent };
