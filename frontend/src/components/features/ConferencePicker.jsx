import { useEffect, useState } from "react";
import { getConferences } from "../../services/api";

// All color variants that appear in conferences.json themes.
// Keys are the first color name extracted from "from-{color}-... to-..."
const COLOR_VARIANTS = {
  violet:  { border: "border-violet-200",  btn: "bg-violet-600  hover:bg-violet-700",  badge: "bg-violet-200  text-violet-800  border-violet-300",  cardBg: "bg-violet-50"  },
  blue:    { border: "border-blue-200",    btn: "bg-blue-600    hover:bg-blue-700",    badge: "bg-blue-200    text-blue-800    border-blue-300",    cardBg: "bg-blue-50"    },
  emerald: { border: "border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700", badge: "bg-emerald-200 text-emerald-800 border-emerald-300", cardBg: "bg-emerald-50" },
  slate:   { border: "border-slate-300",   btn: "bg-slate-600   hover:bg-slate-700",   badge: "bg-slate-200   text-slate-800   border-slate-300",   cardBg: "bg-slate-50"   },
  red:     { border: "border-red-200",     btn: "bg-red-600     hover:bg-red-700",     badge: "bg-red-200     text-red-800     border-red-300",     cardBg: "bg-red-50"     },
  amber:   { border: "border-amber-200",   btn: "bg-amber-600   hover:bg-amber-700",   badge: "bg-amber-200   text-amber-800   border-amber-300",   cardBg: "bg-amber-50"   },
  sky:     { border: "border-sky-200",     btn: "bg-sky-600     hover:bg-sky-700",     badge: "bg-sky-200     text-sky-800     border-sky-300",     cardBg: "bg-sky-50"     },
  yellow:  { border: "border-yellow-200",  btn: "bg-yellow-500  hover:bg-yellow-600",  badge: "bg-yellow-200  text-yellow-800  border-yellow-300",  cardBg: "bg-yellow-50"  },
  orange:  { border: "border-orange-200",  btn: "bg-orange-600  hover:bg-orange-700",  badge: "bg-orange-200  text-orange-800  border-orange-300",  cardBg: "bg-orange-50"  },
  cyan:    { border: "border-cyan-200",    btn: "bg-cyan-600    hover:bg-cyan-700",    badge: "bg-cyan-200    text-cyan-800    border-cyan-300",    cardBg: "bg-cyan-50"    },
  fuchsia: { border: "border-fuchsia-200", btn: "bg-fuchsia-600 hover:bg-fuchsia-700", badge: "bg-fuchsia-200 text-fuchsia-800 border-fuchsia-300", cardBg: "bg-fuchsia-50" },
  lime:    { border: "border-lime-200",    btn: "bg-lime-600    hover:bg-lime-700",    badge: "bg-lime-200    text-lime-800    border-lime-300",    cardBg: "bg-lime-50"    },
  pink:    { border: "border-pink-200",    btn: "bg-pink-600    hover:bg-pink-700",    badge: "bg-pink-200    text-pink-800    border-pink-300",    cardBg: "bg-pink-50"    },
  teal:    { border: "border-teal-200",    btn: "bg-teal-600    hover:bg-teal-700",    badge: "bg-teal-200    text-teal-800    border-teal-300",    cardBg: "bg-teal-50"    },
  indigo:  { border: "border-indigo-200",  btn: "bg-indigo-600  hover:bg-indigo-700",  badge: "bg-indigo-200  text-indigo-800  border-indigo-300",  cardBg: "bg-indigo-50"  },
  rose:    { border: "border-rose-200",    btn: "bg-rose-600    hover:bg-rose-700",    badge: "bg-rose-200    text-rose-800    border-rose-300",    cardBg: "bg-rose-50"    },
};

// Full gradient strings must be static literals so Tailwind includes them in the bundle.
const CONF_GRADIENTS = {
  "ai-world-2025":      "bg-gradient-to-r from-violet-500 to-indigo-600",
  "webtech-2025":       "bg-gradient-to-r from-blue-500 to-cyan-600",
  "ml-europe-2025":     "bg-gradient-to-r from-emerald-500 to-teal-600",
  "neurips-2025":       "bg-gradient-to-r from-slate-500 to-blue-700",
  "cybersec-2026":      "bg-gradient-to-r from-red-500 to-rose-600",
  "web3-summit-2026":   "bg-gradient-to-r from-amber-500 to-orange-500",
  "kubecon-eu-2026":    "bg-gradient-to-r from-sky-500 to-blue-600",
  "pycon-2026":         "bg-gradient-to-r from-yellow-500 to-amber-600",
  "data-ai-2026":       "bg-gradient-to-r from-orange-500 to-red-500",
  "react-summit-2026":  "bg-gradient-to-r from-cyan-500 to-sky-500",
  "icml-2026":          "bg-gradient-to-r from-fuchsia-500 to-purple-600",
  "oss-summit-2026":    "bg-gradient-to-r from-lime-500 to-green-600",
  "healthtech-ai-2026": "bg-gradient-to-r from-pink-500 to-rose-500",
};

function getColors(themeStr) {
  const match = themeStr?.match(/from-([a-z]+)-/);
  const key = match?.[1] || "violet";
  return COLOR_VARIANTS[key] || COLOR_VARIANTS.violet;
}

const selectClass =
  "bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium " +
  "focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:border-violet-400 " +
  "hover:border-slate-300 transition-all cursor-pointer";

function getMonth(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleString("en-US", { month: "long" });
}

export default function ConferencePicker({ onSelect }) {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    getConferences()
      .then(setConferences)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const countries = [...new Set(conferences.map((c) => c.country).filter(Boolean))].sort();
  const months = [...new Set(conferences.map((c) => getMonth(c.date_start)))];

  const filtered = conferences.filter((c) => {
    if (countryFilter && c.country !== countryFilter) return false;
    if (monthFilter && getMonth(c.date_start) !== monthFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Filter by</span>

        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={selectClass}>
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={selectClass}>
          <option value="">All Months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {(countryFilter || monthFilter) && (
          <button
            onClick={() => { setCountryFilter(""); setMonthFilter(""); }}
            className="text-xs text-slate-400 hover:text-violet-600 transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-slate-400 text-xs">
          {filtered.length} of {conferences.length} conferences
        </span>
      </div>

      {/* Conference grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm font-medium">No conferences match these filters.</p>
          <button
            onClick={() => { setCountryFilter(""); setMonthFilter(""); }}
            className="mt-2 text-xs text-violet-500 hover:text-violet-700 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((conf) => {
            const colors = getColors(conf.theme);
            return (
              <button
                key={conf.id}
                onClick={() => onSelect(conf)}
                className={`group text-left rounded-2xl overflow-hidden border-2 ${colors.border} ${colors.cardBg} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200`}
              >
                {/* Gradient header */}
                <div className={`relative ${CONF_GRADIENTS[conf.id] || "bg-gradient-to-r from-violet-500 to-indigo-600"} px-4 py-5`}>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative">
                    <p className="text-white font-black text-sm leading-tight drop-shadow">{conf.name}</p>
                    <p className="text-white/80 text-[11px] mt-0.5">{conf.location}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-3.5 flex flex-col gap-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${colors.badge}`}>
                      📍 {conf.venue}
                    </span>
                    <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${colors.badge}`}>
                      🗓 {conf.dates}
                    </span>
                  </div>

                  <div className={`w-full text-center text-white text-[11px] font-semibold py-1.5 rounded-lg ${colors.btn} transition-colors mt-0.5`}>
                    Select →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
