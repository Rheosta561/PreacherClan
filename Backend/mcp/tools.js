const { z } = require("zod");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const UserService = require("../Services/UserService");
const SplitService = require("../Services/SplitService");
const { recordMcpAuditEvent } = require("../Services/mcpAuditService");

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

const youtubeUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtu.be",
      ].includes(hostname);
    } catch (error) {
      return false;
    }
  }, "Must be a YouTube or youtu.be URL");

const exerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(1).max(100),
    difficulty: z.enum(DIFFICULTIES).optional(),
    target_muscles: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    equipment: z.string().trim().max(100).optional(),
    youtube: youtubeUrl.optional(),
    description: z.string().trim().max(500).optional(),
    instructions: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  })
  .strict();

const updateSplitSchema = z
  .object({
    split_name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    day_overrides: z
      .array(
        z
          .object({
            day: z.enum(DAYS),
            exercises: z.array(exerciseSchema).max(20),
          })
          .strict()
      )
      .max(7)
      .optional(),
  })
  .strict()
  .refine(
    (changes) =>
      changes.split_name !== undefined ||
      changes.description !== undefined ||
      (changes.day_overrides?.length || 0) > 0,
    "At least one split change is required"
  )
  .refine(
    (changes) =>
      new Set((changes.day_overrides || []).map(({ day }) => day)).size ===
      (changes.day_overrides || []).length,
    "Each day may only be overridden once"
  );

function toSplitOutput(split) {
  const days = Object.fromEntries(DAYS.map((day) => [day, null]));
  for (const day of DAYS) {
    const exercises = split.exercises
      .filter((exercise) => exercise.day === day)
      .map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        difficulty: exercise.difficulty || null,
        target_muscles: exercise.target_muscles || [],
        equipment: exercise.equipment || null,
        youtube: exercise.youtube || null,
        description: exercise.description || null,
        instructions: exercise.instructions || [],
      }));
    if (exercises.length) days[day] = exercises;
  }

  return {
    split_id: split.split_id,
    split_name: split.split_name,
    description: split.description,
    creator: split.creator,
    days,
    metadata: {
      trending: Boolean(split.trending),
      trusted: Boolean(split.trusted),
      verified: Boolean(split.verified),
    },
  };
}

function result(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function errorResult(error) {
  console.error("MCP tool error:", error.message || "Unknown error");
  const status = error.statusCode || 500;
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          error:
            status >= 500
              ? "Internal server error"
              : error.code || error.message,
          status,
          ...(error.requiredScope ? { required_scope: error.requiredScope } : {}),
        }),
      },
    ],
  };
}

const requireScope = (principal, scope) => {
  if (principal.scopes.includes(scope)) return;
  const error = new Error("insufficient_scope");
  error.code = "insufficient_scope";
  error.statusCode = 403;
  error.requiredScope = scope;
  throw error;
};

function registerScopedTool(
  server,
  principal,
  name,
  requiredScope,
  handler,
  auditEvent,
  onToolExecution
) {
  server.registerTool(
    name,
    {
      description: handler.description,
      inputSchema: handler.inputSchema,
    },
    async (args) => {
      const startedAt = Date.now();
      let outcome = "success";
      let httpStatus = 200;

      try {
        requireScope(principal, requiredScope);
        return result(await handler.execute(args));
      } catch (error) {
        outcome = error.statusCode === 403 ? "denied" : "error";
        httpStatus = error.statusCode || 500;
        return errorResult(error);
      } finally {
        await auditEvent({
          principal,
          operation: `tool:${name}`,
          toolName: name,
          outcome,
          httpStatus,
          durationMs: Date.now() - startedAt,
        });
        onToolExecution?.({ toolName: name, outcome, httpStatus });
      }
    }
  );
}

function registerTools(
  server,
  {
    principal,
    userService = UserService,
    splitService = SplitService,
    auditEvent = recordMcpAuditEvent,
    onToolExecution,
  }
) {
  registerScopedTool(
    server,
    principal,
    "get_user_context",
    "mcp:read:user",
    {
      description:
        "Return the authenticated user's fitness profile and recent training history. Identity is taken from the access token.",
      inputSchema: z.object({
        include_training_history: z.boolean().optional().default(true),
      }).strict(),
      execute: ({ include_training_history: includeTrainingHistory }) =>
        userService.getUserContext(principal.userId, {
          includeTrainingHistory,
        }),
    },
    auditEvent,
    onToolExecution
  );

  registerScopedTool(
    server,
    principal,
    "get_current_workout_split",
    "mcp:read:split",
    {
      description:
        "Return the authenticated user's active workout split organized by day.",
      inputSchema: {},
      async execute() {
        return toSplitOutput(
          await splitService.getCurrentWorkoutSplit(principal.userId)
        );
      },
    },
    auditEvent,
    onToolExecution
  );

  registerScopedTool(
    server,
    principal,
    "update_workout_split",
    "mcp:write:split",
    {
      description:
        "Rename the authenticated user's active split, update its description, or fully replace exercises for specified days.",
      inputSchema: updateSplitSchema,
      async execute(changes) {
        const { split, updatedDays } =
          await splitService.updateCurrentWorkoutSplit(
            principal.userId,
            changes,
            { clientId: principal.clientId, scopes: principal.scopes }
          );
        return {
          success: true,
          split_id: split.split_id,
          message: "Workout split updated successfully",
          updated_days: updatedDays,
          split: toSplitOutput(split),
        };
      },
    },
    auditEvent,
    onToolExecution
  );
}

function createMcpServer(context) {
  const server = new McpServer(
    { name: "preacher-clan", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  registerTools(server, context);
  return server;
}

module.exports = {
  createMcpServer,
  updateSplitSchema,
};
