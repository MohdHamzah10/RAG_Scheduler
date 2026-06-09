import { useEffect, useState } from "react";
import { getAllTalks } from "../../services/api";

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function FullDayForm({ conference, onSubmit }) {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllTalks(conference.id)
      .then((talks) => {
        const unique = [...new Set(talks.map((t) => t.date).filter(Boolean))].sort();
        setDates(unique);
        setSelectedDate(unique[0] || "");
      })
      .catch(() => {});
  }, [conference.id]);

  const handleSubmit = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(selectedDate);
    } catch (err) {
      setError(err?.message || "Failed to build schedule. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wider">
          Pick a day
        </p>
        <div className="flex flex-col gap-2">
          {dates.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            </div>
          )}
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedDate === d
                  ? "border-violet-400 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/40"
              }`}
            >
              <span className="font-semibold">{formatDate(d)}</span>
              <span className="text-xs text-slate-400 ml-2 font-normal">{d}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <p className="text-indigo-700 text-xs leading-relaxed">
          Fills every time slot with the best available talk — no interest query needed.
          Conflicts are resolved automatically.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedDate}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          loading || !selectedDate
            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
        }`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Building your day…
          </>
        ) : (
          "Build Full Day Schedule →"
        )}
      </button>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </div>
  );
}
