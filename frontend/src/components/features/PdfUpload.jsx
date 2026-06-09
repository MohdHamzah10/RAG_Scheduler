import { useState, useRef } from "react";
import { uploadPdf } from "../../services/api";

export default function PdfUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") { setFile(f); setError(""); }
    else setError("Please upload a PDF file.");
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
      setError(err.message || "Failed to parse PDF. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`w-full p-12 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all duration-200 ${
          dragging
            ? "border-violet-400 bg-violet-50"
            : file
            ? "border-emerald-400 bg-emerald-50"
            : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 bg-slate-50"
        }`}
      >
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 text-2xl">✓</div>
            <p className="text-emerald-700 font-semibold text-sm">{file.name}</p>
            <p className="text-slate-400 text-xs">Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl border border-slate-200">📄</div>
            <div>
              <p className="text-slate-600 text-sm font-medium">Drop your conference PDF here</p>
              <p className="text-slate-400 text-xs mt-1">
                or <span className="text-violet-600 underline underline-offset-2">click to browse</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          !file || loading
            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5"
        }`}
      >
        {loading ? (
          <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />Parsing PDF…</>
        ) : "Parse & Continue →"}
      </button>
    </div>
  );
}
