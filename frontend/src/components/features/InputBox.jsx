import { useState } from "react";

export default function InputBox({ onSubmit, initialValue = "" }) {
  const [text, setText] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSubmit(text);
    } catch (err) {
      setError(err?.message || "Failed to generate schedule. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. beginner AI talks, startup sessions, anything about machine learning…"
        className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl px-5 py-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 hover:border-slate-300 transition-all leading-relaxed shadow-sm"
      />

      <button
        onClick={handleClick}
        disabled={loading || !text.trim()}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          loading || !text.trim()
            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
        }`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Generating your schedule…
          </>
        ) : (
          "Generate My Schedule →"
        )}
      </button>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </div>
  );
}
