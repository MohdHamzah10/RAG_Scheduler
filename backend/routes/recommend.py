from fastapi import APIRouter
from backend.rag.retriever import retrieve_talks
from backend.rag.scheduler import schedule_talks
from backend.rag.generator import generate_response

router = APIRouter()

@router.post("/recommend")
def recommend(data: dict):
    user_input = data["user_input"]

    talks = retrieve_talks(user_input)

    selected, alternatives = schedule_talks(talks)

    summary = generate_response(user_input, selected, alternatives)

    return {
        "selected": selected,
        "alternatives": alternatives,
        "summary": summary
    }