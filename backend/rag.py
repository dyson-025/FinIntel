import json
import os

from sentence_transformers import SentenceTransformer
import faiss
import numpy as np


# ============================================================
# LOAD HISTORICAL DATA
# ============================================================

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "historical_events.json"
)


with open(DATA_PATH, "r", encoding="utf-8") as file:
    events = json.load(file)


# ============================================================
# EMBEDDING MODEL
# ============================================================

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


# ============================================================
# CREATE DOCUMENTS
# ============================================================

documents = []

for event in events:

    text = f"""
    Title: {event['title']}
    Date: {event['date']}
    Category: {event['category']}
    Description: {event['description']}
    Assets: {', '.join(event['assets'])}
    """

    documents.append(text)


# ============================================================
# CREATE EMBEDDINGS
# ============================================================

embeddings = model.encode(
    documents,
    convert_to_numpy=True
).astype("float32")


# ============================================================
# FAISS INDEX
# ============================================================

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

index.add(embeddings)


# ============================================================
# SEARCH
# ============================================================

def search_historical_events(
    query: str,
    top_k: int = 3
):

    query_embedding = model.encode(
        [query],
        convert_to_numpy=True
    ).astype("float32")

    distances, indices = index.search(
        query_embedding,
        top_k
    )

    results = []

    for distance, idx in zip(
        distances[0],
        indices[0]
    ):

        if idx < 0:
            continue

        event = events[idx]

        results.append({
    "title": event["title"],
    "date": event["date"],
    "category": event["category"],
    "description": event["description"],
    "assets": event["assets"],
    "similarity_distance": float(distance),

    "source": {
        "provider": "FinIntel Historical Events Dataset",
        "status": "HISTORICAL",
        "url": None
    }
})

    return results