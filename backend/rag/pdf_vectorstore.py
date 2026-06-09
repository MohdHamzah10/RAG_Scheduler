"""
Per-session FAISS index for uploaded PDF content.
Each upload gets an isolated in-memory index keyed by session_id.
"""
import faiss
import numpy as np
from rag.embeddings import get_embedding

# session_id -> {"index": faiss.Index, "talks": list[dict]}
_sessions: dict = {}


def build_session_index(session_id: str, talks: list) -> None:
    if not talks:
        return
    vectors = []
    for t in talks:
        text = f"{t.get('title', '')} {t.get('description', '')} {t.get('speaker', '')}"
        vectors.append(get_embedding(text))

    arr = np.array(vectors, dtype="float32")
    idx = faiss.IndexFlatL2(arr.shape[1])
    idx.add(arr)
    _sessions[session_id] = {"index": idx, "talks": talks}


def retrieve_from_session(session_id: str, query: str, k: int = 5) -> list:
    if session_id not in _sessions:
        raise KeyError(f"PDF session '{session_id}' not found")

    sess = _sessions[session_id]
    k = min(k, len(sess["talks"]))
    qvec = np.array([get_embedding(query)], dtype="float32")
    distances, indices = sess["index"].search(qvec, k)

    results = []
    for i, idx in enumerate(indices[0]):
        if idx == -1:
            continue
        talk = sess["talks"][idx].copy()
        talk["score"] = float(distances[0][i])
        results.append(talk)
    return results
