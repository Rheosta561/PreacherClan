# Preacher Clan — MCP Integration Strategy

## Current State Analysis (Post-Audit)

### What Already Exists (Verified)
- ✅ **User.currentSplitId** field exists in User model (line 40 in User.js)
- ✅ **Auth middleware applied** to WorkoutSplitRouter (create, update), ProfileRoutes, TrainingRoutes, ChallengeRoutes
- ✅ **Auth uses req.user.id** (from JWT) not req.body.userId in workoutSplitController & TrainingController
- ✅ **User model has** streak, preacherScore, gymMembership, roles (isTrainer, isVerified, isAdmin)
- ✅ **Profile model** has fitnessGoals, ambition, exerciseGenre, timings, embedding
- ✅ **TrainingSession** model with completed sessions history
- ✅ **WorkoutSplit** model with embedded exercises per day
- ✅ **Gemini integration** via @google/generative-ai for embeddings
- ✅ **Collaborative filtering** (Pearson) + vector search for recommendations
- ✅ **Socket.IO** infrastructure (needs auth)
- ✅ **Redis connection** configured

### Gaps Identified (Updated)
1. **No service layer** for user/workout domains (controllers call Mongoose directly)
2. **WorkoutPlan routes** have no auth, mass assignment vulnerability
3. **UserRouter GET /:userId** is public (no auth)
4. **Inconsistent JWT secrets**: authController.js:79 uses JWT_SECRET, others use ACCESS_TOKEN_SECRET
5. **No rate limiting** on any endpoint
6. **Socket.IO has no auth** - trusts caller-supplied userId
7. **CORS is open** (origin: '*')
8. **No audit logging** for split modifications
9. **No MCP infrastructure** at all

---

## MCP Architecture: Option A (Embedded) - CONFIRMED

```
┌─────────────────────────────────────────────────────────────┐
│              Preacher Clan Backend (Node.js)                 │
│                                                              │
│  ┌──────────────────┐   ┌────────────────────────────────┐  │
│  │  REST API Layer  │   │         MCP Layer               │  │
│  │                  │   │                                 │  │
│  │  /auth           │   │  POST /mcp  (Streamable HTTP)   │  │
│  │  /split          │   │                                 │  │
│  │  /training       │   │  Tools:                         │  │
│  │  /profile        │   │  ├── get_user_context            │  │
│  │  /user           │   │  ├── get_current_workout_split   │  │
│  │  /workout-plan   │   │  └── update_workout_split        │  │
│  │  …               │   │                                 │  │
│  └────────┬─────────┘   └───────────────┬────────────────┘  │
│           │                             │                    │
│           └─────────────┬───────────────┘                    │
│                         ▼                                     │
│              ┌───────────────────────┐                       │
│              │      Service Layer    │  (NEW - to extract)   │
│              │  UserService.js       │                       │
│              │  SplitService.js      │                       │
│              │  TrainingService.js   │                       │
│              └───────────┬───────────┘                       │
│                          ▼                                     │
│              ┌───────────────────────┐                       │
│              │    Mongoose Models    │  (existing)           │
│              │  User / Profile       │                       │
│              │  WorkoutSplit         │                       │
│              │  TrainingSession      │                       │
│              └───────────┬───────────┘                       │
│                          ▼                                     │
│              ┌───────────────────────┐                       │
│              │      MongoDB Atlas    │  (existing)           │
│              └───────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Security Hardening (Prerequisites)
- [ ] Fix JWT secret inconsistency (JWT_SECRET → ACCESS_TOKEN_SECRET)
- [ ] Add auth middleware to WorkoutPlanRoutes, UserRouter GET
- [ ] Add rate limiting (express-rate-limit)
- [ ] Fix CORS to use allowedOrigins from env.js
- [ ] Add Socket.IO authentication

### Phase 2: Service Layer Extraction
- [ ] Create `Services/UserService.js` - getUserContext, getRecentSessions
- [ ] Create `Services/SplitService.js` - getById, update (extract from workoutSplitController)
- [ ] Create `Services/TrainingService.js` - getRecentSessions, start/complete session
- [ ] Refactor controllers to use services

### Phase 3: MCP Infrastructure
- [ ] Install `@modelcontextprotocol/sdk`
- [ ] Create `Middleware/mcpAuth.js` (copy of auth.js pattern)
- [ ] Create `mcp/index.js` - MCP server with Streamable HTTP transport
- [ ] Mount MCP at `/mcp` in app.js

### Phase 4: MCP Tools Implementation
- [ ] `get_user_context` - returns user + profile + recent sessions
- [ ] `get_current_workout_split` - returns split organized by day
- [ ] `update_workout_split` - constrained write with validation + audit log

### Phase 5: Validation & Polish
- [ ] Zod schemas for MCP tool inputs
- [ ] Audit log model + writes
- [ ] Integration tests
- [ ] Documentation

---

## MCP Tool Specifications

### Tool 1: get_user_context
```typescript
// Input: {} (identity from verified JWT)
// Optional: { include_training_history?: boolean }
{
  user: {
    id: string,
    name: string,
    username: string,
    age: number | null,
    isTrainer: boolean,
    isVerified: boolean,
    streak: { count: number, todayUpdated: boolean },
    preacherScore: number,
    gymMembership: { status: string, plan: string } | null,
    currentSplitId: string | null
  },
  profile: {
    about: string | null,
    fitnessGoals: string[],
    ambition: string[],
    exerciseGenre: string[],
    timings: string | null
  },
  recentSessions: Array<{
    splitId: string,
    day: string,
    status: "completed" | "cancelled",
    completedAt: string
  }>
}
```

### Tool 2: get_current_workout_split
```typescript
// Input: {} or { target_user_id?: string } (trainer only)
{
  split_id: string,
  split_name: string,
  description: string,
  creator: string,
  days: {
    Mo: Exercise[] | null,
    Tu: Exercise[] | null,
    We: Exercise[] | null,
    Th: Exercise[] | null,
    Fr: Exercise[] | null,
    Sa: Exercise[] | null,
    Su: Exercise[] | null
  },
  metadata: { trending: boolean, trusted: boolean, verified: boolean }
}
```

### Tool 3: update_workout_split
```typescript
// Input: { split_name?, description?, day_overrides?: Array<{day, exercises: ExerciseInput[]}> }
{
  success: boolean,
  split_id: string,
  message: string,
  updated_days: string[],
  split: WorkoutSplit
}
```

---

## File Structure (New Files)

```
Backend/
├── mcp/
│   ├── index.js              # MCP server entry point
│   ├── transport.js          # Streamable HTTP transport setup
│   └── tools/
│       ├── getUserContext.js
│       ├── getCurrentWorkoutSplit.js
│       └── updateWorkoutSplit.js
├── Middleware/
│   └── mcpAuth.js            # MCP-specific auth middleware
├── Services/
│   ├── UserService.js        # NEW
│   ├── SplitService.js       # NEW (extracted)
│   └── TrainingService.js    # NEW (extracted)
├── Models/
│   └── AuditLog.js           # NEW
├── Utils/
│   └── zodSchemas.js         # NEW - MCP input validation
└── package.json              # + @modelcontextprotocol/sdk, zod
```

---

## Dependencies to Add

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.22.0",
  "express-rate-limit": "^7.1.0"
}
```

