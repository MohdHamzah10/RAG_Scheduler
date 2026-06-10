import os
import uuid
import tempfile

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

import json
from config import OPENAI_API_KEY
from rag.vectorstore import build_index
from rag.retriever import retrieve, retrieve_for_conference
from rag.scheduler import schedule
from rag.generator import generate
from rag.pdf_parser import parse_pdf
from rag.pdf_vectorstore import build_session_index, retrieve_from_session
from rag.chat_kb import build_kb, search_kb, get_history, append_history

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── startup ──────────────────────────────────────────────────────────────────
build_index()   # main FAISS index (scheduling)
build_kb()      # ChromaDB knowledge base (chatbot)


# ── request models ────────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    user_input: str
    filters: Optional[Dict] = None
    conference_id: Optional[str] = None


class PdfRecommendRequest(BaseModel):
    session_id: str
    user_input: str


class ChatRequest(BaseModel):
    message: str
    session_id: str


class FullDayRequest(BaseModel):
    conference_id: str
    date: str


class ConflictRequest(BaseModel):
    user_input: str
    talk_a: Dict
    talk_b: Dict


class ExplainRequest(BaseModel):
    user_input: str
    talk: Dict


# ── helpers ───────────────────────────────────────────────────────────────────
def apply_filters(talks: list, filters: dict) -> list:
    if not filters:
        return talks

    date = filters.get("date", "").strip()
    time_slot = filters.get("time_slot", "").strip()
    topic = filters.get("topic", "").strip().lower()

    if date:
        talks = [t for t in talks if t.get("date", "") == date]

    if time_slot == "morning":
        talks = [t for t in talks if t.get("start_time", 0) < 12]
    elif time_slot == "afternoon":
        talks = [t for t in talks if t.get("start_time", 0) >= 12]

    if topic:
        talks = [
            t for t in talks
            if topic in t.get("title", "").lower()
            or topic in t.get("description", "").lower()
        ]

    return talks


# ── endpoints ─────────────────────────────────────────────────────────────────
@app.get("/conferences")
def get_conferences():
    path = os.path.join(os.path.dirname(__file__), "conferences.json")
    with open(path) as f:
        return json.load(f)


@app.get("/talks")
def get_talks(conference_id: Optional[str] = Query(default=None)):
    data_path = os.path.join(os.path.dirname(__file__), "data.json")
    with open(data_path) as f:
        talks = json.load(f)
    if conference_id:
        talks = [t for t in talks if t.get("conference_id") == conference_id]
    return talks


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if req.conference_id:
        # Search only within the selected conference so no talks are dropped
        # due to lower global ranking against the full 131-talk corpus.
        talks = retrieve_for_conference(req.user_input, req.conference_id)
    else:
        talks = retrieve(req.user_input, k=10)
    talks = apply_filters(talks, req.filters or {})
    selected, alternatives = schedule(talks)
    explanation = generate(req.user_input, selected)
    return {"selected": selected, "alternatives": alternatives, "explanation": explanation}


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        talks, _ = parse_pdf(tmp_path, openai_key=OPENAI_API_KEY)
    finally:
        os.unlink(tmp_path)

    if not talks:
        raise HTTPException(status_code=422, detail="No talks could be extracted from this PDF.")

    session_id = str(uuid.uuid4())
    build_session_index(session_id, talks)

    preview = [t.get("title", "Untitled") for t in talks[:3]]
    return {"session_id": session_id, "talks_found": len(talks), "preview": preview}


@app.post("/recommend-pdf")
def recommend_pdf(req: PdfRecommendRequest):
    try:
        talks = retrieve_from_session(req.session_id, req.user_input, k=20)
    except KeyError:
        raise HTTPException(status_code=404, detail="PDF session not found. Please re-upload.")

    # Filter to relevance threshold (same as regular conference retrieval)
    THRESHOLD = 0.72
    relevant = [t for t in talks if t.get("score", 1.0) < THRESHOLD]
    if len(relevant) < 2:
        relevant = talks[:5]  # fallback: return top 5 if nothing clears threshold

    selected, alternatives = schedule(relevant)
    explanation = generate(req.user_input, selected)
    return {"selected": selected, "alternatives": alternatives, "explanation": explanation}


