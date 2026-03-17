import { useState, useEffect } from "react";
import mhpLogo from "../assets/mhp-logo.png";

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    window.electronAPI?.getVersion().then((v) => setVersion(v));
  }, []);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 1000;

    function tick(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - pct, 3);
      setProgress(eased * 100);

      if (pct < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPhase("done");
        setTimeout(onReady, 300);
      }
    }

    // Small delay before starting the bar
    const t = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 200);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frame);
    };
  }, [onReady]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "done" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "#ffffff" }}
    >
      {/* Logo with entrance animation */}
      <div className="relative animate-splash-logo">
        <img
          src={mhpLogo}
          alt="MHP Construction"
          className="h-28 w-auto"
        />
      </div>

      {/* App name */}
      <div className="mt-6 animate-splash-text">
        <h1 className="text-center text-[22px] font-bold text-[#111318]" style={{ letterSpacing: "-0.03em" }}>
          ProEstimate AI
        </h1>
        <p className="mt-1 text-center text-[12px] font-medium tracking-wide text-[#9CA3AF]">
          Intelligent Construction Estimating
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-10 w-48 animate-splash-bar">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full transition-[width] duration-100 ease-out"
            style={{
              width: `${progress}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <p className="mt-2.5 text-center text-[10px] font-medium text-[#9CA3AF]">
          {progress < 30
            ? "Loading modules..."
            : progress < 65
              ? "Connecting to database..."
              : progress < 90
                ? "Preparing workspace..."
                : "Ready"}
        </p>
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-[10px] text-[#D1D5DB]">v{version}</p>
    </div>
  );
}
