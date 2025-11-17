// D:\Project\SB\frontend\src\components\Pomodoro.jsx
import React, { useEffect, useRef, useState } from "react";

export default function Pomodoro({
  workMinutes = 25,
  breakMinutes = 5,
  autoStart = false
}) {
  const WORK_SECONDS = workMinutes * 60;
  const BREAK_SECONDS = breakMinutes * 60;

  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [mode, setMode] = useState("work"); // 'work' or 'break'
  const [running, setRunning] = useState(autoStart);
  const intervalRef = useRef(null);

  // format helper
  const format = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  useEffect(() => {
    // cleanup on unmount
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            // switch modes when timer finishes
            if (mode === "work") {
              setMode("break");
              setSecondsLeft(BREAK_SECONDS);
              setRunning(false); // stop automatically at end (user can start break)
              // optional: play a sound or show notification
            } else {
              setMode("work");
              setSecondsLeft(WORK_SECONDS);
              setRunning(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  function handleStart() {
    setRunning(true);
  }
  function handlePause() {
    setRunning(false);
  }
  function handleReset() {
    setRunning(false);
    if (mode === "work") setSecondsLeft(WORK_SECONDS);
    else setSecondsLeft(BREAK_SECONDS);
  }
  function handleSkip() {
    // skip current session
    setRunning(false);
    if (mode === "work") {
      setMode("break");
      setSecondsLeft(BREAK_SECONDS);
    } else {
      setMode("work");
      setSecondsLeft(WORK_SECONDS);
    }
  }

  return (
    <div className="p-4 border rounded bg-white max-w-md">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-gray-500">Pomodoro ({mode === "work" ? "Work" : "Break"})</div>
          <div className="text-3xl font-mono mt-2">{format(secondsLeft)}</div>
        </div>
        <div className="flex flex-col gap-2">
          {running ? (
            <button onClick={handlePause} className="px-3 py-2 bg-gray-300 rounded">Pause</button>
          ) : (
            <button onClick={handleStart} className="px-3 py-2 bg-green-600 text-white rounded">Start</button>
          )}
          <button onClick={handleReset} className="px-3 py-2 bg-yellow-100 rounded">Reset</button>
          <button onClick={handleSkip} className="px-3 py-2 bg-blue-100 rounded">Skip</button>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-3">Work: {workMinutes}m • Break: {breakMinutes}m</div>
    </div>
  );
}
