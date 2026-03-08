import { describe, it, expect } from "vitest";

// Test the activity feed sorting logic (extracted from store.ts)
interface ActivityEntry {
  id: string;
  type: "estimate" | "client" | "invoice" | "call";
  action: string;
  description: string;
  timestamp: string;
}

function sortActivity(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}

describe("Activity Feed Logic", () => {
  it("sorts entries by timestamp descending", () => {
    const entries: ActivityEntry[] = [
      { id: "1", type: "estimate", action: "created", description: "EST-001", timestamp: "2026-01-01T00:00:00Z" },
      { id: "2", type: "client", action: "added", description: "John Doe", timestamp: "2026-03-01T00:00:00Z" },
      { id: "3", type: "invoice", action: "uploaded", description: "INV-001", timestamp: "2026-02-01T00:00:00Z" },
    ];
    const sorted = sortActivity(entries);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("1");
  });

  it("limits to 15 entries", () => {
    const entries: ActivityEntry[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      type: "estimate" as const,
      action: "created",
      description: `EST-${i}`,
      timestamp: new Date(2026, 0, i + 1).toISOString(),
    }));
    const sorted = sortActivity(entries);
    expect(sorted.length).toBe(15);
  });
});