@app.post("/explain")
def explain(req: ExplainRequest):
    t = req.talk
    prompt = (
        f"In exactly 2 sentences, explain why '{t.get('title','')}' by {t.get('speaker','')} "
        f"is a great match for someone interested in: \"{req.user_input}\". "
        f"Be specific about the content. Do not mention other talks."
    )
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=100,
        )
        return {"explanation": resp.choices[0].message.content.strip()}
    except Exception:
        stopwords = {"the", "a", "an", "and", "or", "for", "in", "of", "to", "is", "are", "with", "on", "at"}
        query_words = set(req.user_input.lower().split()) - stopwords
        talk_text = (t.get("title", "") + " " + t.get("description", "")).lower()
        matches = sorted([w for w in query_words if w in talk_text], key=len, reverse=True)
        desc = t.get("description", "")
        if matches:
            return {"explanation": (
                f"'{t.get('title','')}' was recommended because it directly covers "
                f"{', '.join(matches[:4])} — topics you expressed interest in. "
                f"{desc[:130]}{'…' if len(desc) > 130 else ''}"
            )}
        return {"explanation": (
            f"'{t.get('title','')}' was the closest semantic match for your query among "
            f"talks at this conference. {desc[:130]}{'…' if len(desc) > 130 else ''}"
        )}


@app.post("/resolve-conflict")
def resolve_conflict(req: ConflictRequest):
    a, b = req.talk_a, req.talk_b
    prompt = (
        f"A conference attendee is interested in: \"{req.user_input}\"\n\n"
        f"They have a scheduling conflict between:\n\n"
        f"Talk A: {a.get('title','')}\n{a.get('description','')}\n\n"
        f"Talk B: {b.get('title','')}\n{b.get('description','')}\n\n"
        f"Which is a better fit? Reply with exactly 'A' or 'B' on the first line, "
        f"then one sentence (max 25 words) explaining why."
    )
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=80,
        )
        lines = [l.strip() for l in resp.choices[0].message.content.strip().split("\n") if l.strip()]
        pick = lines[0].upper()
        reason = lines[1] if len(lines) > 1 else "Better match for your stated interests."
        recommendation = "a" if ("A" in pick and "B" not in pick[:2]) else "b"
    except Exception:
        q = set(req.user_input.lower().split())
        def _score(t):
            return len(q & set((t.get("title", "") + " " + t.get("description", "")).lower().split()))
        recommendation = "a" if _score(a) >= _score(b) else "b"
        winner = a if recommendation == "a" else b
        reason = f"\"{winner.get('title','')}\" has stronger keyword overlap with your interests."
    return {"recommendation": recommendation, "reason": reason}


@app.post("/full-day")
def full_day(req: FullDayRequest):
    data_path = os.path.join(os.path.dirname(__file__), "data.json")
    with open(data_path) as f:
        all_talks = json.load(f)

    talks = [
        t for t in all_talks
        if t.get("conference_id") == req.conference_id and t.get("date") == req.date
    ]

    if not talks:
        raise HTTPException(status_code=404, detail="No talks found for this date.")

    # Score by start_time so the scheduler fills the day chronologically
    for t in talks:
        t["score"] = t.get("start_time", 0)

    selected, alternatives = schedule(talks)
    day_label = req.date
    return {
        "selected": selected,
        "alternatives": alternatives,
        "explanation": f"Full day schedule for {day_label} — every available time slot, conflict-free.",
    }


@app.post("/admin/refresh")
def refresh_index():
    """Rebuild FAISS + ChromaDB from the current data.json without restarting."""
    try:
        build_index()
        build_kb()
        data_path = os.path.join(os.path.dirname(__file__), "data.json")
        with open(data_path) as f:
            talks = json.load(f)
        return {"status": "ok", "talks_indexed": len(talks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _fallback_reply(talks: list) -> str:
    """Rule-based reply built from ChromaDB search results, used when the LLM is unavailable."""
    if not talks:
        return (
            "I couldn't find any talks matching your query. "
            "Try asking about topics like AI, machine learning, web development, or startups."
        )

    lines = ["Here are the most relevant talks I found for your query:\n"]
    for t in talks:
        time_str = f"{t.get('start_time', '?')}:00 – {t.get('end_time', '?')}:00"
        date_str = t.get("date", "")
        lines.append(
            f"• **{t['title']}**\n"
            f"  Speaker: {t.get('speaker', 'Unknown')}  |  "
            f"  {date_str}  {time_str}"
        )

    lines.append(
        "\nWould you like to know more about any of these? "
        "You can also ask about a specific topic, date, or speaker."
    )
    return "\n".join(lines)


@app.post("/chat")
def chat(req: ChatRequest):
    context_talks = search_kb(req.message)
    history = get_history(req.session_id)

    context_text = "\n".join(
        f"- {t['title']} by {t['speaker']} on {t.get('date','')} at {t['start_time']}:00"
        for t in context_talks
    )

    system_prompt = (
        "You are a helpful conference assistant. "
        "Answer the user's questions about conference talks using the context below. "
        "Be concise and friendly. If a talk is not in the context, say you're not sure.\n\n"
        f"Relevant talks:\n{context_text}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": req.message})

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()
    except Exception:
        reply = _fallback_reply(context_talks)

    append_history(req.session_id, "user", req.message)
    append_history(req.session_id, "assistant", reply)

    return {"reply": reply}
