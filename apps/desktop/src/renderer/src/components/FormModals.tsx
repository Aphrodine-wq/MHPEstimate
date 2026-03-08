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

  return (
    <Modal open={open} onClose={resetAndClose} title="New Estimate" description="Create a new construction estimate">
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project Type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
              <option>General</option>
              <option>Kitchen Remodel</option>
              <option>Bathroom Remodel</option>
              <option>Flooring</option>
              <option>Roofing</option>
              <option>Painting</option>
              <option>Siding</option>
              <option>Deck / Patio</option>
              <option>Addition</option>
              <option>Full Renovation</option>
            </select>
          </Field>
          <Field label="Client">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
              <option value="">— No client —</option>
              {clients?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" className={inputClass} />
          </Field>
          <Field label="Valid Through">
            <input type="date" value={validThrough} onChange={(e) => setValidThrough(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Pricing Tier">
          <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
            {([["budget", "Budget"], ["midrange", "Midrange"], ["high_end", "High End"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setTier(val)} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition-all ${tier === val ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--secondary)]">
            {tier === "budget" && "Economy-grade materials, basic finishes, cost-effective labor. Best for rental properties, quick flips, or tight budgets."}
            {tier === "midrange" && "Quality brand-name materials, standard upgrades, professional finishes. The most popular choice for homeowner renovations."}
            {tier === "high_end" && "Premium and designer-grade materials, custom craftsmanship, luxury finishes. For high-end homes and clients who want the best."}
          </p>
        </Field>
        <Field label="Scope Inclusions">
          <textarea value={scopeInclusions} onChange={(e) => setScopeInclusions(e.target.value)} placeholder="One per line: Material supply and installation..." rows={3} className={textareaClass} />
        </Field>
        <Field label="Scope Exclusions">
          <textarea value={scopeExclusions} onChange={(e) => setScopeExclusions(e.target.value)} placeholder="One per line: Structural modifications..." rows={3} className={textareaClass} />
        </Field>
        <Field label="Site Conditions / Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special conditions..." rows={3} className={textareaClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Creating…" : "Create Estimate"}
        </button>
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
    <Modal open={open} onClose={resetAndClose} title="Add Client" description="Add a new client to your database">
      <div className="space-y-4 px-6 py-5">
        <Field label="Full Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className={inputClass} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
          </Field>
        </div>
        <Field label="Street Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className={inputClass} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" className={inputClass} />
          </Field>
          <Field label="ZIP">
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="75001" className={inputClass} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className={textareaClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving…" : "Add Client"}
        </button>
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
    <Modal open={open} onClose={resetAndClose} title="Log Expense" description="Record a business expense">
      <div className="space-y-4 px-6 py-5">
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
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !description.trim() || !amount} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving…" : "Log Expense"}
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
    <Modal open={open} onClose={resetAndClose} title="Upload Invoice" description="Add a supplier invoice for pricing extraction">
      <div className="space-y-4 px-6 py-5">
        {/* Drop zone */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--gray4)] bg-[var(--bg)] px-6 py-8 transition-colors hover:border-[var(--accent)]"
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
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Uploading…" : "Upload Invoice"}
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
    <Modal open={open} onClose={onClose} title="Edit Profile" width="w-[400px]">
      <div className="space-y-4 px-6 py-5">
        <Field label="Full Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={user?.email ?? ""} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
        </Field>
        <Field label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
        </Field>
        <Field label="Role">
          <input value={user?.role ?? ""} disabled className={`${inputClass} opacity-50 cursor-not-allowed capitalize`} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={onClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
