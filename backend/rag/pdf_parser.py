import pdfplumber
import json
import re
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

CHUNK_SIZE = 6000
CHUNK_OVERLAP = 400


def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def _chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks


def _parse_chunk_with_llm(chunk, client):
    prompt = (
        "Extract every conference talk or session from the text below.\n"
        "Return a JSON array. Each element must have these exact keys:\n"
        '  "title"      : session title (string)\n'
        '  "speaker"    : presenter full name (string, "Unknown" if not found)\n'
        '  "start_time" : start hour as integer 0-23 in 24-hour format\n'
        '  "end_time"   : end hour as integer 0-23 in 24-hour format\n'
        '  "description": 1-2 sentence description of the session (string)\n'
        '  "date"       : "YYYY-MM-DD" if a date is present, otherwise "TBD"\n\n'
        "IMPORTANT rules for time conversion:\n"
        "  - 12-hour to 24-hour: 9:00 AM = 9, 12:00 PM = 12, 1:00 PM = 13, "
        "5:30 PM = 17, 12:00 AM = 0, 11:59 PM = 23\n"
        "  - If only a start time is given, set end_time = start_time + 1\n"
        "  - If start_time >= end_time after conversion, set end_time = start_time + 1\n\n"
        "IMPORTANT rules for dates:\n"
        "  - Convert any date format to YYYY-MM-DD "
        '(e.g. "Monday October 14" with year context, "14 Oct 2026", "10/14/2026")\n'
        '  - If no year is found in the text, infer from context or use the most recent year\n'
        '  - If truly no date information, use "TBD"\n\n'
        "SKIP these session types: registration, lunch, coffee break, "
        "networking, poster session, exhibition, opening remarks, closing ceremony\n\n"
        "Return ONLY a valid JSON array. No markdown, no extra text. "
        "If no sessions found return []\n\n"
        "TEXT:\n" + chunk
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=4096,
    )

    content = response.choices[0].message.content.strip()
    content = re.sub(r"^```[a-z]*\n?", "", content)
    content = re.sub(r"\n?```$", "", content)
    return json.loads(content)


def _to_24h(hour, minute, ampm):
    h = int(hour)
    ampm = (ampm or "").strip().upper()
    if ampm == "PM" and h != 12:
        h += 12
    elif ampm == "AM" and h == 12:
        h = 0
    return h


def _parse_date_string(raw):
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y",
                "%B %d %Y", "%b %d %Y", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def parse_talks_heuristic(raw_text):
    """Fallback when LLM is unavailable. Handles common time patterns."""
    talks = []
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

    # Matches: 9:00 AM - 10:00 AM  |  14:30–15:30  |  09:00-10:00
    time_re = re.compile(
        r"(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*[-–—to]+\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?",
        re.IGNORECASE,
    )
    # Rough date patterns
    date_re = re.compile(
        r"\b(\d{4}-\d{2}-\d{2}"
        r"|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
        r"|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b",
        re.IGNORECASE,
    )
    skip_re = re.compile(
        r"\b(registration|lunch|break|coffee|networking|exhibition|poster|opening|closing|welcome|reception)\b",
        re.IGNORECASE,
    )

    current_date = "TBD"

    for i, line in enumerate(lines):
        dm = date_re.search(line)
        if dm:
            parsed = _parse_date_string(dm.group(1))
            if parsed:
                current_date = parsed

        m = time_re.search(line)
        if not m:
            continue

        start_h = _to_24h(m.group(1), m.group(2), m.group(3))
        end_h = _to_24h(m.group(4), m.group(5), m.group(6))
        if end_h <= start_h:
            end_h = start_h + 1

        # Title: rest of line after stripping the time match
        title = time_re.sub("", line).strip(" :-–—|")
        if not title and i + 1 < len(lines):
            title = lines[i + 1]

        if not title or len(title) < 4 or skip_re.search(title):
            continue

        # Simple speaker heuristic: next line that looks like a name
        speaker = "Unknown"
        for j in range(i + 1, min(i + 3, len(lines))):
            candidate = lines[j].strip()
            words = candidate.split()
            if (
                2 <= len(words) <= 4
                and all(w[0].isupper() for w in words if w)
                and not time_re.search(candidate)
            ):
                speaker = candidate
                break

        talks.append({
            "id": len(talks) + 1,
            "title": title,
            "speaker": speaker,
            "start_time": start_h,
            "end_time": end_h,
            "description": title,
            "date": current_date,
        })

    return talks


def _deduplicate(talks):
    seen = set()
    out = []
    for t in talks:
        key = re.sub(r"\s+", " ", (t.get("title") or "")).strip().lower()[:80]
        if key and key not in seen:
            seen.add(key)
            out.append(t)
    return out


def _validate(talks):
    out = []
    for t in talks:
        title = (t.get("title") or "").strip()
        if not title or len(title) < 4:
            continue

        try:
            start = int(t.get("start_time") or 9)
            end = int(t.get("end_time") or start + 1)
        except (TypeError, ValueError):
            start, end = 9, 10

        if not (0 <= start <= 23):
            start = 9
        if not (0 <= end <= 23) or end <= start:
            end = start + 1

        date = (t.get("date") or "TBD").strip()
        if not re.match(r"\d{4}-\d{2}-\d{2}", date):
            date = "TBD"

        out.append({
            "title": title,
            "speaker": (t.get("speaker") or "Unknown").strip() or "Unknown",
            "start_time": start,
            "end_time": end,
            "description": (t.get("description") or title).strip(),
            "date": date,
        })
    return out


def parse_talks_with_llm(raw_text, openai_key):
    from openai import OpenAI
    client = OpenAI(api_key=openai_key)

    chunks = _chunk_text(raw_text)
    all_talks = []

    for chunk in chunks:
        try:
            result = _parse_chunk_with_llm(chunk, client)
            if isinstance(result, list):
                all_talks.extend(result)
        except Exception as e:
            print(f"LLM chunk parse failed: {e}")

    all_talks = _deduplicate(all_talks)
    all_talks = _validate(all_talks)

    for i, t in enumerate(all_talks):
        t["id"] = i + 1

    return all_talks


def parse_pdf(file_path, openai_key=None):
    """Return (talks: list[dict], raw_text: str)."""
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text:
        return [], ""

    talks = []
    if openai_key:
        try:
            talks = parse_talks_with_llm(raw_text, openai_key)
        except Exception as e:
            print(f"LLM PDF parse failed ({e}), falling back to heuristic")

    if not talks:
        raw_talks = parse_talks_heuristic(raw_text)
        talks = _deduplicate(_validate(raw_talks))
        for i, t in enumerate(talks):
            t["id"] = i + 1

    return talks, raw_text
