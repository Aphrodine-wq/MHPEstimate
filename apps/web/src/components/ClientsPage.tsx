import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useClients, useEstimates } from "../lib/store";
import { supabase } from "../lib/supabase";
import { usePersistedState } from "../lib/usePersistedState";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "@proestimate/ui/components";
import type { Client } from "@proestimate/shared/types";

export function ClientsPage({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { data: clients, loading } = useClients();
  const [search, setSearch] = usePersistedState("clients_search", "");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.full_name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  const detail = selected ? clients.find((c) => c.id === selected) : null;
  const clientListRef = useRef<HTMLDivElement>(null);

  const handleClientListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!clientListRef.current) return;
      const items = clientListRef.current.querySelectorAll<HTMLElement>('[data-client-item]');
      if (items.length === 0) return;
      const currentIndex = Array.from(items).findIndex((el) => el === document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
      }
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{clients.length} clients</p>
        <button onClick={() => onModal?.("add-client")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
          Add Client
        </button>
      </header>

      <div className="px-4 md:px-8 py-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            aria-label="Search clients by name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-4 md:px-8 pb-6">
        <div ref={clientListRef} onKeyDown={handleClientListKeyDown} role="listbox" aria-label="Clients list" className={`overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] ${detail ? "hidden md:block md:w-[55%]" : "w-full"}`}>
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--gray5)]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-28 animate-pulse rounded bg-[var(--gray5)]" />
                    <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--gray5)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No clients"
              description={search ? "No clients match your search" : "Clients are created automatically from estimates"}
            />
          ) : (
            filtered.map((c, i, arr) => (
              <button
                key={c.id}
                data-client-item
                role="option"
                aria-selected={c.id === selected}
                aria-label={`${c.full_name} - ${c.email ?? c.phone ?? "No contact info"}`}
                onClick={() => setSelected(c.id === selected ? null : c.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  c.id === selected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg)]"
                } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gray5)] text-[12px] font-semibold text-[var(--gray1)]">
                  {c.full_name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{c.full_name}</p>
                  <p className="text-[11px] text-[var(--secondary)] truncate">{c.email ?? c.phone ?? "No contact info"}</p>
                </div>
                {c.city && <p className="text-[11px] text-[var(--tertiary)]">{c.city}, {c.state}</p>}
              </button>
            ))
          )}
        </div>

        {detail && (
          <div className="w-full md:ml-3 md:w-[45%] overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5">
            <ClientDetail client={detail} onClose={() => setSelected(null)} onModal={onModal} />
          </div>
        )}
      </div>
    </div>
  );
}

function ClientDetail({ client, onClose, onModal }: { client: Client; onClose: () => void; onModal?: (m: string) => void }) {
  const { data: allEstimates } = useEstimates();
  const clientEstimates = allEstimates.filter((e) => e.client_id === client.id);
  const totalRevenue = clientEstimates
    .filter((e) => e.status === "accepted" || e.status === "approved")
    .reduce((sum, e) => sum + Number(e.grand_total), 0);
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
    try {
      const { error } = await supabase.from("clients").update({
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
      if (error) { console.error("Failed to update client:", error); toast.error("Failed to save client"); setSaving(false); return; }
      toast.success("Client updated");
      setSaving(false);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update client:", err);
      toast.error("Failed to save client");
      setSaving(false);
    }
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

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gray5)] text-[14px] font-semibold text-[var(--gray1)]">
            {client.full_name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            {editing ? (
              editInput("full_name", "Full name")
            ) : (
              <h2 className="text-[18px] font-bold">{client.full_name}</h2>
            )}
            <p className="text-[12px] text-[var(--secondary)]">{client.source ?? "Direct"}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close client detail" className="rounded-md p-1 hover:bg-[var(--bg)]">
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
            <InfoRow label="Email" value={client.email ?? "—"} />
            <InfoRow label="Phone" value={client.phone ?? "—"} />
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
            <InfoRow label="Street" value={client.address_line1 ?? "—"} />
            {client.address_line2 && <InfoRow label="" value={client.address_line2} />}
            <InfoRow label="City" value={[client.city, client.state, client.zip].filter(Boolean).join(", ") || "—"} />
          </>
        )}
      </InfoSection>

      <InfoSection title={`Estimates (${clientEstimates.length})`}>
        {clientEstimates.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-[var(--secondary)]">No estimates for this client</p>
        ) : (
          <>
            {totalRevenue > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg)]">
                <p className="text-[12px] text-[var(--secondary)]">Total Revenue</p>
                <p className="text-[12px] font-bold text-[var(--green)]">${totalRevenue.toLocaleString()}</p>
              </div>
            )}
            {clientEstimates.slice(0, 5).map((est) => (
              <div key={est.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[12px] font-medium truncate">{est.estimate_number}</p>
                  <StatusBadge status={est.status} />
                </div>
                <p className="text-[12px] font-medium flex-shrink-0">${Number(est.grand_total).toLocaleString()}</p>
              </div>
            ))}
            {clientEstimates.length > 5 && (
              <p className="px-3 py-2 text-[11px] text-[var(--secondary)]">
                +{clientEstimates.length - 5} more estimates
              </p>
            )}
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
          <p className="px-3 py-2 text-[12px] text-[var(--secondary)]">{client.notes || "—"}</p>
        )}
      </InfoSection>

      <div className="mt-4 space-y-2">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.full_name.trim()}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.99] disabled:opacity-50"
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
              className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.99]"
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
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{title}</p>
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
