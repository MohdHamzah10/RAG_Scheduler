import { useEffect, useState } from "react";
import { getAllTalks } from "../../services/api";

const TOPIC_COLORS = {
  violet:  "bg-violet-100 text-violet-700 border-violet-200",
  indigo:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  blue:    "bg-blue-100 text-blue-700 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber:   "bg-amber-100 text-amber-700 border-amber-200",
  cyan:    "bg-cyan-100 text-cyan-700 border-cyan-200",
  rose:    "bg-rose-100 text-rose-700 border-rose-200",
};

const BAR_COLORS = {
  violet: "bg-violet-500", indigo: "bg-indigo-500", blue: "bg-blue-500",
  emerald: "bg-emerald-500", amber: "bg-amber-500", cyan: "bg-cyan-500", rose: "bg-rose-500",
};

function getColor(title) {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("llm") || t.includes("language") || t.includes("prompt") || t.includes("rlhf") || t.includes("agent")) return "violet";
  if (t.includes("deep learning") || t.includes("machine learning") || t.includes("neural") || t.includes("vision") || t.includes("foundation") || t.includes("multimodal") || t.includes("federated") || t.includes("causal") || t.includes("automl") || t.includes("tinyml")) return "indigo";
  if (t.includes("web") || t.includes("react") || t.includes("next") || t.includes("full") || t.includes("css") || t.includes("wasm") || t.includes("typescript") || t.includes("graphql") || t.includes("edge") || t.includes("micro-front")) return "blue";
  if (t.includes("devops") || t.includes("mlops") || t.includes("cloud") || t.includes("backend") || t.includes("kubernetes") || t.includes("serverless") || t.includes("kubeflow")) return "emerald";
  if (t.includes("startup") || t.includes("fundrais")) return "amber";
  if (t.includes("rag") || t.includes("vector") || t.includes("embed")) return "cyan";
  if (t.includes("ethic") || t.includes("bias") || t.includes("responsible") || t.includes("privacy") || t.includes("security") || t.includes("owasp") || t.includes("climate")) return "rose";
  return "indigo";
}

function getDayLabel(date, sortedDates) {
  const idx = sortedDates.indexOf(date);
  const d = new Date(date + "T00:00:00");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  return `Day ${idx + 1} · ${mon} ${day}`;
}

export default function AllTalksCard({ conferenceId }) {
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAllTalks(conferenceId)
      .then(setTalks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conferenceId]);

  const groups = talks.reduce((acc, t) => {
    const key = t.date || "Other";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(groups).sort();

  return (
    <div className="w-full mt-4 animate-fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🗓️</span>
          <span className="text-slate-700 font-semibold text-sm">Browse All Conference Talks</span>
          {!loading && (
            <span className="bg-violet-100 text-violet-700 border border-violet-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {talks.length} talks
            </span>
          )}
        </div>
        <span className={`text-slate-400 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-2 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-slide-up">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-3 px-5 py-3 bg-slate-50/80">
                    <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                    <span className="text-slate-600 font-semibold text-xs tracking-wide uppercase">
                      {getDayLabel(date, sortedDates)}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-slate-400 text-xs">{groups[date].length} talks</span>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {groups[date].sort((a, b) => a.start_time - b.start_time).map((talk) => {
                      const colorKey = getColor(talk.title);
                      return (
                        <div key={talk.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group/row">
                          <div className={`w-0.5 h-full min-h-[36px] rounded-full flex-shrink-0 mt-0.5 ${BAR_COLORS[colorKey]}`} />

                          <div className="w-12 flex-shrink-0 text-xs font-mono font-semibold text-slate-400 pt-0.5">
                            {talk.start_time}:00
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 font-semibold text-sm leading-snug">{talk.title}</p>
                            <p className="text-slate-400 text-xs mt-0.5 truncate">{talk.speaker}</p>
                          </div>

                          <span className={`flex-shrink-0 text-[10px] font-semibold border px-2 py-0.5 rounded-full ${TOPIC_COLORS[colorKey]}`}>
                            {talk.end_time - talk.start_time}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
