// D:\Project\SB\frontend\src\pages\SummarizePage.jsx
import React, { useEffect, useState } from "react";
import Pomodoro from "../components/Pomodoro";
import ScratchNotes from "../components/ScratchNotes";
import useFocusAlert from "../hooks/useFocusAlert";

export default function SummarizePage() {
  const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  // text + results
  const [text, setText] = useState("");
  const [abstractive, setAbstractive] = useState("");
  const [extractive, setExtractive] = useState("");
  const [usedParams, setUsedParams] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // generation controls
  const [minLength, setMinLength] = useState(40);
  const [maxLength, setMaxLength] = useState(160);
  const [numBeams, setNumBeams] = useState(6);
  const [extractiveK, setExtractiveK] = useState(2);

  // focus alert
  const { blurCount, showBanner, setShowBanner } = useFocusAlert(true, "Focus — stay on the summarizer");

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleSummarize();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, minLength, maxLength, numBeams, extractiveK]);

  async function handleSummarize() {
    setError("");
    setAbstractive("");
    setExtractive("");
    setUsedParams(null);

    if (!text || text.trim().length < 10) {
      setError("Please enter at least 10 characters to summarize.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        text,
        min_length: Number(minLength),
        max_length: Number(maxLength),
        num_beams: Number(numBeams),
        extractive_k: Number(extractiveK),
      };

      const res = await fetch(`${API}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const abs = data.abstractive_summary ?? data.summary ?? null;
      const ext = data.extractive_summary ?? null;

      setAbstractive(abs || "");
      setExtractive(ext || "");
      setUsedParams(data.used_generation_params || null);
    } catch (err) {
      console.error("Summarize error:", err);
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(textToCopy) {
    if (!textToCopy) return;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {})
      .catch((e) => console.error("Copy failed", e));
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Focus banner */}
      {showBanner && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-300 text-sm text-yellow-800 px-4 py-2 rounded shadow">
          You left the page — stay focused!
          <button onClick={() => setShowBanner(false)} className="ml-3 underline text-xs">Dismiss</button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Summarizer (Abstractive + Extractive)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Backend: <code className="bg-gray-100 px-2 py-1 rounded">{API}</code>
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Tip: Ctrl/Cmd + Enter to summarize</div>
          <div className="mt-2">Adjust lengths for more/less detail</div>
        </div>
      </div>

      {/* Input */}
      <label className="block text-sm font-medium text-gray-700 mt-6">Input text</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste article or long text here..."
        className="w-full mt-2 h-44 p-3 border rounded resize-vertical focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      {/* Generation controls */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">min</label>
          <input type="number" value={minLength} onChange={(e) => setMinLength(Number(e.target.value))} className="w-20 p-1 border rounded" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">max</label>
          <input type="number" value={maxLength} onChange={(e) => setMaxLength(Number(e.target.value))} className="w-24 p-1 border rounded" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">beams</label>
          <input type="number" value={numBeams} onChange={(e) => setNumBeams(Number(e.target.value))} className="w-20 p-1 border rounded" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">extractive k</label>
          <input type="number" value={extractiveK} onChange={(e) => setExtractiveK(Number(e.target.value))} className="w-20 p-1 border rounded" />
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={handleSummarize} disabled={loading} className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}>{loading ? "Summarizing..." : "Summarize"}</button>
          <button onClick={() => { setText(""); setAbstractive(""); setExtractive(""); setUsedParams(null); setError(""); }} className="px-4 py-2 rounded bg-gray-200">Clear</button>
        </div>
      </div>

      {error && <div className="mt-3 text-red-600">{error}</div>}

      {/* Grid: left = Pomodoro + Notes, right = Results */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-4">
          <Pomodoro workMinutes={25} breakMinutes={5} />
          <ScratchNotes />
        </div>

        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="p-4 border rounded bg-white">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-semibold text-gray-700">Abstractive Summary</h3>
              <div>
                <button onClick={() => copyToClipboard(abstractive)} className="text-xs px-2 py-1 border rounded bg-gray-50">Copy</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-800 min-h-[3.5rem]">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Summarizing...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{abstractive || "(no abstractive summary yet)"}</pre>
              )}
            </div>
          </div>

          <div className="p-4 border rounded bg-white">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-semibold text-gray-700">Extractive (original sentences)</h3>
              <div>
                <button onClick={() => copyToClipboard(extractive)} className="text-xs px-2 py-1 border rounded bg-gray-50">Copy</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-800">
              <pre className="whitespace-pre-wrap">{extractive || "(no extractive summary yet)"}</pre>
            </div>
          </div>

          {usedParams && (
            <div className="p-3 border rounded bg-gray-50 text-xs text-gray-600">
              <strong>Used generation params:</strong> <code className="break-words">{JSON.stringify(usedParams)}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
