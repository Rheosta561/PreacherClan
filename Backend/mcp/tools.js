const { z } = require("zod");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const UserService = require("../Services/UserService");
const SplitService = require("../Services/SplitService");
const { recordMcpAuditEvent } = require("../Services/mcpAuditService");

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const FULL_DAY_NAMES = {
  Monday: "Mo",
  Tuesday: "Tu",
  Wednesday: "We",
  Thursday: "Th",
  Friday: "Fr",
  Saturday: "Sa",
  Sunday: "Su",
};
const DAY_INPUTS = [...DAYS, ...Object.keys(FULL_DAY_NAMES)];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const nullableOptional = (schema) =>
  schema.nullish().transform((value) => value ?? undefined);

const SERVER_INSTRUCTIONS = [
  "Preacher Clan MCP connects an AI assistant to the authenticated user's own fitness profile and active workout split.",
  "Use get_user_context for questions about the user's profile or recent training history. Use get_current_workout_split to inspect their active split and the exercises scheduled for each day.",
  "Before changing a workout day, read the active split if needed to understand the current plan. update_workout_split replaces the entire exercise list for every day_overrides entry; include every exercise that should remain on that day. An empty exercises array clears that day.",
  "Weekdays may be supplied as full English names or canonical short codes: Monday/Mo, Tuesday/Tu, Wednesday/We, Thursday/Th, Friday/Fr, Saturday/Sa, Sunday/Su. The response uses the short codes.",
  "Each exercise requires name, integer sets from 1 to 20, and integer reps from 1 to 100. Optional exercise fields may be omitted or null; only use the documented fields. Do not invent missing workout details—ask the user if a requested replacement is ambiguous.",
  "Only call update_workout_split when the user clearly requests a change. After calling it, report success only when the tool returns success: true; otherwise explain that no change was confirmed. Never claim a rejected or failed update succeeded.",
  "Tool access is restricted by the scopes granted by the user. Identity is taken from the OAuth connection; never ask for or pass a user ID or Preacher Clan login token.",
].join(" ");

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
    difficulty: nullableOptional(z.enum(DIFFICULTIES)),
    target_muscles: nullableOptional(
      z.array(z.string().trim().min(1).max(50)).max(20)
    ),
    equipment: nullableOptional(z.string().trim().max(100)),
    youtube: nullableOptional(youtubeUrl),
    description: nullableOptional(z.string().trim().max(500)),
    instructions: nullableOptional(
      z.array(z.string().trim().min(1).max(300)).max(20)
    ),
  })
  .strict();

const updateSplitSchema = z
  .object({
    split_name: z.string().trim().min(1).max(100).optional(),
    description: nullableOptional(z.string().trim().max(500)),
    day_overrides: z
      .array(
        z
          .object({
            day: z
              .enum(DAY_INPUTS)
              .transform((day) => FULL_DAY_NAMES[day] || day)
              .describe("Weekday name or code (e.g. Saturday or Sa)."),
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
        "Use this when the user asks about their own Preacher Clan fitness profile or recent training history. Returns data for the account authenticated to this MCP connection; do not provide or request a user ID. Set include_training_history to false only when the user asks for profile context without recent history; it defaults to true.",
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
        "Use this when the user asks to see, summarize, or check their active Preacher Clan workout split. Takes no arguments. Returns the latest split with days keyed by Mo, Tu, We, Th, Fr, Sa, Su; a null day has no exercises. Read this before an update when the current day contents are needed so exercises the user wants to keep are not accidentally removed. Identity is determined by the authenticated connection.",
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
        "Use only when the user clearly asks to change their active workout split. Accepts split_name, description, and/or day_overrides. Each day_overrides entry replaces that entire day's exercise list, not just one exercise; first call get_current_workout_split when the user expects existing exercises to remain, then include all exercises to keep. Pass exercises: [] only when the user wants that day cleared. Day accepts Monday/Mo, Tuesday/Tu, Wednesday/We, Thursday/Th, Friday/Fr, Saturday/Sa, or Sunday/Su; output uses short codes. Each exercise requires name (1-100 characters), integer sets (1-20), and integer reps (1-100). Optional difficulty (Beginner/Intermediate/Advanced), target_muscles, equipment, youtube (YouTube URL only), description, and instructions may be omitted or null. Use only these fields; do not invent missing details or pass user IDs. After the call, confirm the change only if the result has success: true; report tool errors as unsuccessful.",
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
    {
      capabilities: { tools: {} },
      instructions: SERVER_INSTRUCTIONS,
    }
  );
  registerTools(server, context);
  return server;
}

module.exports = {
  createMcpServer,
  updateSplitSchema,
};
