/**
 * Portal Page Enhancement Instructions
 * =====================================
 * Apply these changes to: apps/web/src/app/portal/[id]/page.tsx
 *
 * This file contains the code snippets to add. Apply them in order.
 */

// ============================================================================
// CHANGE 1: Add "viewed" tracking on mount
// ============================================================================
// LOCATION: Inside the main PortalPage component, after the data-fetching useEffect
// (after the useEffect that calls /api/portal/[id]?token=...)
//
// ADD this new useEffect:

/*
  // --- Track that the client viewed this estimate ---
  useEffect(() => {
    if (!data || viewTracked.current) return;
    viewTracked.current = true;

    const token = searchParams.get("token");
    if (!token) return;

    fetch("/api/portal-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estimateId: id, token }),
    }).catch(() => {
      // Fire-and-forget — don't break the portal if tracking fails
    });
  }, [data, id, searchParams]);
*/

// Also add this ref at the top of the component (with other state):
//   const viewTracked = useRef(false);
//
// And add useRef to the React import:
//   import { useEffect, useState, useCallback, useRef, type JSX } from "react";


// ============================================================================
// CHANGE 2: Add PDF download / print button
// ============================================================================
// LOCATION: In the action buttons area (near the Accept/Decline buttons),
// add a Print/Download button.
//
// ADD this button alongside existing action buttons:

/*
  <button
    onClick={() => window.print()}
    style={{
      padding: "12px 28px",
      borderRadius: 8,
      border: `2px solid ${NAVY}`,
      background: "transparent",
      color: NAVY,
      fontWeight: 600,
      fontSize: 15,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    Download PDF
  </button>
*/

// Also add this <style> tag inside the component's return (or in a <Head>):
// This ensures the print output looks clean.

/*
  <style>{`
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .portal-no-print { display: none !important; }
      .portal-card { break-inside: avoid; box-shadow: none !important; }
    }
  `}</style>
*/

// Mark the action buttons container with className="portal-no-print"
// so they don't appear in the PDF output.


// ============================================================================
// CHANGE 3: Change Order approval UI for clients
// ============================================================================
// LOCATION: In the Change Orders section of the portal page
// (search for where changeOrders are rendered)
//
// For each change order that has status === "approved" and client_signed === false,
// show an "Approve & Sign" button.
//
// ADD this component inside the portal page file:

/*
function ChangeOrderApproveButton({
  changeOrder,
  estimateId,
  token,
  onSigned,
}: {
  changeOrder: EstimateChangeOrder;
  estimateId: string;
  token: string;
  onSigned: () => void;
}) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [signerName, setSignerName] = useState("");

  async function handleSign() {
    if (!signerName.trim()) {
      setError("Please enter your name to approve.");
      return;
    }
    setSigning(true);
    setError(null);

    try {
      const res = await fetch(`/api/portal-change-order-sign?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeOrderId: changeOrder.id,
          signerName: signerName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to approve change order");
      }

      onSigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSigning(false);
    }
  }

  if (changeOrder.client_signed) {
    return (
      <span style={{ color: "#15803d", fontSize: 13, fontWeight: 600 }}>
        ✓ Client Approved
      </span>
    );
  }

  if (!showNameInput) {
    return (
      <button
        onClick={() => setShowNameInput(true)}
        style={{
          padding: "6px 16px",
          borderRadius: 6,
          border: "none",
          background: "#15803d",
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Approve Change
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        type="text"
        placeholder="Your full name"
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          fontSize: 13,
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={handleSign}
          disabled={signing}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: signing ? "#9ca3af" : "#15803d",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: signing ? "default" : "pointer",
          }}
        >
          {signing ? "Approving..." : "Confirm"}
        </button>
        <button
          onClick={() => { setShowNameInput(false); setError(null); }}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "transparent",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
}
*/

// Then in the change orders rendering section, replace the existing
// change order row with something that includes this button:
//
// For each CO row, add at the end:
//   <ChangeOrderApproveButton
//     changeOrder={co}
//     estimateId={id}
//     token={searchParams.get("token") ?? ""}
//     onSigned={() => refreshData()}
//   />


// ============================================================================
// CHANGE 4: Mobile responsive CSS improvements
// ============================================================================
// LOCATION: Add to the existing <style> tag or create one
//
// ADD these responsive styles:

/*
  <style>{`
    @media (max-width: 640px) {
      .portal-card { margin-left: -8px; margin-right: -8px; border-radius: 8px !important; }
      .portal-card > div { padding: 16px !important; }
      table { font-size: 13px; }
      table th, table td { padding: 8px 6px !important; }
      h1 { font-size: 20px !important; }
      h2 { font-size: 17px !important; }
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .portal-no-print { display: none !important; }
      .portal-card { break-inside: avoid; box-shadow: none !important; }
    }
  `}</style>
*/

export {};
