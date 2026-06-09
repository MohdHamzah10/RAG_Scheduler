# RAG Conference Scheduler

An AI-powered app that builds a personalised, conflict-free conference schedule based on your interests using semantic search (RAG).

## How it works

1. Pick a conference from the list
2. Type your interests (e.g. `"react hooks, state management"`)
3. The app embeds your query, searches talks semantically using FAISS, and returns a conflict-free schedule
4. Swap talks, ask the AI why something was recommended, or download your schedule

## Features

- Semantic search using `sentence-transformers/all-MiniLM-L6-v2` + FAISS
- Multi-conference support with country and month filters
- Full Day mode — fills an entire day without needing a query
- AI conflict resolver — when two talks overlap, GPT picks the better fit
- "Why recommended?" explanation per talk
- Upload any PDF brochure for conferences not in the list
- LLM chatbot to ask questions about talks and speakers
- Export schedule as PDF or `.ics` (Google Calendar, Apple Calendar, Outlook)

## Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, FAISS, ChromaDB
- **AI:** OpenAI GPT-4o-mini (keyword fallbacks if unavailable)

## Setup

**Backend**
```bash
cd backend
pip install fastapi uvicorn sentence-transformers faiss-cpu openai chromadb pdfplumber python-dotenv
cp .env.example .env   # add your OPENAI_API_KEY
uvicorn app:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

> OpenAI API key is optional — all features fall back to keyword-based logic if unavailable.
