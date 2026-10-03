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

const SERVER_INSTRUCTIONS = [
  "Preacher Clan MCP connects an AI assistant to the authenticated user's own fitness profile and active workout split. Editing a shared or preset split creates a personal copy for that user; it never changes the shared original.",
  "Use get_user_context for questions about the user's profile or recent training history. Use get_current_workout_split to inspect their active split and the exercises scheduled for each day.",
  "For gym membership questions, read plan, status, gym name, and dates from get_user_context.user.gymMembership; these values are normalized from both current gym-management fields and legacy assigned-membership fields. Check gymMembershipHistory before saying the user has never had a membership.",
  "Before changing a workout day, read the active split if needed to understand the current plan. update_workout_split replaces the entire exercise list for every day_overrides entry; include every exercise that should remain on that day. An empty exercises array clears that day.",
  "Weekdays may be supplied as full English names or canonical short codes: Monday/Mo, Tuesday/Tu, Wednesday/We, Thursday/Th, Friday/Fr, Saturday/Sa, Sunday/Su. The response uses the short codes.",
  "Each exercise requires name, integer sets from 1 to 20, and integer reps from 1 to 100. Optional exercise fields may be omitted or null; only use the documented fields. Do not invent missing workout details—ask the user if a requested replacement is ambiguous.",
  "Whenever the user asks to add exercises and has not said whether they want tutorial videos, ask whether they want YouTube tutorials included before calling update_workout_split. If they say no, omit youtube. If yes, include only verified YouTube URLs; if a verified link is unavailable, ask the user for one or confirm they want to proceed without it. Never invent or guess a video URL.",
  "An exercise may include an optional youtube field containing a complete YouTube video URL. Accepted hosts are youtube.com, www.youtube.com, m.youtube.com, youtu.be, and www.youtu.be. Do not use video_url or youtube_url as the field name, do not provide other video platforms, and do not invent or guess a video URL; omit youtube when no verified link is available.",
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
    difficulty: z.enum(DIFFICULTIES).nullable().optional(),
    target_muscles: z
      .array(z.string().trim().min(1).max(50))
      .max(20)
      .nullable()
      .optional(),
    equipment: z.string().trim().max(100).nullable().optional(),
    youtube: youtubeUrl
      .describe(
        "Optional complete YouTube video URL. Accepted hosts: youtube.com, www.youtube.com, m.youtube.com, youtu.be, www.youtu.be. Omit if no verified link is available."
      )
      .nullable()
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    instructions: z
      .array(z.string().trim().min(1).max(300))
      .max(20)
      .nullable()
      .optional(),
  })
  .strict();

const updateSplitSchema = z
  .object({
    split_name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    day_overrides: z
      .array(
        z
          .object({
            day: z
              .enum(DAY_INPUTS)
              .describe("Weekday name or code (e.g. Saturday or Sa)."),
            exercises: z.array(exerciseSchema).max(20),
          })
          .strict()
      )
      .max(7)
      .optional(),
  })
  .strict();

function normalizeSplitChanges(changes) {
  const dayOverrides = changes.day_overrides?.map(({ day, ...override }) => ({
    ...override,
    day: FULL_DAY_NAMES[day] || day,
  }));
  const normalizedChanges = {
    ...changes,
    ...(dayOverrides ? { day_overrides: dayOverrides } : {}),
  };

  if (
    normalizedChanges.split_name === undefined &&
    normalizedChanges.description === undefined &&
    (normalizedChanges.day_overrides?.length || 0) === 0
  ) {
    const error = new Error("At least one split change is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedDays = (normalizedChanges.day_overrides || []).map(
    ({ day }) => day
  );
  if (new Set(normalizedDays).size !== normalizedDays.length) {
    const error = new Error("Each day may only be overridden once");
    error.statusCode = 400;
    throw error;
  }

  return normalizedChanges;
}

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
      "Use this when the user asks about their own Preacher Clan fitness profile or recent training history, or asks about gym membership/history. Membership data includes plan, status, gym name, and dates normalized from both current membershipType/membershipStatus fields and legacy plan/status fields, plus gymMembershipHistory. A null value means that field is not recorded; check history before concluding the user never had a membership. Returns data for the account authenticated to this MCP connection; do not provide or request a user ID. Set include_training_history to false only when the user asks for profile context without recent history; it defaults to true.",
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
        "Use only when the user clearly asks to change their active workout split. If the active split is a preset or belongs to someone else, the server first creates a personal copy and applies the change only to that copy; the shared original is never changed. The response includes copied_from_split_id when a copy was made. Whenever the user asks to add exercises and has not said whether they want tutorial videos, ask whether to include YouTube tutorials before calling this tool. If they say no, omit youtube. If they say yes, include only verified YouTube URLs; if unavailable, ask for a link or confirm proceeding without one. Never invent or guess a URL. Accepts split_name, description, and/or day_overrides. Each day_overrides entry replaces that entire day's exercise list, not just one exercise; first call get_current_workout_split when the user expects existing exercises to remain, then include all exercises to keep. Pass exercises: [] only when the user wants that day cleared. Day accepts Monday/Mo, Tuesday/Tu, Wednesday/We, Thursday/Th, Friday/Fr, Saturday/Sa, or Sunday/Su; output uses short codes. Each exercise requires name (1-100 characters), integer sets (1-20), and integer reps (1-100). Optional difficulty (Beginner/Intermediate/Advanced), target_muscles, equipment, youtube, description, and instructions may be omitted or null. The optional youtube field must be a complete URL on youtube.com, www.youtube.com, m.youtube.com, youtu.be, or www.youtu.be; do not substitute video_url/youtube_url or invent a link. Use only these fields; do not invent missing details or pass user IDs. After the call, confirm the change only if the result has success: true; report tool errors as unsuccessful.",
      inputSchema: updateSplitSchema,
      async execute(changes) {
        const normalizedChanges = normalizeSplitChanges(changes);
        const { split, updatedDays, copiedFromSplitId } =
          await splitService.updateCurrentWorkoutSplit(
            principal.userId,
            normalizedChanges,
            { clientId: principal.clientId, scopes: principal.scopes }
          );
        return {
          success: true,
          split_id: split.split_id,
          message: copiedFromSplitId
            ? "A personal copy of the shared split was created and updated successfully"
            : "Workout split updated successfully",
          ...(copiedFromSplitId
            ? { copied_from_split_id: copiedFromSplitId }
            : {}),
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
  normalizeSplitChanges,
  updateSplitSchema,
};
