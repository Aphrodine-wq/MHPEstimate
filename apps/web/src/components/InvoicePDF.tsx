import type { Invoice } from "@proestimate/shared/types";

/* ── Color palette ── */

const NAVY = "#1e3a5f";
const NAVY_LIGHT = "#2c5282";
const GRAY_BG = "#f7f8fa";
const GRAY_BORDER = "#d0d5dd";
const GRAY_TEXT = "#667085";
const BLACK = "#1a1a1a";
const WHITE = "#ffffff";

/* ── Helpers ── */

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280",
  processing: "#1565c0",
  review: "#e65100",
  confirmed: "#2e7d32",
  error: "#c62828",
};

/* ── Generate & Download (dynamic import of @react-pdf/renderer) ── */

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import("@react-pdf/renderer");

  const s = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: BLACK,
      paddingTop: 40,
      paddingBottom: 60,
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: NAVY,
    },
    companyName: {
      fontSize: 20,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
      marginBottom: 4,
    },
    companyDetail: {
      fontSize: 8,
      color: GRAY_TEXT,
      lineHeight: 1.5,
    },
    invoiceTitle: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
      textAlign: "right",
    },
    invoiceMeta: {
      fontSize: 9,
      color: GRAY_TEXT,
      textAlign: "right",
      marginTop: 2,
    },
    infoRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 20,
    },
    infoBox: {
      flex: 1,
      backgroundColor: GRAY_BG,
      borderRadius: 4,
      padding: 12,
    },
    infoBoxLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    infoBoxText: {
      fontSize: 9,
      color: BLACK,
      lineHeight: 1.5,
    },
    statusBadge: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: WHITE,
      backgroundColor: NAVY_LIGHT,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 3,
      alignSelf: "flex-start",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    sectionHeading: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: WHITE,
      backgroundColor: NAVY,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 3,
      marginBottom: 1,
      marginTop: 16,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: NAVY_LIGHT,
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    tableHeaderText: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: WHITE,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: GRAY_BORDER,
    },
    tableRowAlt: {
      backgroundColor: GRAY_BG,
    },
    tableCell: {
      fontSize: 9,
      color: BLACK,
    },
    tableCellRight: {
      fontSize: 9,
      color: BLACK,
      textAlign: "right",
    },
    colDesc: { width: "50%" },
    colQty: { width: "15%", textAlign: "right" },
    colPrice: { width: "17.5%", textAlign: "right" },
    colTotal: { width: "17.5%", textAlign: "right" },
    financialBox: {
      marginTop: 20,
      alignSelf: "flex-end",
      width: 260,
      borderWidth: 1,
      borderColor: GRAY_BORDER,
      borderRadius: 4,
      overflow: "hidden",
    },
    finRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    finRowAlt: {
      backgroundColor: GRAY_BG,
    },
    finLabel: {
      fontSize: 9,
      color: GRAY_TEXT,
    },
    finValue: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: BLACK,
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: NAVY,
    },
    grandTotalLabel: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: WHITE,
    },
    grandTotalValue: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: WHITE,
    },
    rawSection: {
      marginTop: 16,
    },
    rawLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    rawRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    rawKey: {
      fontSize: 9,
      color: GRAY_TEXT,
    },
    rawValue: {
      fontSize: 9,
      color: BLACK,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      borderTopWidth: 1,
      borderTopColor: GRAY_BORDER,
      paddingTop: 8,
    },
    footerText: {
      fontSize: 7,
      color: GRAY_TEXT,
      textAlign: "center",
      lineHeight: 1.5,
    },
  });

  const pd = invoice.parsed_data as Record<string, unknown> | null;
  const lineItems: Array<Record<string, unknown>> = (pd?.line_items as Array<Record<string, unknown>>) ?? [];
  const total = (pd?.total ?? pd?.amount ?? pd?.grand_total ?? null) as number | null;
  const subtotal = (pd?.subtotal ?? null) as number | null;
  const tax = (pd?.tax ?? null) as number | null;

  const invoiceDate = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const otherFields = pd
    ? Object.entries(pd).filter(
        ([k]) => !["line_items", "total", "amount", "grand_total", "subtotal", "tax"].includes(k)
      )
    : [];

  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>MHP Construction</Text>
            <Text style={s.companyDetail}>404 Galleria Drive, Suite #6</Text>
            <Text style={s.companyDetail}>Oxford, MS 38655</Text>
            <Text style={s.companyDetail}>info@mhpestimate.cloud</Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            {invoice.invoice_number && (
              <Text style={s.invoiceMeta}>{invoice.invoice_number}</Text>
            )}
            <Text style={s.invoiceMeta}>Date: {invoiceDate}</Text>
          </View>
        </View>

        {/* Invoice Info */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoBoxLabel}>Supplier Information</Text>
            <Text style={s.infoBoxText}>{invoice.supplier_name ?? "Unknown Supplier"}</Text>
            {invoice.invoice_number && (
              <Text style={s.infoBoxText}>Invoice #: {invoice.invoice_number}</Text>
            )}
            <Text style={s.infoBoxText}>Date: {invoiceDate}</Text>
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoBoxLabel}>Invoice Status</Text>
            <Text
              style={[
                s.statusBadge,
                { backgroundColor: STATUS_COLORS[invoice.status] ?? NAVY_LIGHT },
              ]}
            >
              {invoice.status}
            </Text>
            <Text style={[s.infoBoxText, { marginTop: 6 }]}>
              File: {invoice.file_path}
            </Text>
            <Text style={s.infoBoxText}>
              Uploaded: {new Date(invoice.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <View>
            <Text style={s.sectionHeading}>Line Items</Text>

            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
              <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
              <Text style={[s.tableHeaderText, s.colPrice]}>Unit Price</Text>
              <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
            </View>

            {lineItems.map((item, idx: number) => {
              const desc = (item.description ?? item.name ?? `Item ${idx + 1}`) as string;
              const qty = item.quantity ?? "";
              const price = item.unit_price ?? item.price ?? "";
              const itemTotal = item.total ?? item.amount ?? (qty && price ? Number(qty) * Number(price) : "");
              return (
                <View
                  key={idx}
                  style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <Text style={[s.tableCell, s.colDesc]}>{String(desc)}</Text>
                  <Text style={[s.tableCellRight, s.colQty]}>{String(qty)}</Text>
                  <Text style={[s.tableCellRight, s.colPrice]}>
                    {price !== "" ? `$${fmt(Number(price))}` : ""}
                  </Text>
                  <Text style={[s.tableCellRight, s.colTotal]}>
                    {itemTotal !== "" ? `$${fmt(Number(itemTotal))}` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Financial Summary */}
        {total !== null && (
          <View style={s.financialBox}>
            {subtotal !== null && (
              <View style={s.finRow}>
                <Text style={s.finLabel}>Subtotal</Text>
                <Text style={s.finValue}>${fmt(Number(subtotal))}</Text>
              </View>
            )}
            {tax !== null && (
              <View style={[s.finRow, s.finRowAlt]}>
                <Text style={s.finLabel}>Tax</Text>
                <Text style={s.finValue}>${fmt(Number(tax))}</Text>
              </View>
            )}
            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalLabel}>TOTAL</Text>
              <Text style={s.grandTotalValue}>${fmt(Number(total))}</Text>
            </View>
          </View>
        )}

        {/* Other Parsed Fields */}
        {otherFields.length > 0 && (
          <View style={s.rawSection}>
            <Text style={s.rawLabel}>Additional Information</Text>
            {otherFields.map(([key, value]) => (
              <View key={key} style={s.rawRow}>
                <Text style={s.rawKey}>{key.replace(/_/g, " ")}</Text>
                <Text style={s.rawValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            This document is a summary of the uploaded supplier invoice.
            All data is extracted for internal use by North MS Home Pros.
            Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
          </Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = invoice.invoice_number
    ? `Invoice-${invoice.invoice_number}.pdf`
    : `Invoice-${invoice.supplier_name ?? "unknown"}-${new Date(invoice.created_at).toISOString().split("T")[0]}.pdf`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
