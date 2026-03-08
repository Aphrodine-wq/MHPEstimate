import type { JSX } from "react";

export default function Loading(): JSX.Element {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: "var(--gray4)", borderTopColor: "transparent" }}
        />
        <p className="text-[13px] font-medium" style={{ color: "var(--secondary)" }}>
          Loading…
        </p>
      </div>
    </div>
  );
}
