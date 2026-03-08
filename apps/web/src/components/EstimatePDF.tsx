import type { Estimate, EstimateLineItem, Client } from "@proestimate/shared/types";

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

const TIER_LABELS: Record<string, string> = {
  budget: "Budget",
  midrange: "Midrange",
  high_end: "High End",
  good: "Budget",
  better: "Midrange",
  best: "High End",
};

const CATEGORY_LABELS: Record<string, string> = {
  material: "Materials",
  labor: "Labor",
  subcontractor: "Subcontractors",
  equipment: "Equipment",
  other: "Other",
};

const CATEGORY_ORDER = ["material", "labor", "subcontractor", "equipment", "other"];

interface GroupedLines {
  category: string;
  label: string;
  items: EstimateLineItem[];
  subtotal: number;
}

function groupLineItems(lineItems: EstimateLineItem[]): GroupedLines[] {
  const groups: Record<string, EstimateLineItem[]> = {};

  for (const li of lineItems) {
    const cat = li.category ?? "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(li);
  }

  return CATEGORY_ORDER
    .filter((cat) => groups[cat] && groups[cat].length > 0)
    .map((cat) => {
      const items = groups[cat]!;
      return {
        category: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        items,
        subtotal: items.reduce(
          (sum, li) => sum + (Number(li.extended_price) || (Number(li.quantity) || 0) * (Number(li.unit_price) || 0)),
          0
        ),
      };
    });
}

/* ── Generate & Download (dynamic import of @react-pdf/renderer) ── */

