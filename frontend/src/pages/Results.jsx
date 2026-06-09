import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import Navbar from "../components/layout/Navbar";
import Timeline from "../components/features/TimeLine";
import { explainTalk, resolveConflict } from "../services/api";

// ── helpers ───────────────────────────────────────────────────────────────────
function overlaps(a, b) {
  return a.date === b.date && !(a.end_time <= b.start_time || a.start_time >= b.end_time);
}

function sortTalks(arr) {
  return [...arr].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.start_time - b.start_time);
}

// ── Why panel (per talk) ──────────────────────────────────────────────────────
function WhyPanel({ state }) {
  if (!state?.open) return null;
  return (
    <div className="border-t border-slate-100 px-4 py-3 bg-violet-50/60 animate-fade-in">
      {state.loading ? (
        <div className="flex items-center gap-2 text-violet-500 text-xs">
          <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          Analysing match…
        </div>
      ) : (
        <p className="text-violet-800 text-xs leading-relaxed">{state.text}</p>
      )}
    </div>
  );
}

// ── Conflict modal ─────────────────────────────────────────────────────────────
function ConflictModal({ modal, onKeep, onSwitch }) {
  const { incoming, existing, loading, result } = modal;
  const recommended = result?.recommendation; // "a" = existing, "b" = incoming

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 text-base flex-shrink-0">⚡</div>
          <div>
            <p className="text-slate-900 font-bold text-sm">Scheduling Conflict</p>
            <p className="text-slate-400 text-xs">These two talks overlap — which would you like to attend?</p>
          </div>
        </div>

        {/* Talk comparison */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { talk: existing, label: "Current", side: "a" },
            { talk: incoming, label: "Requested", side: "b" },
          ].map(({ talk, label, side }) => {
            const isRec = result && recommended === side;
            return (
              <div
                key={side}
                className={`rounded-2xl border-2 p-3.5 transition-all ${
                  isRec
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isRec ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {label}
                  </span>
                  {isRec && <span className="text-violet-500 text-xs">★ AI pick</span>}
                </div>
                <p className="text-slate-800 font-semibold text-xs leading-snug mb-1">{talk.title}</p>
                <p className="text-slate-400 text-[10px]">{talk.speaker}</p>
                <p className="text-slate-400 text-[10px] mt-0.5 font-mono">
                  {talk.start_time}:00 – {talk.end_time}:00
                </p>
              </div>
            );
          })}
        </div>

        {/* AI reason */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 min-h-[40px] flex items-center">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs w-full justify-center">
              <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              AI is deciding…
            </div>
          ) : (
            <p className="text-slate-600 text-xs leading-relaxed">
              <span className="font-semibold text-violet-600">AI recommends: </span>
              {result?.reason}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onKeep}
            disabled={loading}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              result && recommended === "a"
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Keep current
          </button>
          <button
            onClick={onSwitch}
            disabled={loading}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              result && recommended === "b"
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Switch talk
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Results() {
  const [selected, setSelected] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [explanation, setExplanation] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [conferenceInfo, setConferenceInfo] = useState(null);
  const [whyMap, setWhyMap] = useState({});       // { talkId: { loading, text, open } }
  const [conflictModal, setConflictModal] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("scheduleData");
    if (stored) {
      const d = JSON.parse(stored);
      setSelected(sortTalks(d.selected || []));
      setAlternatives(d.alternatives || []);
      setExplanation(d.explanation || "");
    }
    setUserQuery(localStorage.getItem("userQuery") || "");
    const ci = localStorage.getItem("conferenceInfo");
    if (ci) { try { setConferenceInfo(JSON.parse(ci)); } catch {} }
    setDataLoaded(true);
  }, []);

  // ── Why handler ──────────────────────────────────────────────────────────────
  const handleWhy = async (talk) => {
    const id = talk.id ?? talk.title;
    const current = whyMap[id];
    // Toggle off if already open
    if (current?.open && current?.text) {
      setWhyMap((p) => ({ ...p, [id]: { ...p[id], open: false } }));
      return;
    }
    // Already fetched, just reopen
    if (current?.text) {
      setWhyMap((p) => ({ ...p, [id]: { ...p[id], open: true } }));
      return;
    }
    setWhyMap((p) => ({ ...p, [id]: { loading: true, text: null, open: true } }));
    try {
      const { explanation } = await explainTalk({ userInput: userQuery || "conference talks", talk });
      setWhyMap((p) => ({ ...p, [id]: { loading: false, text: explanation, open: true } }));
    } catch {
      setWhyMap((p) => ({
        ...p,
        [id]: { loading: false, text: "This talk closely aligns with your stated interests in topic and skill level.", open: true },
      }));
    }
  };

  // ── Swap / conflict handler ──────────────────────────────────────────────────
  const handleSwapIn = async (incoming) => {
    const conflicting = selected.find((s) => overlaps(s, incoming));
    if (!conflicting) {
      setSelected((p) => sortTalks([...p, incoming]));
      setAlternatives((p) => p.filter((a) => (a.id ?? a.title) !== (incoming.id ?? incoming.title)));
      return;
    }
    // Open modal while fetching AI decision
    setConflictModal({ incoming, existing: conflicting, loading: true, result: null });
    try {
      const { recommendation, reason } = await resolveConflict({
        userInput: userQuery || "conference talks",
        talkA: conflicting,
        talkB: incoming,
      });
      setConflictModal((p) => p && { ...p, loading: false, result: { recommendation, reason } });
    } catch {
      setConflictModal((p) =>
        p && { ...p, loading: false, result: { recommendation: "a", reason: "Unable to reach AI — choose based on your preference." } }
      );
    }
  };

  const handleConflictKeep = () => {
    if (!conflictModal) return;
    const { incoming } = conflictModal;
    setAlternatives((p) => p.filter((a) => (a.id ?? a.title) !== (incoming.id ?? incoming.title)));
    setConflictModal(null);
  };

  const handleConflictSwitch = () => {
    if (!conflictModal) return;
    const { incoming, existing } = conflictModal;
    setSelected((p) => sortTalks([...p.filter((s) => (s.id ?? s.title) !== (existing.id ?? existing.title)), incoming]));
    setAlternatives((p) => [...p.filter((a) => (a.id ?? a.title) !== (incoming.id ?? incoming.title)), existing]);
    setConflictModal(null);
  };

  // ── ICS calendar export ──────────────────────────────────────────────────────
  const downloadIcs = () => {
    const esc = (s = "") =>
      String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ConferenceAI//Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    selected.forEach((talk, i) => {
      if (!talk.date) return;
      const d = talk.date.replace(/-/g, "");
      const pad = (n) => String(n).padStart(2, "0");
      const start = `${d}T${pad(talk.start_time)}0000`;
      const end   = `${d}T${pad(talk.end_time)}0000`;
      const desc  = esc(`Speaker: ${talk.speaker || ""}\n${talk.description || ""}`);

      lines.push(
        "BEGIN:VEVENT",
        `UID:talk-${talk.id ?? i}@conferenceai`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${esc(talk.title)}`,
        ...(desc ? [`DESCRIPTION:${desc}`] : []),
        ...(conferenceInfo?.location ? [`LOCATION:${esc(conferenceInfo.location)}`] : []),
        "END:VEVENT"
      );
    });

    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "conference-schedule.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF download ─────────────────────────────────────────────────────────────
  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const ml = 18, mr = 18, cw = W - ml - mr;
    let y = 18;

    const pageBreak = (needed = 10) => {
      if (y + needed > H - 15) { doc.addPage(); y = 18; }
    };

    // ── Header band ──
    doc.setFillColor(109, 40, 217); // violet-700
    doc.rect(0, 0, W, 28, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("MY CONFERENCE SCHEDULE", ml, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(220, 210, 255);
    const subLine = [
      conferenceInfo?.name,
      conferenceInfo?.location,
      conferenceInfo?.dates,
    ].filter(Boolean).join("  ·  ");
    if (subLine) doc.text(subLine, ml, 20);

    doc.setTextColor(190, 180, 240);
    doc.setFontSize(8);
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, W - mr, 24, { align: "right" });

    y = 38;

    // ── Interest summary ──
    if (userQuery) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 80, 160);
      const ql = doc.splitTextToSize(`Interests: "${userQuery}"`, cw);
      doc.text(ql, ml, y);
      y += ql.length * 5 + 4;
    }

    // ── Divider ──
    doc.setDrawColor(220, 215, 240);
    doc.setLineWidth(0.3);
    doc.line(ml, y, W - mr, y);
    y += 7;

    // ── Talks grouped by date ──
    const groups = {};
    selected.forEach((t) => {
      const key = t.date || "Unscheduled";
      (groups[key] = groups[key] || []).push(t);
    });

    Object.keys(groups).sort().forEach((date) => {
      pageBreak(18);

      // Day header
      const dayLabel =
        date !== "Unscheduled"
          ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })
          : "Unscheduled";

      doc.setFillColor(245, 243, 255);
      doc.roundedRect(ml, y - 4, cw, 10, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(109, 40, 217);
      doc.text(dayLabel.toUpperCase(), ml + 3, y + 2.5);
      y += 12;

      groups[date]
        .slice()
        .sort((a, b) => a.start_time - b.start_time)
        .forEach((talk) => {
          pageBreak(28);

          // Time pill
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(130, 100, 200);
          doc.text(`${talk.start_time}:00 – ${talk.end_time}:00`, ml, y);

          // Title
          y += 5.5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(20, 20, 40);
          const titleLines = doc.splitTextToSize(talk.title, cw);
          titleLines.forEach((line) => {
            pageBreak(6);
            doc.text(line, ml, y);
            y += 5.5;
          });

          // Speaker
          doc.setFont("helvetica", "oblique");
          doc.setFontSize(9);
          doc.setTextColor(120, 110, 150);
          if (talk.speaker) { doc.text(talk.speaker, ml, y); y += 5; }

          // Description
          if (talk.description) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(90, 85, 110);
            const dl = doc.splitTextToSize(talk.description, cw);
            dl.slice(0, 3).forEach((line) => {
              pageBreak(5);
              doc.text(line, ml, y);
              y += 4.5;
            });
          }

          // Separator
          y += 2;
          doc.setDrawColor(230, 228, 240);
          doc.setLineWidth(0.2);
          doc.line(ml, y, W - mr, y);
          y += 5;
        });

      y += 4;
    });

    // ── Footer ──
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 175, 200);
      doc.text("AI Conference Scheduler", ml, H - 8);
      doc.text(`Page ${i} of ${pages}`, W - mr, H - 8, { align: "right" });
    }

    doc.save("conference-schedule.pdf");
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const renderWhyExtra = (talk) => {
    const id = talk.id ?? talk.title;
    const state = whyMap[id];
    return (
      <>
        <div className="px-4 pb-3 flex items-center justify-between">
          <button
            onClick={() => handleWhy(talk)}
            className="flex items-center gap-1.5 text-[11px] text-violet-500 hover:text-violet-700 font-medium transition-colors"
          >
            <span className="w-4 h-4 rounded-full border border-violet-300 flex items-center justify-center text-[9px] font-bold">?</span>
            {state?.open && state?.text ? "Hide explanation" : "Why was this recommended?"}
          </button>
        </div>
        <WhyPanel state={state} />
      </>
    );
  };

  const renderSwapExtra = (talk) => (
    <div className="px-4 pb-3">
      <button
        onClick={() => handleSwapIn(talk)}
        className="flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-all"
      >
        ⇄ Swap into schedule
      </button>
    </div>
  );

  // ── Early return ─────────────────────────────────────────────────────────────
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/60 to-indigo-50/80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your schedule…</p>
        </div>
      </div>
    );
  }

  if (!selected.length && !alternatives.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/60 to-indigo-50/80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm px-6">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">🔍</div>
          <div>
            <p className="text-slate-700 font-semibold text-base mb-1.5">No talks matched your query</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Try broadening your search terms, removing filters, or selecting a different conference.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-200"
          >
            ← Back to search
          </button>
        </div>
      </div>
    );
  }

  const dates = [...new Set(selected.map((t) => t.date).filter(Boolean))];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/60 to-indigo-50/80 relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-[15%] w-[400px] h-[400px] bg-violet-200/25 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-[10%] w-[300px] h-[300px] bg-indigo-200/25 rounded-full blur-3xl" />

        <Navbar />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-28 pb-24">
          {/* Header */}
          <div className="animate-fade-in mb-8">
            <span className="text-violet-600 text-xs font-bold tracking-[0.2em] uppercase">Your Schedule</span>
            <h1 className="text-3xl font-black text-slate-900 mt-1 mb-2">Here's what we picked for you</h1>
            {conferenceInfo?.name && (
              <p className="text-slate-400 text-xs font-medium mb-1">
                {conferenceInfo.name}{conferenceInfo.location ? ` · ${conferenceInfo.location}` : ""}{conferenceInfo.dates ? ` · ${conferenceInfo.dates}` : ""}
              </p>
            )}
            {explanation && (
              <p className="text-slate-500 text-sm leading-relaxed max-w-xl">{explanation}</p>
            )}
          </div>

          {/* Stats */}
          <div className="animate-slide-up grid grid-cols-3 gap-3 mb-8 max-w-lg">
            {[
              { label: "Talks Selected", value: selected.length },
              { label: "Conference Days", value: dates.length || "—" },
              { label: "Alternatives", value: alternatives.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-slate-900">{value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Timeline with Why? buttons */}
          <div className="animate-slide-up">
            <Timeline talks={selected} renderExtra={renderWhyExtra} />
          </div>

          {/* Alternatives with Swap buttons */}
          {alternatives.length > 0 && (
            <details className="mt-8 group">
              <summary className="flex items-center gap-2 text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-medium transition-colors list-none select-none">
                <span className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center text-[10px] group-open:rotate-90 transition-transform">›</span>
                {alternatives.length} talk{alternatives.length !== 1 ? "s" : ""} not included — click to swap in
              </summary>
              <div className="mt-3">
                <p className="text-slate-400 text-xs mb-3 flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-indigo-100 rounded-full border border-indigo-200 inline-block" />
                  Swapping a talk that conflicts with your schedule will trigger the AI conflict resolver.
                </p>
                <div className="opacity-60 hover:opacity-100 transition-opacity">
                  <Timeline talks={alternatives} renderExtra={renderSwapExtra} />
                </div>
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="mt-10 flex flex-col gap-3 sm:max-w-xl">
            {/* Export row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadPdf}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all duration-200"
              >
                ↓ Download PDF
              </button>
              <button
                onClick={downloadIcs}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 transition-all duration-200 shadow-sm"
              >
                📅 Add to Calendar
              </button>
            </div>

            {/* Navigation row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/", { state: { restoreConference: true } })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 transition-all duration-200 shadow-sm"
              >
                ← Back
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all duration-200"
              >
                New Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict resolver modal */}
      {conflictModal && (
        <ConflictModal
          modal={conflictModal}
          onKeep={handleConflictKeep}
          onSwitch={handleConflictSwitch}
        />
      )}
    </>
  );
}
