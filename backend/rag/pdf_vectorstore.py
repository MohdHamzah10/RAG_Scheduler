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


def retrieve_from_session(session_id: str, query: str, k: int = 20) -> list:
    if session_id not in _sessions:
        raise KeyError(f"PDF session '{session_id}' not found")

    sess = _sessions[session_id]
    k = min(k, len(sess["talks"]))
    qvec = np.array([get_embedding(query)], dtype="float32")

    # Use cosine distance (consistent with main retriever)
    results = []
    for talk in sess["talks"]:
        text = f"{talk.get('title', '')} {talk.get('description', '')} {talk.get('speaker', '')}"
        tvec = get_embedding(text).astype("float32")
        qv = qvec[0].astype("float32")
        norm_q = np.linalg.norm(qv)
        norm_t = np.linalg.norm(tvec)
        if norm_q == 0 or norm_t == 0:
            score = 1.0
        else:
            score = 1.0 - float(np.dot(qv, tvec) / (norm_q * norm_t))
        t = talk.copy()
        t["score"] = score
        results.append(t)

    results.sort(key=lambda x: x["score"])
    return results[:k]
