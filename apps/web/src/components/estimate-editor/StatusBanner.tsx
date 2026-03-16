/** Status banner shown at the top of the editor when the estimate is not a draft. */
export function StatusBanner({ status }: { status: string }) {
  const configs: Record<string, { label: string; desc: string; color: string }> = {
    in_review: {
      label: "In Review",
      desc: "This estimate is awaiting approval. An admin or owner must approve it before it can be sent.",
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    },
    approved: {
      label: "Approved",
      desc: "This estimate is approved and ready to send to the client.",
      color: "bg-green-50 border-green-200 text-green-800",
    },
    sent: {
      label: "Sent",
      desc: "This estimate has been sent to the client.",
      color: "bg-blue-50 border-blue-200 text-blue-800",
    },
    accepted: {
      label: "Accepted",
      desc: "The client has accepted this estimate.",
      color: "bg-green-50 border-green-200 text-green-800",
    },
    declined: {
      label: "Declined",
      desc: "The client declined this estimate.",
      color: "bg-red-50 border-red-200 text-red-800",
    },
    expired: {
      label: "Expired",
      desc: "This estimate has expired.",
      color: "bg-gray-50 border-gray-200 text-gray-700",
    },
  };
  const cfg = configs[status];
  if (!cfg) return null;
  return (
    <div className={`mx-6 mt-4 rounded-lg border px-4 py-3 text-[13px] ${cfg.color}`}>
      <span className="font-semibold">{cfg.label}:</span> {cfg.desc}
    </div>
  );
}
