def schedule(talks):
    talks_sorted = sorted(talks, key=lambda x: x["score"])
    selected = []
    alternatives = []

    for talk in talks_sorted:
        conflict = False
        for s in selected:
            same_day = talk.get("date", None) == s.get("date", None)
            overlapping = not (
                talk["end_time"] <= s["start_time"]
                or talk["start_time"] >= s["end_time"]
            )
            if same_day and overlapping:
                conflict = True
                break

        if not conflict:
            selected.append(talk)
        else:
            alternatives.append(talk)

    return selected, alternatives
