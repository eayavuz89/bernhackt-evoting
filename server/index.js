// Minimal backend for the barrier-free e-voting voice agent.
// Its ONLY job: mint short-lived OpenAI Realtime ephemeral client secrets so the
// browser can open a WebRTC voice session without ever seeing the real API key.
// Protected by in-memory IP rate-limiting + a global daily cap (public demo endpoint).

const express = require("express");
const { instructions, tools } = require("./agent");

const app = express();
app.use(express.json({ limit: "16kb" }));

const OPENAI_KEY = process.env.OPENAI_REALTIME_KEY || process.env.OPENAI_API_KEY || "";
const MODEL = process.env.REALTIME_MODEL || "gpt-realtime";
const VOICE = process.env.REALTIME_VOICE || "marin";
const PORT = process.env.PORT || 8080;

// ---- protection limits (public endpoint, Realtime is ~$0.30/min) ----
const PER_IP_PER_MIN = Number(process.env.PER_IP_PER_MIN || 3);
const PER_IP_PER_HOUR = Number(process.env.PER_IP_PER_HOUR || 12);
const GLOBAL_PER_DAY = Number(process.env.GLOBAL_PER_DAY || 300);
// Session length is capped client-side; we also request a short token TTL.
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60);

const hits = new Map(); // ip -> number[] (timestamps ms)
let dayCount = 0;
let dayStamp = new Date().toISOString().slice(0, 10);

function rollDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayStamp) {
    dayStamp = today;
    dayCount = 0;
  }
}

function allow(ip) {
  rollDay();
  if (dayCount >= GLOBAL_PER_DAY) return { ok: false, reason: "daily_cap" };
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  const lastMin = arr.filter((t) => now - t < 60_000).length;
  if (lastMin >= PER_IP_PER_MIN) return { ok: false, reason: "rate_minute" };
  if (arr.length >= PER_IP_PER_HOUR) return { ok: false, reason: "rate_hour" };
  arr.push(now);
  hits.set(ip, arr);
  dayCount++;
  return { ok: true };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: !!OPENAI_KEY, model: MODEL, voice: VOICE });
});

app.post("/api/realtime/token", async (req, res) => {
  if (!OPENAI_KEY) return res.status(503).json({ error: "voice_agent_unconfigured" });

  const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.ip;
  const gate = allow(ip);
  if (!gate.ok) return res.status(429).json({ error: gate.reason });

  const lang = typeof req.body?.lang === "string" ? req.body.lang : "de";

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: TOKEN_TTL_SECONDS },
        session: {
          type: "realtime",
          model: MODEL,
          instructions: instructions + `\n\nAKTUELLE OBERFLÄCHENSPRACHE: ${lang}.`,
          output_modalities: ["audio"],
          audio: {
            input: {
              turn_detection: { type: "semantic_vad" },
              transcription: { model: "whisper-1" },
            },
            output: { voice: VOICE },
          },
          tools,
          tool_choice: "auto",
        },
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("[token] OpenAI error", r.status, JSON.stringify(data).slice(0, 400));
      return res.status(502).json({ error: "openai_error", status: r.status });
    }
    // GA response: { value: "ek_...", expires_at, session: {...} }
    res.json({ value: data.value, expires_at: data.expires_at, model: MODEL });
  } catch (e) {
    console.error("[token] fetch failed", e.message);
    res.status(502).json({ error: "mint_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`evoting voice backend on :${PORT} (model=${MODEL}, configured=${!!OPENAI_KEY})`);
});
