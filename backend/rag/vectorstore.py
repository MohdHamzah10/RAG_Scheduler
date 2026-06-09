import faiss
import numpy as np
import json
import os
from rag.embeddings import get_embedding

index = None
talks_data = []

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data.json")

def build_index():
    global index, talks_data

    with open(DATA_PATH) as f:
        talks_data = json.load(f)

    vectors = []

    for talk in talks_data:
        text = f"{talk['title']} {talk['description']}"
        emb = get_embedding(text)
        vectors.append(emb)

    vectors = np.array(vectors).astype("float32")

    index = faiss.IndexFlatL2(384)
    index.add(vectors)