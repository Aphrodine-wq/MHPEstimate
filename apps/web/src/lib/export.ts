function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface CSVColumn {
  key: string;
  label: string;
}

export function exportToCSV(data: Record<string, unknown>[], columns: CSVColumn[], filename: string) {
  const header = columns.map((c) => escapeCSV(c.label)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => escapeCSV(row[c.key])).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEstimatesCSV(estimates: Record<string, unknown>[]) {
  exportToCSV(estimates, [
    { key: "estimate_number", label: "Estimate #" },
    { key: "project_type", label: "Project Type" },
    { key: "status", label: "Status" },
    { key: "tier", label: "Tier" },
    { key: "grand_total", label: "Grand Total" },
    { key: "created_at", label: "Created" },
  ], `estimates-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportClientsCSV(clients: Record<string, unknown>[]) {
  exportToCSV(clients, [
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "created_at", label: "Created" },
  ], `clients-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportInvoicesCSV(invoices: Record<string, unknown>[]) {
  exportToCSV(invoices, [
    { key: "supplier_name", label: "Supplier" },
    { key: "invoice_number", label: "Invoice #" },
    { key: "status", label: "Status" },
    { key: "invoice_date", label: "Invoice Date" },
    { key: "created_at", label: "Created" },
  ], `invoices-${new Date().toISOString().slice(0, 10)}.csv`);
}