export async function generateEstimatePDF(
  estimate: Estimate,
  lineItems: EstimateLineItem[],
  client: Client | null
): Promise<void> {
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
    estimateTitle: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
      textAlign: "right",
    },
    estimateMeta: {
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
    subtotalRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      backgroundColor: "#edf2f7",
      borderBottomWidth: 1,
      borderBottomColor: GRAY_BORDER,
    },
    subtotalLabel: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
    },
    subtotalValue: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: NAVY,
      textAlign: "right",
    },
    colDesc: { width: "40%" },
    colQty: { width: "12%", textAlign: "right" },
    colUnit: { width: "12%" },
    colPrice: { width: "18%", textAlign: "right" },
    colTotal: { width: "18%", textAlign: "right" },
    financialBox: {
      marginTop: 20,
      alignSelf: "flex-end",
      width: 280,
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
    scopeItem: {
      fontSize: 9,
      color: BLACK,
      lineHeight: 1.6,
      paddingLeft: 8,
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
    pageNumber: {
      fontSize: 7,
      color: GRAY_TEXT,
      textAlign: "center",
      marginTop: 4,
    },
  });

  const groups = groupLineItems(lineItems);
  const estimateDate = new Date(estimate.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const validThrough = estimate.valid_through
    ? new Date(estimate.valid_through).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>North MS Home Pros</Text>
            <Text style={s.companyDetail}>123 Business Ave, Suite 100</Text>
            <Text style={s.companyDetail}>Tupelo, MS 38801</Text>
            <Text style={s.companyDetail}>info@northmshomepros.com</Text>
          </View>
          <View>
            <Text style={s.estimateTitle}>ESTIMATE</Text>
            <Text style={s.estimateMeta}>{estimate.estimate_number}</Text>
            <Text style={s.estimateMeta}>Date: {estimateDate}</Text>
            {validThrough && (
              <Text style={s.estimateMeta}>Valid Through: {validThrough}</Text>
            )}
          </View>
        </View>

        {/* Client + Project Info */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoBoxLabel}>Client Information</Text>
            {client ? (
              <>
                <Text style={s.infoBoxText}>{client.full_name}</Text>
                {client.address_line1 && <Text style={s.infoBoxText}>{client.address_line1}</Text>}
                {client.address_line2 && <Text style={s.infoBoxText}>{client.address_line2}</Text>}
                {(client.city || client.state || client.zip) && (
                  <Text style={s.infoBoxText}>
                    {[client.city, client.state].filter(Boolean).join(", ")} {client.zip ?? ""}
                  </Text>
                )}
                {client.email && <Text style={s.infoBoxText}>{client.email}</Text>}
                {client.phone && <Text style={s.infoBoxText}>{client.phone}</Text>}
              </>
            ) : (
              <Text style={s.infoBoxText}>No client assigned</Text>
            )}
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoBoxLabel}>Project Details</Text>
            <Text style={s.infoBoxText}>Type: {estimate.project_type}</Text>
            <Text style={s.infoBoxText}>Tier: {TIER_LABELS[estimate.tier] ?? estimate.tier}</Text>
            {estimate.project_address && (
              <Text style={s.infoBoxText}>Address: {estimate.project_address}</Text>
            )}
            {estimate.site_conditions && (
              <Text style={s.infoBoxText}>Site Conditions: {estimate.site_conditions}</Text>
            )}
          </View>
        </View>

        {/* Scope */}
        {(estimate.scope_inclusions.length > 0 || estimate.scope_exclusions.length > 0) && (
          <View style={s.infoRow}>
            {estimate.scope_inclusions.length > 0 && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxLabel}>Scope Inclusions</Text>
                {estimate.scope_inclusions.map((item, i) => (
                  <Text key={i} style={s.scopeItem}>
                    {"\u2022"} {item}
                  </Text>
                ))}
              </View>
            )}
            {estimate.scope_exclusions.length > 0 && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxLabel}>Scope Exclusions</Text>
                {estimate.scope_exclusions.map((item, i) => (
                  <Text key={i} style={s.scopeItem}>
                    {"\u2022"} {item}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Line Items by Category */}
        {groups.map((group) => (
          <View key={group.category} wrap={false}>
            <Text style={s.sectionHeading}>{group.label}</Text>

            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
              <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
              <Text style={[s.tableHeaderText, s.colUnit]}>Unit</Text>
              <Text style={[s.tableHeaderText, s.colPrice]}>Unit Price</Text>
              <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
            </View>

            {group.items.map((li, idx) => {
              const qty = Number(li.quantity) || 0;
              const price = Number(li.unit_price) || 0;
              const extended = Number(li.extended_price) || qty * price;
              return (
                <View
                  key={li.id ?? idx}
                  style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <Text style={[s.tableCell, s.colDesc]}>{li.description}</Text>
                  <Text style={[s.tableCellRight, s.colQty]}>{qty}</Text>
                  <Text style={[s.tableCell, s.colUnit]}>{li.unit ?? ""}</Text>
                  <Text style={[s.tableCellRight, s.colPrice]}>${fmt(price)}</Text>
                  <Text style={[s.tableCellRight, s.colTotal]}>${fmt(extended)}</Text>
                </View>
              );
            })}

            <View style={s.subtotalRow}>
              <Text style={[s.subtotalLabel, s.colDesc]}>{group.label} Subtotal</Text>
              <Text style={[s.subtotalValue, { width: "60%", textAlign: "right" }]}>
                ${fmt(group.subtotal)}
              </Text>
            </View>
          </View>
        ))}

        {/* Financial Summary */}
        <View style={s.financialBox}>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Materials Subtotal</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.materials_subtotal))}</Text>
          </View>
          <View style={[s.finRow, s.finRowAlt]}>
            <Text style={s.finLabel}>Labor Subtotal</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.labor_subtotal))}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Subcontractor Total</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.subcontractor_total))}</Text>
          </View>
          <View style={[s.finRow, s.finRowAlt]}>
            <Text style={s.finLabel}>Permits & Fees</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.permits_fees))}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Overhead & Profit</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.overhead_profit))}</Text>
          </View>
          <View style={[s.finRow, s.finRowAlt]}>
            <Text style={s.finLabel}>Contingency</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.contingency))}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Tax</Text>
            <Text style={s.finValue}>${fmt(Number(estimate.tax))}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={s.grandTotalValue}>${fmt(Number(estimate.grand_total))}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            This estimate is valid for 30 days from the date of issue unless otherwise specified.
            Prices are subject to change based on material availability and site conditions.
            A signed acceptance of this estimate constitutes authorization to proceed with the work described above.
          </Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${estimate.estimate_number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
