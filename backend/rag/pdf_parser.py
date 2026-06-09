import pdfplumber
import json
import re
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def parse_talks_with_llm(raw_text, openai_key):
    from openai import OpenAI
    client = OpenAI(api_key=openai_key)

    prompt = (
        "Extract all conference talks/sessions from the text below.\n"
        "Return a JSON array where each element has these exact keys:\n"
        '  "title"      : session title (string)\n'
        '  "speaker"    : presenter name (string, "Unknown" if not found)\n'
        '  "start_time" : start hour as integer, 24h format (e.g. 9 for 9:00 AM)\n'
        '  "end_time"   : end hour as integer\n'
        '  "description": 1-2 sentence summary (string)\n'
        '  "date"       : date string "YYYY-MM-DD" ("2025-01-01" if not found)\n\n'
        "Return ONLY valid JSON array, no markdown fences, no extra text.\n\n"
        "TEXT:\n" + raw_text[:5000]
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    content = response.choices[0].message.content.strip()
    content = re.sub(r"^```[a-z]*\n?", "", content)
    content = re.sub(r"\n?```$", "", content)
    return json.loads(content)


def parse_talks_heuristic(raw_text):
    """Fallback: detect lines containing HH:MM – HH:MM time patterns."""
    talks = []
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    time_re = re.compile(r"(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})")

    for i, line in enumerate(lines):
        m = time_re.search(line)
        if m:
            start_h = int(m.group(1))
            end_h = int(m.group(3))
            title = time_re.sub("", line).strip(" :-–")
            if not title and i + 1 < len(lines):
                title = lines[i + 1]
            speaker = lines[i + 1].strip() if i + 1 < len(lines) else "Unknown"
            if title:
                talks.append({
                    "id": len(talks) + 1,
                    "title": title,
                    "speaker": speaker,
                    "start_time": start_h,
                    "end_time": end_h,
                    "description": title,
                    "date": "2025-01-01",
                })

    return talks


def parse_pdf(file_path, openai_key=None):
    """Return (talks: list[dict], raw_text: str)."""
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text:
        return [], ""

    talks = []
    if openai_key:
        try:
            talks = parse_talks_with_llm(raw_text, openai_key)
            for i, t in enumerate(talks):
                t.setdefault("id", i + 1)
                t.setdefault("date", "2025-01-01")
        except Exception as e:
            print(f"LLM PDF parse failed ({e}), falling back to heuristic")

    if not talks:
        talks = parse_talks_heuristic(raw_text)

    return talks, raw_text
