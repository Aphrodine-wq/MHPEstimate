import { useState } from "react";
import { Modal, Field, inputClass, selectClass, textareaClass } from "./Modal";
import { supabase } from "../lib/supabase";
import { createEstimate } from "../lib/store";

/* ── New Estimate Modal ── */

interface NewEstimateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (estimate: any) => void;
}

export function NewEstimateModal({ open, onClose, onCreated }: NewEstimateModalProps) {
  const [projectType, setProjectType] = useState("General");
  const [address, setAddress] = useState("");
  const [tier, setTier] = useState("better");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const est = await createEstimate();
    if (est && supabase) {
      await supabase.from("estimates").update({
        project_type: projectType,
        project_address: address || null,
        tier,
        site_conditions: notes || null,
      }).eq("id", est.id);
    }
    setSaving(false);
    resetAndClose();
    if (est) onCreated?.(est);
  };

  const resetAndClose = () => {
    setProjectType("General");
    setAddress("");
    setTier("better");
    setNotes("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="New Estimate" description="Create a new construction estimate">
      <div className="space-y-4 px-6 py-5">
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
        <Field label="Project Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" className={inputClass} />
        </Field>
        <Field label="Pricing Tier">
          <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
            {(["good", "better", "best"] as const).map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium capitalize transition-all ${tier === t ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"}`}>
                {t}
              </button>
            ))}
          </div>
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

/* ── Add Product Modal ── */

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddProductModal({ open, onClose }: AddProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Flooring");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("sq ft");
  const [sku, setSku] = useState("");
  const [tier, setTier] = useState("mid");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !supabase) return;
    setSaving(true);
    await supabase.from("products").insert({
      name: name.trim(),
      category,
      brand: brand || null,
      unit,
      sku_hd: sku || null,
      tier,
      is_active: true,
    });
    setSaving(false);
    resetAndClose();
  };

  const resetAndClose = () => {
    setName(""); setBrand(""); setSku("");
    onClose();
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Add Product" description="Add a new product to the materials catalog">
      <div className="space-y-4 px-6 py-5">
        <Field label="Product Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="LVP Flooring 7mm" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {["Flooring","Countertops","Cabinetry","Paint","Roofing","Lumber","Plumbing","Electrical","Hardware","Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
              {["sq ft","lin ft","each","bundle","gallon","sheet","box","roll","bag","ton"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="LifeProof" className={inputClass} />
          </Field>
          <Field label="HD SKU">
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU #" className={inputClass} />
          </Field>
        </div>
        <Field label="Tier">
          <div className="flex rounded-lg bg-[var(--gray5)] p-0.5">
            {(["budget", "mid", "premium"] as const).map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium capitalize transition-all ${tier === t ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)]"}`}>
                {t}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button onClick={resetAndClose} className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50">
          {saving ? "Saving…" : "Add Product"}
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
    setSupplier(""); setInvoiceNum(""); setInvoiceDate(""); setFileName("");
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
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) setFileName(file.name);
            };
            input.click();
          }}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="mt-2 text-[13px] font-medium text-[var(--secondary)]">
            {fileName || "Click to select a file"}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--tertiary)]">PDF, PNG, or JPG</p>
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

  // Sync when user changes
  const userId = user?.id;
  useState(() => {
    setName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
  });

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
