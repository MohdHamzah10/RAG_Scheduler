"""
Separate ChromaDB knowledge base for the LLM chatbot.
Completely independent of the main FAISS vectorstore used for scheduling.
"""
import json
import os
import chromadb
from chromadb.config import Settings
from rag.embeddings import get_embedding

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data.json")
_CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

_client = None
_collection = None

# In-memory chat histories: session_id -> list[{role, content}]
_histories: dict = {}


def build_kb() -> None:
    global _client, _collection

    _client = chromadb.PersistentClient(path=_CHROMA_PATH)

    # Delete and recreate so it always reflects current data.json
    try:
        _client.delete_collection("conference_kb")
    except Exception:
        pass

    _collection = _client.create_collection(
        name="conference_kb",
        metadata={"hnsw:space": "cosine"},
    )

    with open(_DATA_PATH) as f:
        talks = json.load(f)

    ids, embeddings, documents, metadatas = [], [], [], []
    for t in talks:
        text = (
            f"Title: {t['title']}. "
            f"Speaker: {t.get('speaker', 'Unknown')}. "
            f"Date: {t.get('date', 'TBD')}. "
            f"Time: {t.get('start_time', '?')}:00-{t.get('end_time', '?')}:00. "
            f"Description: {t.get('description', '')}"
        )
        ids.append(str(t["id"]))
        embeddings.append(get_embedding(text).tolist())
        documents.append(text)
        metadatas.append({
            "title": t["title"],
            "speaker": t.get("speaker", "Unknown"),
            "date": t.get("date", ""),
            "start_time": t.get("start_time", 0),
            "end_time": t.get("end_time", 0),
        })

    _collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)


def search_kb(query: str, k: int = 4) -> list:
    qvec = get_embedding(query).tolist()
    results = _collection.query(
        query_embeddings=[qvec],
        n_results=min(k, _collection.count()),
        include=["documents", "metadatas"],
    )
    return results["metadatas"][0] if results["metadatas"] else []


def get_history(session_id: str) -> list:
    return _histories.get(session_id, [])


def append_history(session_id: str, role: str, content: str) -> None:
    _histories.setdefault(session_id, [])
    _histories[session_id].append({"role": role, "content": content})
    # cap at 20 messages to avoid token overflow
    _histories[session_id] = _histories[session_id][-20:]
