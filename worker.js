const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function checkAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.replace("Bearer ", "").trim();
  return token === env.ACCESS_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (!checkAuth(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/state") {
      if (request.method === "GET") {
        const row = await env.DB
          .prepare("SELECT data, updated_at FROM state WHERE id = ?")
          .bind("main")
          .first();

        if (!row) return json(null);
        return json({ data: JSON.parse(row.data), updated_at: row.updated_at });
      }

      if (request.method === "PUT") {
        const body = await request.json();
        const now = Date.now();
        await env.DB
          .prepare("INSERT OR REPLACE INTO state (id, data, updated_at) VALUES (?, ?, ?)")
          .bind("main", JSON.stringify(body.data), now)
          .run();
        return json({ ok: true, updated_at: now });
      }
    }

    return json({ error: "Not Found" }, 404);
  },

  // Runs at 03:00 UTC = 06:00 Moscow time every day
  async scheduled(event, env) {
    const row = await env.DB
      .prepare("SELECT data, updated_at FROM state WHERE id = ?")
      .bind("main")
      .first();

    if (!row) return;

    const state = JSON.parse(row.data);
    const today = new Date().toISOString().split("T")[0];

    // Check if all daily quests were completed (for streak calculation)
    const dailyQuests = (state.quests || []).filter(q => q.daily);
    const allDailyDone = dailyQuests.length > 0 && dailyQuests.every(q => q.done);

    // Reset daily quests: update streaks, clear done, update due date
    const quests = (state.quests || []).map(q => {
      if (!q.daily) return q;
      return {
        ...q,
        done: false,
        due: today,
        streak: q.done ? (q.streak || 0) + 1 : 0,
        completedAt: undefined,
      };
    });

    // Update profile streak
    const profile = {
      ...state.profile,
      streak: allDailyDone ? (state.profile?.streak || 0) + 1 : 0,
    };

    const newState = { ...state, quests, profile };

    await env.DB
      .prepare("INSERT OR REPLACE INTO state (id, data, updated_at) VALUES (?, ?, ?)")
      .bind("main", JSON.stringify(newState), Date.now())
      .run();
  },
};
