const crypto = require("crypto");

const SERVICE_URL = (process.env.REPMATE_MATCHER_URL || "").replace(/\/$/, "");
const SERVICE_SECRET = process.env.REPMATE_MATCHER_SECRET || "";
const REQUEST_TIMEOUT_MS = Number(process.env.REPMATE_MATCHER_TIMEOUT_MS || 8000);

async function matcherRequest(path, body) {
  if (!SERVICE_URL || !SERVICE_SECRET) {
    throw new Error("RepMate matcher service is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Secret": SERVICE_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`RepMate matcher returned ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    return response.status === 204 ? null : response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function profileText(profile) {
  const fields = [
    ["About", profile?.about || ""],
    ["Fitness goals", (profile?.fitnessGoals || []).join(", ")],
    ["Training ambitions", (profile?.ambition || []).join(", ")],
    ["Exercise genres", (profile?.exerciseGenre || []).join(", ")],
    ["Preferred training time", profile?.timings || ""],
  ];
  return fields
    .filter(([, value]) => value && String(value).trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join("\n");
}

async function getNeighbors(userId, profile, excludeIds, limit) {
  return matcherRequest(`/internal/profiles/${encodeURIComponent(userId)}/neighbors`, {
    query_text: profileText(profile),
    exclude_ids: excludeIds,
    limit,
  });
}

async function enqueueProfileUpsert(profile, gymId) {
  if (!profileText(profile)) {
    return enqueueProfileDelete(profile.userId);
  }

  await matcherRequest("/internal/profiles/ingest", {
    event_id: `profile-${profile.userId}-${crypto.randomUUID()}`,
    event_type: "profile.upsert",
    profile: {
      user_id: String(profile.userId),
      about: profile.about || "",
      fitness_goals: profile.fitnessGoals || [],
      ambition: profile.ambition || [],
      exercise_genre: profile.exerciseGenre || [],
      timings: profile.timings || "",
      gym_id: gymId ? String(gymId) : null,
      active: true,
    },
  });
}

async function enqueueProfileDelete(userId) {
  await matcherRequest("/internal/profiles/ingest", {
    event_id: `profile-delete-${userId}-${crypto.randomUUID()}`,
    event_type: "profile.delete",
    user_id: String(userId),
  });
}

module.exports = { getNeighbors, enqueueProfileUpsert, enqueueProfileDelete };
