import { useState } from "react";

const inputClass =
  "bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm w-full " +
  "focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 " +
  "hover:border-slate-300 transition-all placeholder-slate-400";

export default function StructuredForm({ onChange, conference }) {
  const [form, setForm] = useState({ date: "", time_slot: "", topic: "" });

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
      {[
        {
          label: "Date",
          field: "date",
          element: (
            <div className="flex flex-col gap-1">
              <input
                type="date"
                min={conference?.date_start}
                max={conference?.date_end}
                onChange={(e) => update("date", e.target.value)}
                className={inputClass}
              />
              {conference && (
                <span className="text-[10px] text-slate-400 pl-1">
                  Conference: {conference.dates}
                </span>
              )}
            </div>
          ),
        },
        {
          label: "Time",
          field: "time_slot",
          element: (
            <select onChange={(e) => update("time_slot", e.target.value)} className={inputClass}>
              <option value="">Any time</option>
              <option value="morning">Morning (9–12)</option>
              <option value="afternoon">Afternoon (13–17)</option>
            </select>
          ),
        },
        {
          label: "Topic",
          field: "topic",
          element: (
            <select onChange={(e) => update("topic", e.target.value)} className={inputClass}>
              <option value="">Any topic</option>
              <option value="AI">AI &amp; LLM</option>
              <option value="machine learning">Machine Learning</option>
              <option value="web">Web Dev</option>
              <option value="devops">DevOps / MLOps</option>
              <option value="startup">Startup</option>
            </select>
          ),
        },
      ].map(({ label, field, element }) => (
        <div key={field} className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-semibold tracking-wider uppercase pl-1">
            {label}
          </label>
          {element}
        </div>
      ))}
    </div>
  );
}
