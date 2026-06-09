# RAG Conference Scheduler

An AI-powered conference schedule builder. Select a conference, describe your interests, and the app generates a personalised, conflict-free schedule using semantic search — no keyword matching.

---

## Features

- **Semantic schedule generation** — sentence-transformers embeds your interests and finds the most relevant talks via FAISS vector search
- **Multi-conference support** — 13 conferences with country/month filters; each has its own talk pool
- **Comma-separated interests** — `"react hooks, state management, testing"` searches each term independently and unions the results
- **Full Day mode** — fills an entire conference day chronologically, no interest query needed
- **Conflict resolver** — swapping a talk that overlaps triggers an AI modal that picks the better fit with a reason
- **"Why recommended?"** — per-talk explanation panel backed by GPT-4o-mini (keyword fallback if quota exceeded)
- **PDF brochure upload** — upload any conference brochure PDF; the app extracts talks and builds a session-scoped index
- **LLM chatbot** — floating chat widget backed by ChromaDB; answers questions about talks and speakers
- **Export** — download your schedule as a PDF (jsPDF) or an `.ics` calendar file (Google Calendar, Apple Calendar, Outlook)
- **Request timeout** — all API calls abort after 30–45 s with a clear error message instead of spinning forever
- **Back navigation** — "← Back" from results restores the exact conference and mode (By Interest / Full Day) you came from

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | FastAPI, Uvicorn |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Vector search | FAISS `IndexFlatL2` (384-dim) |
| Chatbot KB | ChromaDB (persistent) |
| LLM | OpenAI GPT-4o-mini (keyword fallback when unavailable) |
| PDF parsing | pdfplumber |
| Schedule export | jsPDF, native `.ics` generation |

---

## Project Structure

```
project_RAG/
├── backend/
│   ├── app.py                  # FastAPI app, all endpoints
│   ├── config.py               # loads OPENAI_API_KEY from .env
│   ├── data.json               # 142 talks across 13 conferences
│   ├── conferences.json        # conference metadata
│   ├── fetch_sessionize.py     # scraper: pull real data from Sessionize API
│   ├── .env.example
│   └── rag/
│       ├── vectorstore.py      # builds FAISS index from data.json
│       ├── retriever.py        # global search + per-conference semantic search
│       ├── scheduler.py        # greedy conflict-free scheduler
│       ├── generator.py        # GPT-4o-mini schedule explanation
│       ├── embeddings.py       # sentence-transformers wrapper
│       ├── chat_kb.py          # ChromaDB knowledge base + chat history
│       ├── pdf_parser.py       # pdfplumber + LLM talk extraction
│       └── pdf_vectorstore.py  # per-session in-memory FAISS for uploaded PDFs
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx        # conference picker, schedule builder, full day mode
    │   │   └── Results.jsx     # timeline, why panel, conflict modal, exports
    │   ├── components/
    │   │   ├── features/
    │   │   │   ├── ConferencePicker.jsx
    │   │   │   ├── InputBox.jsx
    │   │   │   ├── FullDayForm.jsx
    │   │   │   ├── BrochureUploadCard.jsx
    │   │   │   ├── AllTalksCard.jsx
    │   │   │   ├── TimeLine.jsx
    │   │   │   ├── StructuredForm.jsx
    │   │   │   └── ChatBot.jsx
    │   │   └── layout/
    │   │       └── Navbar.jsx
    │   └── services/
    │       └── api.js          # all fetch calls with AbortController timeouts
    └── package.json
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- An OpenAI API key (optional — all endpoints have keyword-based fallbacks)

### 1. Clone the repo

```bash
git clone https://github.com/MohdHamzah10/RAG_Scheduler.git
cd RAG_Scheduler
```

### 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install fastapi uvicorn sentence-transformers faiss-cpu \
            openai chromadb pdfplumber python-dotenv
```

Copy `.env.example` to `.env` and add your key:

```bash
cp .env.example .env
# edit .env and set: OPENAI_API_KEY=sk-...
```

Start the backend:

```bash
python3 -m uvicorn app:app --reload --port 8000
```

The first start takes ~30 s to build the FAISS index and ChromaDB collection.

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Open **http://localhost:5173** (or the port Vite prints).

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/conferences` | List all conferences |
| `GET` | `/talks?conference_id=` | List talks, optionally filtered by conference |
| `POST` | `/recommend` | Generate a schedule from interests |
| `POST` | `/full-day` | Fill an entire conference day, no query needed |
| `POST` | `/explain` | Explain why a talk was recommended |
| `POST` | `/resolve-conflict` | AI picks between two conflicting talks |
| `POST` | `/upload-pdf` | Parse a brochure PDF, return session id |
| `POST` | `/recommend-pdf` | Generate schedule from an uploaded PDF |
| `POST` | `/chat` | Chatbot backed by ChromaDB |
| `POST` | `/admin/refresh` | Hot-reload FAISS + ChromaDB after data changes |

---

## How the RAG Pipeline Works

1. **Index** — on startup, every talk's `title + description` is embedded with `all-MiniLM-L6-v2` and stored in a FAISS `IndexFlatL2`
2. **Query** — the user's interest string is split on commas; each term is embedded separately
3. **Retrieve** — for a selected conference, every talk is scored by its best cosine similarity across all query terms; talks above the relevance threshold are filtered out
4. **Schedule** — the filtered pool is sorted by relevance score and passed through a greedy interval scheduler that eliminates time conflicts; leftover talks become "alternatives"
5. **Generate** — GPT-4o-mini writes a 1–2 sentence summary explaining why the schedule fits the stated interests (keyword fallback if OpenAI is unavailable)

---

## Adding Real Conference Data

Use the included Sessionize scraper to replace any conference's talks with live data:

```bash
cd backend
python3 fetch_sessionize.py <event-slug> <conference-id>

# Example
python3 fetch_sessionize.py pycon-us-2026 pycon-2026
```

Then rebuild the index without restarting:

```bash
curl -X POST http://localhost:8000/admin/refresh
```

The event slug comes from the Sessionize embed URL:
`https://sessionize.com/api/v2/<slug>/view/Sessions`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | GPT-4o-mini for explanations, conflict resolution, chatbot, and PDF parsing. All features have keyword-based fallbacks if unset or quota exceeded. |
