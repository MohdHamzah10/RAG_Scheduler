import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-violet-200">
            AI
          </div>
          <span className="text-slate-900 font-bold text-lg tracking-tight group-hover:text-violet-600 transition-colors">
            ConferenceAI
          </span>
        </button>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-slate-400 text-xs font-medium tracking-widest uppercase">
            RAG-Powered Scheduler
          </span>
          {pathname === "/results" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/", { state: { restoreConference: true } })}
                className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-all"
              >
                ← Back
              </button>
              <button
                onClick={() => navigate("/")}
                className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg transition-all"
              >
                New Search
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