---

## Security Considerations for MCP

1. **Token Verification**: MCP tools MUST verify JWT using ACCESS_TOKEN_SECRET (same as auth.js)
2. **Identity from Token**: NEVER accept user_id from agent payload - always use decoded JWT `sub`
3. **Authorization**: 
   - Regular users: can only access their own data
   - Trainers: future - may access client data with permission
   - Admins: can access any (via isAdmin check)
4. **Write Scope**: `update_workout_split` requires explicit write permission (JWT scope or separate API key)
5. **Audit Logging**: Every write operation logged immutably
6. **Rate Limiting**: Stricter limits on MCP write endpoints
7. **Input Validation**: Strict Zod schemas - no mass assignment

---

## Agent Interaction Flow

```
User: "Change my Monday workout to chest and triceps"

1. Client App → injects user's accessToken to Agent
2. Agent → MCP: get_user_context(token)
3. MCP → verifies JWT → userId = "abc123"
4. MCP → UserService.getUserContext("abc123")
5. MCP → returns { fitnessGoals, currentSplitId, streak, ... }
6. Agent → MCP: get_current_workout_split(token)
7. MCP → SplitService.getById(currentSplitId)
8. MCP → returns structured split with days
9. Agent + LLM → builds day_overrides for "Mo"
10. Agent → MCP: update_workout_split(token, { day_overrides: [...] })
11. MCP → validates → SplitService.update() → AuditLog.create()
12. MCP → returns { success: true, updated_days: ["Mo"], split: {...} }
13. Agent → User: "Done! Monday is now Chest & Triceps."
```

---

## Next Steps

1. **Immediate**: Install dependencies, create service layer
2. **Short-term**: MCP infrastructure + 3 tools
3. **Medium-term**: Security hardening, audit logs, rate limiting
4. **Long-term**: Trainer scope, challenge integration, nutrition context