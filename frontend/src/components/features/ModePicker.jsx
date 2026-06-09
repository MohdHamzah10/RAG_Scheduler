const tabs = [
  { id: "browse", icon: "🔍", label: "Browse Talks" },
  { id: "upload", icon: "📄", label: "Upload PDF" },
];

export default function ModePicker({ mode, onChange }) {
  return (
    <div className="inline-flex bg-slate-100 border border-slate-200 p-1 rounded-2xl mb-8">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            mode === t.id
              ? "bg-white text-violet-700 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
