import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock ElevenLabs before importing component
vi.mock("@elevenlabs/react", () => ({
  useConversation: () => ({
    status: "disconnected",
    isSpeaking: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
  }),
}));

// Set agent ID for tests
const originalEnv = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

describe("CallAlexFAB", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders nothing when agent is not configured", async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = "";
    const { CallAlexFAB } = await import("../components/CallAlex");
    const { container } = render(<CallAlexFAB onCall={() => {}} />);
    expect(container.innerHTML).toBe("");
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = originalEnv;
  });

  it("renders Call Alex button when agent is configured", async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = "agent_test123";
    const { CallAlexFAB } = await import("../components/CallAlex");
    render(<CallAlexFAB onCall={() => {}} />);
    expect(screen.getByText("Call Alex")).toBeInTheDocument();
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = originalEnv;
  });

  it("shows confirmation dialog on click", async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = "agent_test123";
    const { CallAlexFAB } = await import("../components/CallAlex");
    render(<CallAlexFAB onCall={() => {}} />);
    fireEvent.click(screen.getByText("Call Alex"));
    expect(screen.getByText("Ready to Call Alex?")).toBeInTheDocument();
    expect(screen.getByText("Microphone access required")).toBeInTheDocument();
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = originalEnv;
  });

  it("calls onCall when Start Call is clicked", async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = "agent_test123";
    const onCall = vi.fn();
    const { CallAlexFAB } = await import("../components/CallAlex");
    render(<CallAlexFAB onCall={onCall} />);
    fireEvent.click(screen.getByText("Call Alex"));
    fireEvent.click(screen.getByText("Start Call"));
    expect(onCall).toHaveBeenCalledOnce();
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = originalEnv;
  });

  it("closes confirmation dialog on Not Yet", async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = "agent_test123";
    const { CallAlexFAB } = await import("../components/CallAlex");
    render(<CallAlexFAB onCall={() => {}} />);
    fireEvent.click(screen.getByText("Call Alex"));
    expect(screen.getByText("Ready to Call Alex?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Not Yet"));
    expect(screen.queryByText("Ready to Call Alex?")).not.toBeInTheDocument();
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = originalEnv;
  });
});

describe("CallAlexPanel", () => {
  it("renders the panel with Alex header", async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = "agent_test123";
    const { CallAlexPanel } = await import("../components/CallAlex");
    render(<CallAlexPanel onClose={() => {}} />);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Estimation Assistant")).toBeInTheDocument();
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID = originalEnv;
  });
});
