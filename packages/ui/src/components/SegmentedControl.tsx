import { useRef, useEffect, useState } from "react";

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = options.findIndex((o) => o.value === value);
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>("button");
    const btn = buttons[idx];
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [value, options]);

  const sizeClass = size === "sm" ? "text-[11px] py-1 px-2.5" : "text-[13px] py-1.5 px-3";

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex rounded-lg bg-[var(--fill)] p-0.5 ${className}`}
    >
      <div
        className="absolute top-0.5 h-[calc(100%-4px)] rounded-md bg-[var(--card)] shadow-sm transition-all duration-200"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 font-medium transition-colors ${sizeClass} ${
            value === opt.value
              ? "text-[var(--label)]"
              : "text-[var(--secondary)] hover:text-[var(--label)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
