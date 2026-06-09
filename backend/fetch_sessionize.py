#!/usr/bin/env python3
"""
Fetch sessions from a Sessionize event and populate data.json.

Usage:
    python fetch_sessionize.py <event-slug> <conference-id>

Example:
    python fetch_sessionize.py pycon-us-2026 pycon-2026

The event slug is the identifier in the Sessionize embed/API URL:
    https://sessionize.com/api/v2/<slug>/view/Sessions

After running, rebuild the search index:
    Option A (preferred): curl -X POST http://localhost:8000/admin/refresh
    Option B: restart uvicorn (it calls build_index() on startup)
"""

import sys
import json
import os
import urllib.request
import urllib.error
from datetime import datetime


def fetch_sessions(slug: str) -> list:
    url = f"https://sessionize.com/api/v2/{slug}/view/Sessions"
    print(f"GET {url}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ConferenceScheduler/1.0 (open-source RAG project)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}")
        if e.code == 404:
            print("  Slug not found. Check the Sessionize event URL.")
        raise SystemExit(1)
    except urllib.error.URLError as e:
        print(f"Network error: {e.reason}")
        raise SystemExit(1)


def convert_sessions(groups: list, conference_id: str) -> list:
    talks = []
    skipped = 0
    for group in groups:
        for session in group.get("sessions") or []:
            starts = (session.get("startsAt") or "").rstrip("Z")
            ends = (session.get("endsAt") or "").rstrip("Z")
            if not starts or not ends:
                skipped += 1
                continue
            try:
                start_dt = datetime.fromisoformat(starts)
                end_dt = datetime.fromisoformat(ends)
            except ValueError:
                skipped += 1
                continue

            # Clamp end to at least start+1 so duration is never 0
            if end_dt <= start_dt:
                skipped += 1
                continue

            speakers = session.get("speakers") or []
            description = (session.get("description") or "").strip()

            talks.append({
                "conference_id": conference_id,
                "title": (session.get("title") or "Untitled").strip(),
                "description": description,
                "speaker": speakers[0]["name"] if speakers else "Unknown",
                "start_time": start_dt.hour,
                "end_time": end_dt.hour,
                "date": start_dt.date().isoformat(),
            })

    if skipped:
        print(f"  Skipped {skipped} sessions (missing/invalid times)")
    return talks


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(1)

    slug = sys.argv[1]
    conference_id = sys.argv[2]

    data_path = os.path.join(os.path.dirname(__file__), "data.json")
    with open(data_path) as f:
        existing = json.load(f)

    print(f"data.json: {len(existing)} talks currently")
    kept = [t for t in existing if t.get("conference_id") != conference_id]
    removed = len(existing) - len(kept)
    if removed:
        print(f"  Removed {removed} existing talks for '{conference_id}'")

    groups = fetch_sessions(slug)
    new_talks = convert_sessions(groups, conference_id)

    if not new_talks:
        print("No usable sessions found — data.json unchanged.")
        raise SystemExit(1)

    # Assign sequential IDs after the current max
    max_id = max((t.get("id", 0) for t in kept), default=0)
    for i, t in enumerate(new_talks):
        t["id"] = max_id + i + 1

    combined = kept + new_talks
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2, ensure_ascii=False)

    print(f"\n  Saved {len(new_talks)} new talks → data.json ({len(combined)} total)")
    print("\nNext steps:")
    print("  curl -X POST http://localhost:8000/admin/refresh")
    print("  (or restart uvicorn)")


if __name__ == "__main__":
    main()
