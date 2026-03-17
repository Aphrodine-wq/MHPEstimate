import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryImpl extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true, error: _error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    window.electronAPI?.reportError({ message: error.message, stack: error.stack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "inherit",
            gap: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: "1rem",
              padding: "2.5rem",
              textAlign: "center",
              maxWidth: 420,
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              An unexpected error occurred. Please try again or restart the app.
            </p>
            {this.state.error && (
              <pre style={{ fontSize: "0.7rem", textAlign: "left", background: "var(--bg)", padding: "0.75rem", borderRadius: "0.5rem", overflow: "auto", marginBottom: "1.5rem", color: "var(--red)" }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--sep)",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  return <ErrorBoundaryImpl>{children}</ErrorBoundaryImpl>;
}
