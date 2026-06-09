from openai import OpenAI
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

def rerank_talks(user_query, talks):
    prompt = f"""
Rank these talks based on relevance to:
{user_query}

Talks:
{talks}

Return sorted list.
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content