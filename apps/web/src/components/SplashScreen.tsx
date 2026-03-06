import { useState, useEffect } from "react";
const mhpLogo = "/mhp-logo.png";

interface SplashScreenProps {
  onReady: () => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done">("loading");

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 2200;

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
        setTimeout(onReady, 600);
      }
    }

    // Small delay before starting the bar
    const t = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 400);

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
      style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" }}
    >
      {/* Subtle radial glow behind the logo */}
      <div
        className="absolute rounded-full blur-[80px] opacity-30"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(circle, #29abe2 0%, transparent 70%)",
        }}
      />

      {/* Logo with entrance animation */}
      <div className="relative animate-splash-logo">
        <img
          src={mhpLogo}
          alt="MHP Construction"
          className="h-28 w-auto drop-shadow-sm"
        />
      </div>

      {/* App name */}
      <div className="mt-6 animate-splash-text">
        <h1 className="text-center text-[22px] font-bold tracking-tight text-[#1a1a1a]">
          ProEstimate AI
        </h1>
        <p className="mt-1 text-center text-[12px] font-medium tracking-wide text-[#8e8e93]">
          Intelligent Construction Estimating
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-10 w-48 animate-splash-bar">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#e5e5ea]">
          <div
            className="h-full rounded-full transition-[width] duration-100 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #29abe2, #007aff)",
            }}
          />
        </div>
        <p className="mt-2.5 text-center text-[10px] font-medium text-[#aeaeb2]">
          {progress < 30
            ? "Loading modules…"
            : progress < 65
              ? "Connecting to database…"
              : progress < 90
                ? "Preparing workspace…"
                : "Ready"}
        </p>
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-[10px] text-[#c7c7cc]">v1.0.0</p>
    </div>
  );
}
