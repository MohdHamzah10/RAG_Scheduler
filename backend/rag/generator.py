def generate(user_query, talks):
    explanation = f"Based on your interest in '{user_query}', we selected these talks:\n\n"

    for talk in talks:
        if isinstance(talk, dict):
            title = talk.get("title", "Unknown")
            speaker = talk.get("speaker", "Unknown")
        else:
            # fallback if wrong format
            title = str(talk)
            speaker = ""

        explanation += f"- {title} {('by ' + speaker) if speaker else ''}\n"

    return explanation