// D:\Project\SB\frontend\src\hooks\useFocusAlert.js
import { useEffect, useState } from "react";

export default function useFocusAlert(enabled = true, message = "Stay focused!") {
  const [blurCount, setBlurCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // request notification permission once
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch (e) {}
    }

    const onBlur = () => {
      setBlurCount((c) => c + 1);
      // show a tiny in-app banner
      setShowBanner(true);
      // try the Notification API if allowed
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Focus mode", { body: message });
        } catch (e) {}
      }
    };
    const onFocus = () => {
      // hide the banner on return after a short delay
      setTimeout(() => setShowBanner(false), 300);
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, message]);

  return { blurCount, showBanner, setShowBanner };
}
