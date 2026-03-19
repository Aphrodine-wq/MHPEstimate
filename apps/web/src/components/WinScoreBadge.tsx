import { useState, useCallback } from "react";
import toast from "react-hot-toast";

interface WinScoreBadgeProps {
  estimateId: string;
  score: number | null;
  size?: "sm" | "md";
}

interface WinFactor {
  name: string;
  impact: number;
  suggestion?: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#3b82f6";
  if (score >= 30) return "#eab308";
  return "#ef4444";
}

export function WinScoreBadge({ estimateId, score: initialScore, size = "sm" }: WinScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(initialScore);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [factors, setFactors] = useState<WinFactor[]>([]);

  const dimension = size === "sm" ? 28 : 36;
  const strokeWidth = size === "sm" ? 3 : 4;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fontSize = size === "sm" ? "9px" : "11px";

  const fetchScore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/estimates/predict-win", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId }),
      });
      if (!res.ok) throw new Error("Prediction failed");
      const data = await res.json();
      setScore(data.score);
      setFactors(data.factors || []);
    } catch {
      toast.error("Failed to predict win score");
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  const handleClick = async () => {
    if (score === null) {
      await fetchScore();
      setExpanded(true);
    } else if (!expanded) {
      if (factors.length === 0) await fetchScore();
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-full border border-[var(--sep)] bg-[var(--bg)]"
        style={{ width: dimension, height: dimension }}
      >
        <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const displayScore = score ?? 0;
  const color = score !== null ? scoreColor(displayScore) : "var(--gray2)";
  const offset = score !== null ? circumference - (displayScore / 100) * circumference : circumference;

  return (
    <div className="relative inline-flex flex-col items-start">
      <button
        onClick={handleClick}
        className="relative flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
        style={{ width: dimension, height: dimension }}
        title={score !== null ? `Win score: ${displayScore}%` : "Predict win score"}
      >
        <svg width={dimension} height={dimension} className="-rotate-90">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="var(--sep)"
            strokeWidth={strokeWidth}
          />
          {score !== null && (
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}
        </svg>
        <span
          className="absolute font-semibold"
          style={{ fontSize, color }}
        >
          {score !== null ? displayScore : "?"}
        </span>
      </button>

      {expanded && score !== null && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-[var(--label)]">Win Score Breakdown</p>
            <span className="text-[11px] font-bold" style={{ color }}>{displayScore}%</span>
          </div>
          {factors.length > 0 ? (
            <div className="space-y-2">
              {factors.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--label)]">{f.name}</span>
                    <span className={`text-[10px] font-medium ${f.impact >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                      {f.impact >= 0 ? "+" : ""}{f.impact}
                    </span>
                  </div>
                  {f.suggestion && (
                    <p className="text-[10px] text-[var(--secondary)] leading-snug">{f.suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--secondary)]">No factor breakdown available</p>
          )}
          <button
            onClick={() => setExpanded(false)}
            className="mt-3 w-full text-center text-[11px] font-medium text-[var(--accent)] hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
