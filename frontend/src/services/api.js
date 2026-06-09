const BASE = "http://localhost:8000";

const TIMEOUT_SHORT = 15_000;   // simple reads
const TIMEOUT_MED   = 30_000;   // AI calls (explain, chat, conflict)
const TIMEOUT_LONG  = 45_000;   // schedule generation & PDF parsing

async function fetchWithTimeout(url, options = {}, ms = TIMEOUT_MED) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out — the server is taking too long. Please try again in a moment.");
    }
    throw err;
  }
}

async function post(path, body, ms = TIMEOUT_MED) {
  const res = await fetchWithTimeout(
    `${BASE}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    ms
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Server error");
  }
  return res.json();
}

export async function getConferences() {
  const res = await fetchWithTimeout(`${BASE}/conferences`, {}, TIMEOUT_SHORT);
  if (!res.ok) throw new Error("Failed to load conferences");
  return res.json();
}

export async function getAllTalks(conferenceId) {
  const url = conferenceId
    ? `${BASE}/talks?conference_id=${encodeURIComponent(conferenceId)}`
    : `${BASE}/talks`;
  const res = await fetchWithTimeout(url, {}, TIMEOUT_SHORT);
  if (!res.ok) throw new Error("Failed to load talks");
  return res.json();
}

export async function getSchedule({ text, filters = {}, conferenceId }) {
  return post("/recommend", {
    user_input: text,
    filters,
    conference_id: conferenceId || null,
  }, TIMEOUT_LONG);
}

export async function uploadPdf(file) {
  const form = new FormData();
  form.append("file", file);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_LONG);
  try {
    const res = await fetch(`${BASE}/upload-pdf`, {
      method: "POST",
      body: form,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Upload timed out — the PDF may be too large. Please try again.");
    }
    throw err;
  }
}

export async function getScheduleFromPdf({ session_id, text }) {
  return post("/recommend-pdf", { session_id, user_input: text }, TIMEOUT_LONG);
}

export async function chatMessage(message, session_id) {
  return post("/chat", { message, session_id });
}

export async function fullDay({ conferenceId, date }) {
  return post("/full-day", { conference_id: conferenceId, date }, TIMEOUT_LONG);
}

export async function resolveConflict({ userInput, talkA, talkB }) {
  return post("/resolve-conflict", { user_input: userInput, talk_a: talkA, talk_b: talkB });
}

export async function explainTalk({ userInput, talk }) {
  return post("/explain", { user_input: userInput, talk });
}
