import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal, ConfirmDialog, Field, inputClass, selectClass, textareaClass } from "@proestimate/ui";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders when open", () => {
    render(
      <Modal open={true} onClose={() => {}} title="My Modal">
        <p>Hello</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("My Modal")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows optional description", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Title" description="Some description">
        <p>Body</p>
      </Modal>
    );
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <button>Inside</button>
      </Modal>
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when clicking overlay", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    // Click the overlay (the outermost div)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has correct aria attributes", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Accessible Modal">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("has close button with aria-label", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("renders with message and buttons", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete Item?"
        message="This action cannot be undone."
      />
    );
    expect(screen.getByText("Delete Item?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("uses custom confirm label", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        message="Sure?"
        confirmLabel="Yes, delete"
      />
    );
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
  });

  it("calls onConfirm and onClose when confirmed", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Sure?"
      />
    );
    fireEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel clicked", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Sure?"
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("renders label and children", () => {
    render(
      <Field label="Email">
        <input type="email" placeholder="you@example.com" />
      </Field>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });
});

describe("CSS class exports", () => {
  it("exports input class string", () => {
    expect(typeof inputClass).toBe("string");
    expect(inputClass).toContain("rounded-lg");
  });

  it("exports select class string", () => {
    expect(typeof selectClass).toBe("string");
    expect(selectClass).toContain("appearance-none");
  });

  it("exports textarea class string", () => {
    expect(typeof textareaClass).toBe("string");
    expect(textareaClass).toContain("resize-none");
  });
});
