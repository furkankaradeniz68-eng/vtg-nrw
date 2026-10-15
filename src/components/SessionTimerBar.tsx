"use client";

import { useEffect, useState } from "react";

// Schmale Leiste ueber dem Header mit der Restzeit bis zur automatischen Abmeldung.
// Grundlage ist das lesbare Begleit-Cookie vtg_session_exp ("{ablauf}-{serverzeit}",
// siehe src/lib/auth.ts), das der Server bei jeder echten Nutzeraktion (Seitenaufruf,
// Wechsel von Link zu Link) neu setzt. Mausbewegungen zaehlen nicht, deshalb laeuft
// die Zeit hier unabhaengig von ihnen weiter. Ohne Cookie (nicht angemeldet) bleibt
// die Leiste unsichtbar.
const COOKIE = "vtg_session_exp";
const WARN_SECONDS = 5 * 60;

function readCookie(): { exp: number; skew: number } | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const [exp, serverNow] = match.slice(COOKIE.length + 1).split("-").map(Number);
  if (!Number.isFinite(exp)) return null;
  // Abweichung der Browser-Uhr von der Server-Uhr (nur beim Lesen des Cookies bekannt).
  return { exp, skew: Number.isFinite(serverNow) ? serverNow - Date.now() : 0 };
}

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SessionTimerBar() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let lastValue = "";
    let skew = 0;
    let exp = 0;
    let loggingOut = false;

    function tick() {
      const match = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
      if (!match) {
        setRemaining(null);
        return;
      }
      // Skew nur neu bestimmen, wenn der Server das Cookie neu gesetzt hat.
      if (match !== lastValue) {
        const parsed = readCookie();
        if (!parsed) {
          setRemaining(null);
          return;
        }
        lastValue = match;
        exp = parsed.exp;
        skew = parsed.skew;
      }
      const seconds = Math.max(0, Math.round((exp - (Date.now() + skew)) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && !loggingOut) {
        loggingOut = true;
        fetch("/api/logout", { method: "POST" })
          .catch(() => {})
          .finally(() => {
            // Begleit-Cookie auch hier loeschen, falls der Abruf scheiterte: sonst
            // wuerde die Login-Seite sofort wieder weiterleiten.
            document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
            window.location.href = "/login?abgelaufen=1";
          });
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (remaining === null) return null;
  const warn = remaining <= WARN_SECONDS;

  return (
    <div
      role="timer"
      aria-live="off"
      className="bg-black px-4 py-1.5 text-center text-xs text-white sm:text-sm"
    >
      {remaining === 0 ? (
        <span>Sie werden jetzt abgemeldet …</span>
      ) : (
        <>
          <span>Automatische Abmeldung in </span>
          <strong className={`tabular-nums ${warn ? "text-vtg-yellow" : ""}`}>{format(remaining)} Min.</strong>
        </>
      )}
    </div>
  );
}
