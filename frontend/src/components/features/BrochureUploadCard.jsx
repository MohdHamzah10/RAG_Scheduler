import { useState, useRef } from "react";
import { uploadPdf } from "../../services/api";

export default function BrochureUploadCard({ pdfSession, onUploaded, onReset }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") { setFile(f); setError(""); }
    else setError("Please drop a PDF file.");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      onUploaded(await uploadPdf(file));
    } catch (err) {
      setError(err.message || "Failed to parse PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError("");
    onReset();
  };

  return (
    <div className="flex flex-col gap-4 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/60 sticky top-28 self-start">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0">
          📄
        </div>
        <div>
          <p className="text-slate-800 font-bold text-sm">Upload Brochure</p>
          <p className="text-slate-400 text-[11px] leading-tight mt-0.5">For conferences not listed</p>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {pdfSession ? (
        /* ── Success state ── */
        <div className="flex flex-col gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</div>
              <p className="text-emerald-800 font-semibold text-xs">{pdfSession.talks_found} talks found</p>
            </div>
            {pdfSession.preview?.length > 0 && (
              <ul className="space-y-1">
                {pdfSession.preview.map((t, i) => (
                  <li key={i} className="text-emerald-700/80 text-[11px] flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block mt-1.5 flex-shrink-0" />
                    <span className="line-clamp-1">{t}</span>
                  </li>
                ))}
                {pdfSession.talks_found > 3 && (
                  <li className="text-emerald-600/50 text-[11px] pl-2.5">+ {pdfSession.talks_found - 3} more</li>
                )}
              </ul>
            )}
          </div>

          <p className="text-slate-400 text-[11px] text-center">
            Describe your interests in the panel →
          </p>

          <button
            onClick={handleReset}
            className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 text-xs font-medium transition-all"
          >
            ↩ Upload different PDF
          </button>
        </div>
      ) : (
        /* ── Upload state ── */
        <div className="flex flex-col gap-3">
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Drag & drop your conference schedule PDF to extract talks and build a custom schedule.
          </p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`w-full py-6 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all duration-200 ${
              dragging
                ? "border-amber-400 bg-amber-50"
                : file
                ? "border-emerald-400 bg-emerald-50"
                : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 bg-slate-50/60"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-base">✓</div>
                <p className="text-emerald-700 font-medium text-xs px-2 truncate max-w-full">{file.name}</p>
                <p className="text-slate-400 text-[10px]">Click to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-slate-500 text-xs font-medium">Drop PDF here</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    or <span className="text-amber-600 underline underline-offset-2">browse file</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-[11px] text-center">{error}</p>}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 ${
              !file || loading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-200 hover:-translate-y-0.5"
            }`}
          >
            {loading ? (
              <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Parsing…</>
            ) : "Parse & Build Schedule →"}
          </button>
        </div>
      )}
    </div>
  );
}
