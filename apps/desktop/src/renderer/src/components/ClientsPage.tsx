import { useState } from "react";
import { useClients } from "../lib/store";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import type { Client } from "@proestimate/shared/types";

export function ClientsPage({ onModal }: { onNavigate?: (page: string) => void; onCallAlex?: () => void; onModal?: (m: string) => void }) {
  const { data: clients, loading } = useClients();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.full_name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  const detail = selected ? clients.find((c) => c.id === selected) : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{clients.length} clients</p>
        <button onClick={() => onModal?.("add-client")} className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
          Add Client
        </button>
      </header>

      <div className="px-8 py-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--sep)] bg-[var(--card)] py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-8 pb-6">
        <div className={`overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] ${detail ? "w-[55%]" : "w-full"}`}>
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
                onClick={() => setSelected(c.id === selected ? null : c.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  c.id === selected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg)]"
                } ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gray5)] text-[12px] font-semibold text-[var(--gray1)]">
                  {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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
          <div className="ml-3 w-[45%] overflow-y-auto rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5">
            <ClientDetail client={detail} onClose={() => setSelected(null)} onModal={onModal} />
          </div>
        )}
      </div>
    </div>
  );
}

function ClientDetail({ client, onClose, onModal }: { client: Client; onClose: () => void; onModal?: (m: string) => void }) {
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

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gray5)] text-[14px] font-semibold text-[var(--gray1)]">
            {client.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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
        <button onClick={onClose} className="rounded-md p-1 hover:bg-[var(--bg)]">
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
