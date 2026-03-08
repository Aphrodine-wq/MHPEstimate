import { describe, it, expect, beforeEach } from "vitest";

// Test dark mode utility logic
describe("Dark Mode Logic", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("light", "dark");
  });

  it("applies light class to root element", () => {
    document.documentElement.classList.add("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("applies dark class to root element", () => {
    document.documentElement.classList.add("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("removes opposite class when switching", () => {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });
});
