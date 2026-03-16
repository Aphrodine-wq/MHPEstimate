import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Suppress console.error during error boundary tests
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    consoleSpy.mockClear();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders fallback UI on error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
  });

  it("recovers when Try Again is clicked", () => {
    let shouldThrow = true;
    function Thrower() {
      if (shouldThrow) throw new Error("Test error");
      return <div>No error</div>;
    }

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Update children to not throw before resetting the boundary
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try Again"));
    expect(screen.getByText("No error")).toBeInTheDocument();
  });
});
