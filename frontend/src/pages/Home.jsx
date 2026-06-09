import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import BrochureUploadCard from "../components/features/BrochureUploadCard";
import ConferencePicker from "../components/features/ConferencePicker";
import StructuredForm from "../components/features/StructuredForm";
import InputBox from "../components/features/InputBox";
import FullDayForm from "../components/features/FullDayForm";
import AllTalksCard from "../components/features/AllTalksCard";
import { getSchedule, getScheduleFromPdf, fullDay } from "../services/api";

const THEME_BANNER = {
  "from-violet-500 to-indigo-600": "border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50",
  "from-blue-500 to-cyan-600":     "border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50",
  "from-emerald-500 to-teal-600":  "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50",
};

export default function Home() {
  const [conference, setConference] = useState(null);
  const [pdfSession, setPdfSession] = useState(null);
  const [filters, setFilters] = useState({});
  const [scheduleMode, setScheduleMode] = useState("interest");
  const navigate = useNavigate();
  const location = useLocation();

  // Restore conference + mode when coming back from Results
  useEffect(() => {
    if (location.state?.restoreConference) {
      try {
        const stored = localStorage.getItem("lastConference");
        if (stored) setConference(JSON.parse(stored));
      } catch {}
      const mode = localStorage.getItem("lastScheduleMode");
      if (mode) setScheduleMode(mode);
    }
  }, []);

  const handleConferenceSelect = (conf) => {
    setConference(conf);
    setPdfSession(null);
    setFilters({});
    setScheduleMode("interest");
  };

  const handlePdfUploaded = (session) => {
    setPdfSession(session);
    setConference(null);
    setFilters({});
  };

  const handlePdfReset = () => {
    setPdfSession(null);
  };

  const saveBackState = (conf, mode) => {
    localStorage.setItem("lastConference", JSON.stringify(conf));
    localStorage.setItem("lastScheduleMode", mode);
  };

  const handleBrowseSubmit = async (input) => {
    const data = await getSchedule({ text: input, filters, conferenceId: conference?.id });
    if (conference?.id) localStorage.setItem(`query_${conference.id}`, input);
    saveBackState(conference, "interest");
    localStorage.setItem("scheduleData", JSON.stringify(data));
    localStorage.setItem("userQuery", input);
    localStorage.setItem("conferenceInfo", JSON.stringify(
      conference ? { name: conference.name, location: conference.location, dates: conference.dates } : null
    ));
    navigate("/results");
  };

  const handleFullDaySubmit = async (date) => {
    const data = await fullDay({ conferenceId: conference.id, date });
    saveBackState(conference, "fullday");
    localStorage.setItem("scheduleData", JSON.stringify(data));
    localStorage.setItem("userQuery", "");
    localStorage.setItem("conferenceInfo", JSON.stringify(
      { name: conference.name, location: conference.location, dates: conference.dates }
    ));
    navigate("/results");
  };

  const handlePdfSubmit = async (input) => {
    const data = await getScheduleFromPdf({ session_id: pdfSession.session_id, text: input });
    localStorage.setItem("scheduleData", JSON.stringify(data));
    localStorage.setItem("userQuery", input);
    localStorage.setItem("conferenceInfo", JSON.stringify(null));
    navigate("/results");
  };

  // Which panel to show on the right
  const rightPanel = pdfSession ? "pdf" : conference ? "schedule" : "picker";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/60 to-indigo-50/80 relative overflow-hidden">
      {/* Soft glow accents */}
      <div className="pointer-events-none absolute top-[-80px] left-[10%] w-[500px] h-[500px] bg-violet-300/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[5%] w-[400px] h-[400px] bg-indigo-300/20 rounded-full blur-3xl" />

      <Navbar />

      <div className="relative pt-28 pb-20 flex flex-col items-center px-4 sm:px-6 lg:px-10">
        {/* Hero */}
        <div className="animate-fade-in text-center mb-10 max-w-3xl">
          <span className="inline-block text-violet-700 text-xs font-bold tracking-[0.2em] uppercase bg-violet-100 border border-violet-200 px-4 py-1.5 rounded-full mb-5">
            RAG-Powered Scheduling
          </span>
          <h1 className="text-5xl sm:text-6xl font-black text-slate-900 leading-tight mb-4">
            Build Your Perfect{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
              Conference Schedule
            </span>
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Select a conference below, or upload a brochure PDF for any event not yet listed.
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="w-full max-w-[1400px] animate-slide-up flex flex-col lg:flex-row gap-5 items-start">

          {/* ── LEFT: Brochure upload card — hidden once a conference is selected ── */}
          {rightPanel !== "schedule" && (
            <div className="w-full lg:w-72 flex-shrink-0">
              <BrochureUploadCard
                pdfSession={pdfSession}
                onUploaded={handlePdfUploaded}
                onReset={handlePdfReset}
              />
            </div>
          )}

          {/* ── RIGHT: Dynamic panel ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* ──── PANEL: Conference Picker ──── */}
            {rightPanel === "picker" && (
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/60 animate-fade-in">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
                  <p className="text-slate-700 font-semibold text-sm">Select a conference</p>
                </div>
                <ConferencePicker onSelect={handleConferenceSelect} />
              </div>
            )}

            {/* ──── PANEL: Schedule Builder (listed conference) ──── */}
            {rightPanel === "schedule" && (
              <>
                {/* Selected conference banner */}
                <div className={`w-full flex items-center justify-between border rounded-2xl px-4 py-3 animate-fade-in ${THEME_BANNER[conference.theme] || "border-violet-200 bg-violet-50"}`}>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
                    <div className="min-w-0">
                      <p className="text-slate-800 font-semibold text-sm">{conference.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{conference.location} · {conference.venue} · {conference.dates}</p>
                      {conference.description && (
                        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{conference.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setConference(null); setFilters({}); }}
                    className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 bg-white px-3 py-1.5 rounded-lg transition-all"
                  >
                    ← Back
                  </button>
                </div>

                {/* Schedule form card */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/60 animate-slide-up">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
                    <p className="text-slate-700 font-semibold text-sm">Build your schedule</p>
                  </div>

                  {/* Mode tabs */}
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
                    {[
                      { id: "interest", label: "By Interest" },
                      { id: "fullday",  label: "Full Day"    },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setScheduleMode(id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                          scheduleMode === id
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* By Interest mode */}
                  {scheduleMode === "interest" && (
                    <div className="flex flex-col gap-5">
                      <StructuredForm onChange={setFilters} conference={conference} />
                      <div className="border-t border-slate-100 pt-5">
                        <p className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wider">
                          Describe your interests
                        </p>
                        <InputBox
                          key={conference.id}
                          initialValue={localStorage.getItem(`query_${conference.id}`) || ""}
                          onSubmit={handleBrowseSubmit}
                        />
                      </div>
                    </div>
                  )}

                  {/* Full Day mode */}
                  {scheduleMode === "fullday" && (
                    <FullDayForm conference={conference} onSubmit={handleFullDaySubmit} />
                  )}
                </div>

                {/* All talks for this conference */}
                <AllTalksCard conferenceId={conference.id} />
              </>
            )}

            {/* ──── PANEL: PDF Schedule Builder ──── */}
            {rightPanel === "pdf" && (
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/60 animate-slide-up">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">📄</div>
                  <div>
                    <p className="text-slate-700 font-semibold text-sm">Schedule from your PDF</p>
                    <p className="text-slate-400 text-xs">{pdfSession.talks_found} talks extracted · ready to search</p>
                  </div>
                </div>

                {/* Talks preview */}
                {pdfSession.preview?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 mb-5">
                    <p className="text-amber-700 text-xs font-semibold mb-2">Talks found in your PDF:</p>
                    <ul className="space-y-1">
                      {pdfSession.preview.map((t, i) => (
                        <li key={i} className="text-amber-800/70 text-xs flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-amber-400 inline-block mt-1.5 flex-shrink-0" />{t}
                        </li>
                      ))}
                      {pdfSession.talks_found > 3 && (
                        <li className="text-amber-600/50 text-xs pl-3">…and {pdfSession.talks_found - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-5">
                  <p className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wider">
                    Describe your interests
                  </p>
                  <InputBox onSubmit={handlePdfSubmit} />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Info card */}
        <div className="w-full max-w-[1400px] mt-8 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/40">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-base">💡</span>
              <p className="text-slate-700 font-bold text-sm">Tips for a better schedule</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  icon: "🎯",
                  title: "Be specific",
                  body: "Mention your skill level and exact topics — e.g. 'beginner RAG with Python' gets sharper results than 'AI'.",
                  accent: "bg-violet-50 border-violet-100",
                  iconBg: "bg-violet-100 text-violet-600",
                },
                {
                  icon: "🕐",
                  title: "Use time filters",
                  body: "Pick Morning or Afternoon to avoid talks that clash with meals, travel, or workshops you already have.",
                  accent: "bg-blue-50 border-blue-100",
                  iconBg: "bg-blue-100 text-blue-600",
                },
                {
                  icon: "📄",
                  title: "Upload any PDF",
                  body: "Got a brochure for a conference not listed here? Drop it in the left panel and the AI extracts all talks automatically.",
                  accent: "bg-amber-50 border-amber-100",
                  iconBg: "bg-amber-100 text-amber-600",
                },
                {
                  icon: "🤖",
                  title: "Ask the chatbot",
                  body: "Use the chat bubble (bottom-right) to ask things like 'which talks are for beginners?' or 'who speaks about ethics?'.",
                  accent: "bg-indigo-50 border-indigo-100",
                  iconBg: "bg-indigo-100 text-indigo-600",
                },
                {
                  icon: "⇄",
                  title: "Swap talks",
                  body: "On the results page, expand 'talks not included' and hit Swap — the AI resolves any conflict and picks the better fit.",
                  accent: "bg-emerald-50 border-emerald-100",
                  iconBg: "bg-emerald-100 text-emerald-600",
                },
                {
                  icon: "📥",
                  title: "Export to PDF",
                  body: "Download your final schedule as a clean PDF with talk times, speakers, and descriptions — ready to print or share.",
                  accent: "bg-rose-50 border-rose-100",
                  iconBg: "bg-rose-100 text-rose-600",
                },
              ].map(({ icon, title, body, accent, iconBg }) => (
                <div key={title} className={`flex flex-col gap-2.5 border rounded-2xl p-3.5 ${accent}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${iconBg}`}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold text-xs mb-1">{title}</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
