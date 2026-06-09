import numpy as np
import rag.vectorstore as vs
from rag.embeddings import get_embedding

# Cosine distance threshold: 0 = identical, 1 = unrelated, 2 = opposite.
# Talks with cosine distance > this value are considered irrelevant and excluded.
RELEVANCE_THRESHOLD = 0.65


def _cosine_dist(a: np.ndarray, b: np.ndarray) -> float:
    """1 - cosine_similarity, normalized so magnitude doesn't affect the score."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return 1.0 - float(np.dot(a, b) / (norm_a * norm_b))


def retrieve(user_query, k=5):
    query_vec = np.array([get_embedding(user_query)]).astype("float32")
    k = min(k, len(vs.talks_data))

    distances, indices = vs.index.search(query_vec, k)

    results = []
    for i, idx in enumerate(indices[0]):
        if idx == -1:
            continue
        talk = vs.talks_data[idx].copy()
        talk["score"] = float(distances[0][i])
        results.append(talk)

    return results


def retrieve_for_conference(user_query: str, conference_id: str, k: int = 6) -> list:
    """
    Search all talks for a conference using comma-separated interests.

    Each comma-separated term is embedded independently. A talk's score is its
    best (lowest) cosine distance across all terms — so a talk only needs to
    match one interest to be included. Talks above RELEVANCE_THRESHOLD are
    filtered out so genuinely irrelevant talks never appear in the schedule.
    """
    conf_indices = [
        i for i, t in enumerate(vs.talks_data)
        if t.get("conference_id") == conference_id
    ]
    if not conf_indices:
        return []

    # Split on commas; each term is a separate interest
    terms = [t.strip() for t in user_query.split(",") if t.strip()]
    if not terms:
        terms = [user_query.strip()]

    # Embed all terms up front
    term_vecs = [get_embedding(term).astype("float32") for term in terms]

    # Score each conference talk by its best match across all terms
    results = []
    for idx in conf_indices:
        stored_vec = vs.index.reconstruct(idx).astype("float32")
        best = min(_cosine_dist(qv, stored_vec) for qv in term_vecs)
        talk = vs.talks_data[idx].copy()
        talk["score"] = best
        results.append(talk)

    results.sort(key=lambda t: t["score"])

    # Keep only talks that are genuinely relevant
    relevant = [t for t in results if t["score"] < RELEVANCE_THRESHOLD]

    # Fallback: if the query is very niche and nothing clears the threshold,
    # return the top 3 closest matches so the user still gets something.
    if len(relevant) < 2:
        return results[:3]

    return relevant[:k]