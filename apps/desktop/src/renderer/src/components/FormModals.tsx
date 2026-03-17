import { useState, useEffect } from "react";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";
import { createEstimate, useClients } from "../lib/store";

/* ── New Estimate Modal ── */

interface NewEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: any) => void;
}

export function NewEstimateModal({ open, onClose, onCreated }: NewEstimateModalProps) {
  const [projectType, setProjectType] = useState("General");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");
  const [tier, setTier] = useState("midrange");
  const [notes, setNotes] = useState("");
  const [validThrough, setValidThrough] = useState("");
  const [scopeInclusions, setScopeInclusions] = useState("");
  const [scopeExclusions, setScopeExclusions] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: clients } = useClients();

  const handleSubmit = async () => {
    setSaving(true);
    const est = await createEstimate();
    if (est && supabase) {
      await supabase.from("estimates").update({
        project_type: projectType,
        project_address: address || null,
        client_id: clientId || null,
        tier,
        site_conditions: notes || null,
        valid_through: validThrough || null,
        scope_inclusions: scopeInclusions ? scopeInclusions.split("\n").filter(Boolean) : [],
        scope_exclusions: scopeExclusions ? scopeExclusions.split("\n").filter(Boolean) : [],
      }).eq("id", est.id);
    }
    setSaving(false);
    resetAndClose();
    if (est) onCreated?.(est);
  };

  const resetAndClose = () => {
    setProjectType("General");
    setAddress("");
    setClientId("");
    setTier("midrange");
    setNotes("");
    setValidThrough("");
    setScopeInclusions("");
    setScopeExclusions("");
    onClose();
  };

  const PROJECT_TYPES = [
    { value: "General", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
    { value: "Kitchen Remodel", icon: "M3 3h18v18H3zM3 9h18M9 3v18" },
    { value: "Bathroom Remodel", icon: "M2 12h20M2 12a10 10 0 0020 0M2 12a10 10 0 0120 0" },
    { value: "Flooring", icon: "M3 21h18M3 21V3h18v18M9 3v18M15 3v18M3 9h18M3 15h18" },
    { value: "Roofing", icon: "M3 9l9-7 9 7M4 10v11h16V10" },
    { value: "Painting", icon: "M19 11V5a2 2 0 00-2-2H7a2 2 0 00-2 2v6M12 11v10M8 21h8" },
    { value: "Siding", icon: "M4 3h16v18H4zM4 9h16M4 15h16" },
    { value: "Deck / Patio", icon: "M2 20h20M4 20V10l8-6 8 6v10M10 20v-6h4v6" },
    { value: "Addition", icon: "M12 5v14M5 12h14" },
    { value: "Full Renovation", icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
  ];

  const TIERS = [
    { value: "budget", label: "Budget", color: "#22C55E", desc: "Economy-grade materials, basic finishes. Best for rentals and tight budgets." },
    { value: "midrange", label: "Midrange", color: "#F59E0B", desc: "Brand-name materials, standard upgrades. Most popular for homeowner renovations." },
    { value: "high_end", label: "High End", color: "#8B5CF6", desc: "Premium materials, custom craftsmanship, luxury finishes." },
  ] as const;

  return (
    <Modal open={open} onClose={resetAndClose} title="New Estimate" description="Set up your project details, then add line items" width="w-full max-w-[720px]">
      <div className="space-y-5 px-6 py-6">
        {/* Project Type Grid */}
        <Field label="Project Type">
          <div className="grid grid-cols-5 gap-2">
            {PROJECT_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setProjectType(pt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all ${
                  projectType === pt.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                    : "border-[var(--sep)] hover:border-[var(--gray3)] hover:bg-[var(--bg)]"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  projectType === pt.value ? "bg-[var(--accent)]/10" : "bg-[var(--gray5)]"
                }`}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={projectType === pt.value ? "var(--accent)" : "var(--gray1)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={pt.icon} />
                  </svg>
                </div>
                <span className={`text-[10px] font-medium leading-tight ${projectType === pt.value ? "text-[var(--accent)]" : "text-[var(--secondary)]"}`}>
                  {pt.value}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {/* Client + Address row */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
              <option value="">-- Select client --</option>
              {clients?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Project Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" className={inputClass} />
          </Field>
        </div>

        {/* Pricing Tier Cards */}
        <Field label="Pricing Tier">
          <div className="grid grid-cols-3 gap-3">
            {TIERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTier(t.value)}
                className={`flex flex-col rounded-xl border p-3.5 text-left transition-all ${
                  tier === t.value
                    ? "border-current shadow-sm"
                    : "border-[var(--sep)] hover:border-[var(--gray3)]"
                }`}
                style={tier === t.value ? { borderColor: t.color, backgroundColor: `${t.color}08` } : undefined}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-[12px] font-bold" style={tier === t.value ? { color: t.color } : undefined}>{t.label}</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--secondary)]">{t.desc}</p>
              </button>
            ))}
          </div>
        </Field>

        {/* Valid through */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valid Through">
            <input type="date" value={validThrough} onChange={(e) => setValidThrough(e.target.value)} className={inputClass} />
          </Field>
          <div />
        </div>

        {/* Scope */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Scope Inclusions">
            <textarea value={scopeInclusions} onChange={(e) => setScopeInclusions(e.target.value)} placeholder="One per line:&#10;Material supply and installation&#10;Cleanup and debris removal" rows={4} className={textareaClass} />
          </Field>
          <Field label="Scope Exclusions">
            <textarea value={scopeExclusions} onChange={(e) => setScopeExclusions(e.target.value)} placeholder="One per line:&#10;Structural modifications&#10;Permits and inspections" rows={4} className={textareaClass} />
          </Field>
        </div>

        {/* Notes */}
        <Field label="Site Conditions / Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Access restrictions, existing damage, special requirements..." rows={3} className={textareaClass} />
        </Field>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-4">
        <p className="text-[11px] text-[var(--tertiary)]">You can add line items after creating</p>
        <div className="flex gap-2">
          <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50">
            {saving ? "Creating..." : "Create Estimate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Add Client Modal ── */

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddClientModal({ open, onClose }: AddClientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !supabase) return;
    setSaving(true);
    await supabase.from("clients").insert({
      full_name: name.trim(),
      email: email || null,
      phone: phone || null,
      address_line1: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      notes: notes || null,
      source: "manual",
    });
    setSaving(false);
    resetAndClose();
  };

  const resetAndClose = () => {
    setName(""); setEmail(""); setPhone(""); setAddress(""); setCity(""); setState(""); setZip(""); setNotes("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Add Client" description="Add a new client to your database" width="w-full max-w-[600px]">
      <div className="space-y-5 px-6 py-6">
        <Field label="Full Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className={inputClass} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className={inputClass} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
          </Field>
        </div>

        <div className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] p-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--secondary)]">Address</p>
          <Field label="Street">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className={inputClass} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jackson" className={inputClass} />
            </Field>
            <Field label="State">
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="MS" className={inputClass} />
            </Field>
            <Field label="ZIP">
              <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="39201" className={inputClass} />
            </Field>
          </div>
        </div>

        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferred contact method, referral source, etc." rows={2} className={textareaClass} />
        </Field>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--sep)] px-6 py-4">
        <p className="text-[11px] text-[var(--tertiary)]">* Required field</p>
        <div className="flex gap-2">
          <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50">
            {saving ? "Saving..." : "Add Client"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Log Expense Modal ── */

interface LogExpenseModalProps {
  open: boolean;
  onClose: () => void;
}

export function LogExpenseModal({ open, onClose }: LogExpenseModalProps) {
  const [category, setCategory] = useState("Materials");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Company Card");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !supabase) return;
    setSaving(true);
    await supabase.from("company_settings").upsert({
      key: `expense_${Date.now()}`,
      value: {
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        vendor: vendor || null,
        date,
        payment_method: paymentMethod,
        notes: notes || null,
        created_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    setSaving(false);
    resetAndClose();
  };

  const resetAndClose = () => {
    setCategory("Materials");
    setDescription("");
    setAmount("");
    setVendor("");
    setDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Company Card");
    setNotes("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Log Expense" description="Record a business expense" width="w-full max-w-[600px]">
      <div className="space-y-5 px-6 py-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {["Materials", "Labor", "Equipment Rental", "Permits", "Fuel & Travel", "Office / Admin", "Insurance", "Subcontractor", "Tools", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Description *">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Lumber for framing — 2x4s" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--secondary)]">$</span>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${inputClass} pl-7`} />
            </div>
          </Field>
          <Field label="Vendor">
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Home Depot" className={inputClass} />
          </Field>
        </div>
        <Field label="Payment Method">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectClass}>
            {["Company Card", "Personal Card", "Cash", "Check", "ACH / Transfer", "Other"].map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Receipt #, job reference, etc." rows={2} className={textareaClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-4">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !description.trim() || !amount} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving..." : "Log Expense"}
        </button>
      </div>
    </Modal>
  );
}

/* ── Upload Invoice Modal ── */

interface UploadInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadInvoiceModal({ open, onClose }: UploadInvoiceModalProps) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) return;
    setSaving(true);
    await supabase.from("invoices").insert({
      supplier_name: supplier || null,
      invoice_number: invoiceNum || null,
      invoice_date: invoiceDate || null,
      file_path: fileName || "pending-upload",
      status: "pending",
    });
    setSaving(false);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSupplier(""); setInvoiceNum(""); setInvoiceDate(""); setFileName(""); setFile(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Upload Invoice" description="Add a supplier invoice for pricing extraction" width="w-full max-w-[600px]">
      <div className="space-y-5 px-6 py-6">
        {/* Drop zone */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--gray4)] bg-[var(--bg)] px-6 py-10 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/[0.02] cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.png,.jpg,.jpeg";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) {
                setFileName(f.name);
                setFile(f);
              }
            };
            input.click();
          }}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="mt-2 text-[13px] font-medium text-[var(--secondary)]">
            {fileName ? `${fileName}` : "Click to select a file"}
          </p>
          {file && (
            <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
          {!file && (
            <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">PDF, PNG, or JPG</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Supplier Name">
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Home Depot" className={inputClass} />
          </Field>
          <Field label="Invoice Number">
            <input value={invoiceNum} onChange={(e) => setInvoiceNum(e.target.value)} placeholder="INV-00123" className={inputClass} />
          </Field>
        </div>
        <Field label="Invoice Date">
          <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-4">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50">
          {saving ? "Uploading..." : "Upload Invoice"}
        </button>
      </div>
    </Modal>
  );
}

/* ── Edit Profile Modal ── */

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: { id: string; full_name: string; email: string; phone: string | null; role: string } | null;
}

export function EditProfileModal({ open, onClose, user }: EditProfileModalProps) {
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const userId = user?.id;

  // Sync form fields when user prop changes
  useEffect(() => {
    setName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.full_name, user?.phone]);

  const handleSubmit = async () => {
    if (!supabase || !userId) return;
    setSaving(true);
    await supabase.from("team_members").update({
      full_name: name.trim(),
      phone: phone || null,
    }).eq("id", userId);
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile" width="w-full max-w-[480px]">
      <div className="space-y-5 px-6 py-6">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 rounded-xl bg-[var(--bg)] p-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[18px] font-bold text-white">
            {user?.full_name?.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2) || "--"}
          </div>
          <div>
            <p className="text-[15px] font-bold">{user?.full_name || "Unknown"}</p>
            <p className="text-[12px] text-[var(--secondary)] capitalize">{user?.role || "Team Member"}</p>
          </div>
        </div>

        <Field label="Full Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={user?.email ?? ""} disabled className={`${inputClass} opacity-40 cursor-not-allowed`} />
          <p className="mt-1 text-[10px] text-[var(--tertiary)]">Contact admin to change email</p>
        </Field>
        <Field label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-4">
        <button onClick={onClose} className="rounded-lg border border-[var(--sep)] px-5 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
