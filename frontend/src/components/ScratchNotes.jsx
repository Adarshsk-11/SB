// D:\Project\SB\frontend\src\components\ScratchNotes.jsx
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "scratch_notes_v1";

export default function ScratchNotes() {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setNotes(saved);
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, notes);
    } catch (e) {
      // ignore storage errors
    }
  }, [notes]);

  return (
    <div className="p-4 border rounded bg-white max-w-md mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Scratch Notes</h3>
        <div className="text-xs text-gray-500">Saved locally</div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Quick notes (auto-saved to this browser)..."
        className="w-full mt-3 p-2 border rounded h-32 resize-none focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button onClick={() => { setNotes(""); localStorage.removeItem(STORAGE_KEY); }} className="px-3 py-1 bg-gray-100 rounded">Clear</button>
        <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(notes)} className="px-3 py-1 bg-green-100 rounded">Copy</button>
      </div>
    </div>
  );
}
