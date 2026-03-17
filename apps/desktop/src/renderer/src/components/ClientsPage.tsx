import { useState, useMemo } from "react";
import { useClients, useEstimates } from "../lib/store";
import { supabase } from "../lib/supabase";
import type { Client } from "@proestimate/shared/types";

export function ClientsPage({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { data: clients, loading } = useClients();
  const { data: estimates } = useEstimates();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.full_name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  const detail = selected ? clients.find((c) => c.id === selected) : null;

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      total: clients.length,
      withEmail: clients.filter((c) => c.email).length,
      recent: clients.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length,
    };
  }, [clients]);

  // Estimates for selected client
  const clientEstimates = useMemo(() => {
    if (!detail) return [];
    return estimates
      .filter((e) => e.client_id === detail.id)
      .slice(0, 3);
  }, [detail, estimates]);

  return (
    <div className="flex h-full flex-col slide-up">
      {/* ── Header ── */}
      <header className="px-8 pt-6 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Clients</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight">{clients.length} {clients.length === 1 ? "Client" : "Clients"}</h1>
          </div>
          <button onClick={() => onModal?.("add-client")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]">
            Add Client
          </button>
        </div>
      </header>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-3 px-8 py-4" style={{ animationDelay: "60ms" }}>
        <div className="surface rounded-xl px-4 py-3">
          <p className="caps mb-0.5">Total Clients</p>
          <p className="text-[20px] font-bold tight tabular">{stats.total}</p>
        </div>
        <div className="surface rounded-xl px-4 py-3">
          <p className="caps mb-0.5">With Email</p>
          <p className="text-[20px] font-bold tight tabular">{stats.withEmail}</p>
        </div>
        <div className="surface rounded-xl px-4 py-3">
          <p className="caps mb-0.5">Recent (30d)</p>
          <p className="text-[20px] font-bold tight tabular">{stats.recent}</p>
        </div>
      </div>

      {/* ── Main Content: Split View ── */}
      <div className="flex flex-1 overflow-hidden px-8 pb-6 gap-3">
        {/* Left: Search + Client List */}
        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${detail ? "w-[55%]" : "w-full"}`}>
          {/* Search Bar */}
          <div className="pb-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] shadow-sm shadow-black/[0.02] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto surface-elevated rounded-xl">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--gray5)]" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-[var(--gray5)]" />
                      <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--gray5)]" />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="h-2.5 w-20 animate-pulse rounded bg-[var(--gray5)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(196,30,58,0.06)" }}>
                  <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-[16px] font-bold tight">{search ? "No matches" : "No clients yet"}</p>
                <p className="mt-1.5 max-w-[280px] text-center text-[13px] leading-relaxed text-[var(--secondary)]">
                  {search ? "No clients match your search" : "Clients are created automatically when you build estimates, or add them manually."}
                </p>
                {!search && (
                  <button
                    onClick={() => onModal?.("add-client")}
                    className="mt-6 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
                  >
                    Add Client
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id === selected ? null : c.id)}
                    className={`card-hover flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border-l-[3px] ${
                      c.id === selected
                        ? "bg-[var(--accent)]/[0.06] ring-1 ring-[var(--accent)]/20"
                        : ""
                    } ${c.email ? "border-l-[var(--green)]" : "border-l-[var(--gray4)]"}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-white">
                      {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>

                    {/* Name + Contact */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold tight truncate">{c.full_name}</p>
                      {c.email && <p className="text-[11px] text-[var(--secondary)] truncate">{c.email}</p>}
                      {c.phone && <p className="text-[11px] text-[var(--tertiary)] truncate">{c.phone}</p>}
                      {!c.email && !c.phone && <p className="text-[11px] text-[var(--tertiary)]">No contact info</p>}
                    </div>

                    {/* Location + Date */}
                    <div className="flex-shrink-0 text-right">
                      {c.city && (
                        <p className="text-[11px] font-medium text-[var(--secondary)]">{c.city}, {c.state}</p>
                      )}
                      <p className="text-[10px] text-[var(--tertiary)] tabular">
                        {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        {detail && (
          <div className="w-[45%] overflow-y-auto surface-elevated rounded-xl p-6 slide-up">
            <ClientDetail
              client={detail}
              onClose={() => setSelected(null)}
              onModal={onModal}
              recentEstimates={clientEstimates}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ClientDetail({ client, onClose, onModal, recentEstimates }: {
  client: Client;
  onClose: () => void;
  onModal?: (m: string) => void;
  recentEstimates: { id: string; estimate_number: string; project_type: string; status: string; grand_total: number; created_at: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: client.full_name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address_line1: client.address_line1 ?? "",
    address_line2: client.address_line2 ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    zip: client.zip ?? "",
    notes: client.notes ?? "",
  });

  // Reset form when client changes or edit mode toggles
  const resetForm = () => {
    setForm({
      full_name: client.full_name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      address_line1: client.address_line1 ?? "",
      address_line2: client.address_line2 ?? "",
      city: client.city ?? "",
      state: client.state ?? "",
      zip: client.zip ?? "",
      notes: client.notes ?? "",
    });
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    await supabase.from("clients").update({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq("id", client.id);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    resetForm();
    setEditing(false);
  };

  const editInput = (field: keyof typeof form, placeholder: string) => (
    <input
      value={form[field]}
      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
      placeholder={placeholder}
      className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1 text-[12px] font-medium outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
    />
  );

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted": return "text-emerald-600";
      case "sent": return "text-blue-500";
      case "approved": return "text-violet-500";
      case "draft": return "text-[var(--tertiary)]";
      default: return "text-amber-500";
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[15px] font-bold text-white">
            {client.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            {editing ? (
              editInput("full_name", "Full name")
            ) : (
              <h2 className="text-[18px] font-bold tight">{client.full_name}</h2>
            )}
            <p className="text-[12px] text-[var(--secondary)]">{client.source ?? "Direct"}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 hover:bg-[var(--bg)] transition-colors">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <InfoSection title="Contact">
        {editing ? (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[12px] text-[var(--secondary)]">Email</p>
              {editInput("email", "Email")}
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[12px] text-[var(--secondary)]">Phone</p>
              {editInput("phone", "Phone")}
            </div>
          </>
        ) : (
          <>
            <InfoRow label="Email" value={client.email ?? "\u2014"} />
            <InfoRow label="Phone" value={client.phone ?? "\u2014"} />
          </>
        )}
      </InfoSection>

      <InfoSection title="Address">
        {editing ? (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[12px] text-[var(--secondary)]">Street</p>
              {editInput("address_line1", "Street address")}
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[12px] text-[var(--secondary)]">Line 2</p>
              {editInput("address_line2", "Apt, suite, etc.")}
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1">{editInput("city", "City")}</div>
              <div className="w-16">{editInput("state", "State")}</div>
              <div className="w-20">{editInput("zip", "ZIP")}</div>
            </div>
          </>
        ) : (
          <>
            <InfoRow label="Street" value={client.address_line1 ?? "\u2014"} />
            {client.address_line2 && <InfoRow label="" value={client.address_line2} />}
            <InfoRow label="City" value={[client.city, client.state, client.zip].filter(Boolean).join(", ") || "\u2014"} />
          </>
        )}
      </InfoSection>

      <InfoSection title="Notes">
        {editing ? (
          <div className="px-3 py-2">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes..."
              rows={3}
              className="w-full rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1 text-[12px] outline-none resize-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
            />
          </div>
        ) : (
          <p className="px-3 py-2 text-[12px] text-[var(--secondary)]">{client.notes || "\u2014"}</p>
        )}
      </InfoSection>

      <div className="mt-4 space-y-2">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.full_name.trim()}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onModal?.("new-estimate")}
              className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.99]"
            >
              New Estimate for Client
            </button>
            <button
              onClick={() => { resetForm(); setEditing(true); }}
              className="w-full rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-all hover:bg-[var(--bg)]"
            >
              Edit Client
            </button>
          </>
        )}
      </div>

      {/* ── Recent Estimates ── */}
      {!editing && (
        <div className="mt-6">
          <p className="caps mb-2">Recent Estimates</p>
          {recentEstimates.length === 0 ? (
            <div className="rounded-lg border border-[var(--sep)] py-6 text-center">
              <p className="text-[12px] text-[var(--tertiary)]">No estimates yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEstimates.map((est) => (
                <div key={est.id} className="card-hover rounded-lg border border-[var(--sep)] px-3 py-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[12px] font-semibold tight">{est.estimate_number}</p>
                    <p className={`text-[11px] font-medium capitalize ${statusColor(est.status)}`}>{est.status.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[var(--secondary)]">{est.project_type}</p>
                    <p className="text-[12px] font-semibold tabular">${est.grand_total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <p className="text-[10px] text-[var(--tertiary)] tabular mt-0.5">
                    {new Date(est.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="caps mb-1.5">{title}</p>
      <div className="rounded-lg border border-[var(--sep)] divide-y divide-[var(--sep)]">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      {label && <p className="text-[12px] text-[var(--secondary)]">{label}</p>}
      <p className="text-[12px] font-medium">{value}</p>
    </div>
  );
}
