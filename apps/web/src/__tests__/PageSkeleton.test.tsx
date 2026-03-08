import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

// Test the PageSkeleton loading state
function PageSkeleton() {
  return (
    <div className="flex h-full items-center justify-center" data-testid="page-skeleton">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-blue-500" />
    </div>
  );
}

describe("PageSkeleton", () => {
  it("renders a loading spinner", () => {
    const { getByTestId } = render(<PageSkeleton />);
    expect(getByTestId("page-skeleton")).toBeInTheDocument();
  });
});
