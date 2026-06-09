const TOPIC_COLORS = {
  violet:  { bar: "bg-violet-500",  badge: "bg-violet-100 text-violet-700 border-violet-200",  time: "text-violet-600"  },
  indigo:  { bar: "bg-indigo-500",  badge: "bg-indigo-100 text-indigo-700 border-indigo-200",  time: "text-indigo-600"  },
  blue:    { bar: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 border-blue-200",        time: "text-blue-600"    },
  emerald: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", time: "text-emerald-600" },
  amber:   { bar: "bg-amber-500",   badge: "bg-amber-100 text-amber-700 border-amber-200",     time: "text-amber-600"   },
  cyan:    { bar: "bg-cyan-500",    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",        time: "text-cyan-600"    },
  rose:    { bar: "bg-rose-500",    badge: "bg-rose-100 text-rose-700 border-rose-200",        time: "text-rose-600"    },
};

function getColor(title) {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("llm") || t.includes("language") || t.includes("prompt") || t.includes("rlhf")) return "violet";
  if (t.includes("deep learning") || t.includes("machine learning") || t.includes("neural") || t.includes("vision")) return "indigo";
  if (t.includes("web") || t.includes("react") || t.includes("next") || t.includes("full")) return "blue";
  if (t.includes("devops") || t.includes("mlops") || t.includes("cloud") || t.includes("backend")) return "emerald";
  if (t.includes("startup") || t.includes("fundrais")) return "amber";
  if (t.includes("rag") || t.includes("vector") || t.includes("embed")) return "cyan";
  if (t.includes("ethic") || t.includes("bias")) return "rose";
  return "indigo";
}

function Initials({ name }) {
  const parts = (name || "?").split(" ");
  const letters = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 border border-slate-200">
      {letters}
    </div>
  );
}

function TalkRow({ talk, index, renderExtra }) {
  const c = TOPIC_COLORS[getColor(talk.title)];
  return (
    <div
      className="group bg-white hover:bg-slate-50/80 border border-slate-100 hover:border-slate-200 rounded-2xl shadow-sm hover:shadow-md animate-slide-up overflow-hidden transition-all duration-200"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex gap-4 p-4">
        <div className={`w-1 rounded-full flex-shrink-0 ${c.bar}`} />

        <div className={`w-16 flex-shrink-0 font-mono text-sm font-semibold ${c.time} pt-0.5`}>
          {talk.start_time}:00
          <span className="block text-xs text-slate-400 font-normal">{talk.end_time}:00</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-slate-900 font-semibold text-sm leading-snug">{talk.title}</p>
          {talk.description && (
            <p className="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">{talk.description}</p>
          )}
          {talk.date && (
            <span className={`inline-block mt-2 text-[10px] font-medium border px-2 py-0.5 rounded-full ${c.badge}`}>
              {talk.date}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Initials name={talk.speaker} />
          <p className="text-slate-400 text-[11px] max-w-[100px] text-right leading-tight">{talk.speaker}</p>
        </div>
      </div>

      {renderExtra && renderExtra(talk)}
    </div>
  );
}

export default function Timeline({ talks = [], renderExtra }) {
  if (!talks.length) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-3">🎯</p>
        <p className="text-slate-400 text-sm">No talks to display.</p>
      </div>
    );
  }

  const groups = talks.reduce((acc, t) => {
    const key = t.date || "Unscheduled";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.keys(groups).sort().map((date) => (
        <div key={date}>
          {date !== "Unscheduled" && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <h3 className="text-slate-700 font-semibold text-sm">
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </h3>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-xs">{groups[date].length} talk{groups[date].length !== 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="space-y-2.5">
            {groups[date].map((talk, i) => <TalkRow key={talk.id ?? i} talk={talk} index={i} renderExtra={renderExtra} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
