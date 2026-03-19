/**
 * Standalone Change Order PDF Document.
 *
 * Generates a professional, signable change order document that a contractor
 * can produce on the spot when a homeowner requests additional work.
 * Uses @react-pdf/renderer primitives passed as props.
 */
import { fmt, NAVY, NAVY_LIGHT, GRAY_BG, GRAY_BORDER, GRAY_TEXT, BLACK, WHITE } from "./pdfStyles";

/* -- Types -- */

interface MaterialDetail {
  description: string;
  cost: number;
}

interface LaborDetail {
  description: string;
  hours: number;
  rate: number;
}

export interface ChangeOrderDocumentProps {
  changeOrder: {
    change_number: number;
    description: string;
    cost_impact: number;
    timeline_impact?: string;
    materials_detail?: MaterialDetail[];
    labor_detail?: LaborDetail[];
  };
  estimate: {
    estimate_number: string;
    grand_total: number;
    project_type: string;
    project_address?: string;
  };
  client: { full_name: string; email?: string; phone?: string } | null;
  company: {
    name: string;
    address: string;
    city_state_zip: string;
    email: string;
    phone?: string;
    license?: string;
  };
  s: any;
  View: any;
  Text: any;
  Page: any;
}

/* -- Component -- */

export function ChangeOrderDocument({ changeOrder, estimate, client, company, s, View, Text, Page }: ChangeOrderDocumentProps) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const materialsTotal = changeOrder.materials_detail ? changeOrder.materials_detail.reduce((sum, m) => sum + m.cost, 0) : 0;
  const laborTotal = changeOrder.labor_detail ? changeOrder.labor_detail.reduce((sum, l) => sum + l.hours * l.rate, 0) : 0;
  const hasItemizedBreakdown = (changeOrder.materials_detail && changeOrder.materials_detail.length > 0) || (changeOrder.labor_detail && changeOrder.labor_detail.length > 0);
  const newProjectTotal = estimate.grand_total + changeOrder.cost_impact;

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.companyName}>{company.name}</Text>
          {company.address ? <Text style={s.companyDetail}>{company.address}</Text> : null}
          {company.city_state_zip ? <Text style={s.companyDetail}>{company.city_state_zip}</Text> : null}
          <Text style={s.companyDetail}>{company.email}</Text>
          {company.phone ? <Text style={s.companyDetail}>{company.phone}</Text> : null}
          {company.license ? <Text style={s.companyDetail}>License: {company.license}</Text> : null}
        </View>
        <View>
          <Text style={s.coDocTitle}>CHANGE ORDER</Text>
          <Text style={s.coDocMeta}>CO #{changeOrder.change_number}</Text>
          <Text style={s.coDocMeta}>Date: {today}</Text>
          <Text style={s.coDocMeta}>Estimate: {estimate.estimate_number}</Text>
        </View>
      </View>
      <View style={s.infoRow}>
        <View style={s.infoBox}>
          <Text style={s.infoBoxLabel}>Client Information</Text>
          {client ? (<><Text style={s.infoBoxText}>{client.full_name}</Text>{client.email ? <Text style={s.infoBoxText}>{client.email}</Text> : null}{client.phone ? <Text style={s.infoBoxText}>{client.phone}</Text> : null}</>) : (<Text style={s.infoBoxText}>No client assigned</Text>)}
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoBoxLabel}>Project Details</Text>
          <Text style={s.infoBoxText}>Type: {estimate.project_type}</Text>
          {estimate.project_address ? <Text style={s.infoBoxText}>Address: {estimate.project_address}</Text> : null}
        </View>
      </View>
      <View style={s.coRefBox}><Text style={s.coRefText}>Original Estimate #{estimate.estimate_number}, Total: ${fmt(estimate.grand_total)}</Text></View>
      <Text style={s.sectionHeading}>Change Description</Text>
      <View style={s.coDescriptionBox}><Text style={s.coDescriptionText}>{changeOrder.description}</Text></View>
      <Text style={s.sectionHeading}>Cost Breakdown</Text>
      {hasItemizedBreakdown ? (
        <View>
          {changeOrder.materials_detail && changeOrder.materials_detail.length > 0 && (
            <View>
              <View style={s.coBreakdownHeader}><Text style={[s.tableHeaderText, { width: "70%" }]}>Additional Materials</Text><Text style={[s.tableHeaderText, { width: "30%", textAlign: "right" }]}>Cost</Text></View>
              {changeOrder.materials_detail.map((mat, idx) => (<View key={`mat-${idx}`} style={[s.coBreakdownRow, idx % 2 === 1 ? s.coBreakdownRowAlt : {}]}><Text style={[s.tableCell, { width: "70%" }]}>{mat.description}</Text><Text style={[s.tableCellRight, { width: "30%" }]}>${fmt(mat.cost)}</Text></View>))}
              <View style={s.coBreakdownSubtotalRow}><Text style={[s.subtotalLabel, { width: "70%" }]}>Materials Subtotal</Text><Text style={[s.subtotalValue, { width: "30%", textAlign: "right" }]}>${fmt(materialsTotal)}</Text></View>
            </View>
          )}
          {changeOrder.labor_detail && changeOrder.labor_detail.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={s.coBreakdownHeader}><Text style={[s.tableHeaderText, { width: "40%" }]}>Additional Labor</Text><Text style={[s.tableHeaderText, { width: "20%", textAlign: "right" }]}>Hours</Text><Text style={[s.tableHeaderText, { width: "20%", textAlign: "right" }]}>Rate</Text><Text style={[s.tableHeaderText, { width: "20%", textAlign: "right" }]}>Total</Text></View>
              {changeOrder.labor_detail.map((lab, idx) => (<View key={`lab-${idx}`} style={[s.coBreakdownRow, idx % 2 === 1 ? s.coBreakdownRowAlt : {}]}><Text style={[s.tableCell, { width: "40%" }]}>{lab.description}</Text><Text style={[s.tableCellRight, { width: "20%" }]}>{lab.hours}</Text><Text style={[s.tableCellRight, { width: "20%" }]}>${fmt(lab.rate)}</Text><Text style={[s.tableCellRight, { width: "20%" }]}>${fmt(lab.hours * lab.rate)}</Text></View>))}
              <View style={s.coBreakdownSubtotalRow}><Text style={[s.subtotalLabel, { width: "60%" }]}>Labor Subtotal</Text><Text style={[s.subtotalValue, { width: "40%", textAlign: "right" }]}>${fmt(laborTotal)}</Text></View>
            </View>
          )}
        </View>
      ) : null}
      <View style={s.coFinancialBox}>
        {hasItemizedBreakdown && (<><View style={s.finRow}><Text style={s.finLabel}>Materials</Text><Text style={s.finValue}>${fmt(materialsTotal)}</Text></View><View style={[s.finRow, s.finRowAlt]}><Text style={s.finLabel}>Labor</Text><Text style={s.finValue}>${fmt(laborTotal)}</Text></View></>)}
        <View style={s.coChangeRow}><Text style={s.coChangeLabel}>Change Order Total</Text><Text style={s.coChangeValue}>{changeOrder.cost_impact >= 0 ? "+" : "-"}${fmt(Math.abs(changeOrder.cost_impact))}</Text></View>
        <View style={s.finRow}><Text style={s.finLabel}>Original Project Total</Text><Text style={s.finValue}>${fmt(estimate.grand_total)}</Text></View>
        <View style={s.grandTotalRow}><Text style={s.grandTotalLabel}>NEW PROJECT TOTAL</Text><Text style={s.grandTotalValue}>${fmt(newProjectTotal)}</Text></View>
      </View>
      {changeOrder.timeline_impact ? (<View style={s.coTimelineBox}><Text style={s.coTimelineLabel}>Timeline Impact</Text><Text style={s.coTimelineText}>This change order adds approximately {changeOrder.timeline_impact} to the project timeline.</Text></View>) : null}
      <View style={s.coAuthBlock}>
        <Text style={s.coAuthHeading}>Authorization</Text>
        <Text style={s.coAuthNotice}>By signing below, the client authorizes the additional work described above at the stated price.</Text>
        <Text style={s.coAuthNotice}>Work will not begin on change order items until this document is signed.</Text>
        <View style={s.coSignatureRow}><View style={s.coSignatureBlock}><View style={s.coSignatureLine} /><Text style={s.coSignatureLabel}>Client Signature</Text><Text style={s.coSignatureName}>{client ? client.full_name : "____________________"}</Text></View><View style={s.coSignatureBlock}><View style={s.coSignatureLine} /><Text style={s.coSignatureLabel}>Date</Text></View></View>
        <View style={s.coSignatureRow}><View style={s.coSignatureBlock}><View style={s.coSignatureLine} /><Text style={s.coSignatureLabel}>Contractor Signature</Text><Text style={s.coSignatureName}>{company.name}</Text></View><View style={s.coSignatureBlock}><View style={s.coSignatureLine} /><Text style={s.coSignatureLabel}>Date</Text></View></View>
      </View>
      <View style={s.footer} fixed><Text style={s.footerText}>Change Order #{changeOrder.change_number} for Estimate {estimate.estimate_number}. This document constitutes a binding amendment to the original estimate upon signature by both parties.</Text><Text style={s.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`} /></View>
    </Page>
  );
}

/* -- Styles factory -- */

export function createChangeOrderStyles(StyleSheet: { create: (styles: Record<string, any>) => any }) {
  return StyleSheet.create({
    coDocTitle: { fontSize: 24, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "right" },
    coDocMeta: { fontSize: 9, color: GRAY_TEXT, textAlign: "right", marginTop: 2 },
    coRefBox: { backgroundColor: GRAY_BG, borderWidth: 1, borderColor: GRAY_BORDER, borderRadius: 4, padding: 10, marginBottom: 16 },
    coRefText: { fontSize: 9, color: GRAY_TEXT, fontFamily: "Helvetica-Bold" },
    coDescriptionBox: { backgroundColor: WHITE, borderWidth: 1, borderColor: GRAY_BORDER, borderRadius: 4, padding: 12, marginBottom: 16, minHeight: 60 },
    coDescriptionText: { fontSize: 10, color: BLACK, lineHeight: 1.6 },
    coBreakdownHeader: { flexDirection: "row", backgroundColor: NAVY_LIGHT, paddingVertical: 5, paddingHorizontal: 8 },
    coBreakdownRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: GRAY_BORDER },
    coBreakdownRowAlt: { backgroundColor: GRAY_BG },
    coBreakdownSubtotalRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, backgroundColor: "#edf2f7", borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
    coFinancialBox: { marginTop: 12, alignSelf: "flex-end", width: 300, borderWidth: 1, borderColor: GRAY_BORDER, borderRadius: 4, overflow: "hidden" },
    coChangeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: NAVY_LIGHT },
    coChangeLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
    coChangeValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
    coTimelineBox: { marginTop: 16, backgroundColor: GRAY_BG, borderWidth: 1, borderColor: GRAY_BORDER, borderRadius: 4, padding: 12 },
    coTimelineLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    coTimelineText: { fontSize: 10, color: BLACK, lineHeight: 1.5 },
    coAuthBlock: { marginTop: 24, borderTopWidth: 2, borderTopColor: NAVY, paddingTop: 16 },
    coAuthHeading: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 8 },
    coAuthNotice: { fontSize: 9, color: BLACK, lineHeight: 1.6, marginBottom: 4 },
    coSignatureRow: { flexDirection: "row", gap: 24, marginTop: 28 },
    coSignatureBlock: { flex: 1 },
    coSignatureLine: { borderBottomWidth: 1, borderBottomColor: BLACK, marginBottom: 4, height: 20 },
    coSignatureLabel: { fontSize: 8, color: GRAY_TEXT, textTransform: "uppercase", letterSpacing: 0.5 },
    coSignatureName: { fontSize: 8, color: GRAY_TEXT, marginTop: 2 },
  });
}

/* -- Public API: Generate & Download -- */

export async function generateChangeOrderPDF(
  props: Omit<ChangeOrderDocumentProps, "s" | "View" | "Text" | "Page">
): Promise<void> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import("@react-pdf/renderer");
  const { createPDFStyles } = await import("./pdfStyles");
  const baseStyles = createPDFStyles(StyleSheet);
  const coStyles = createChangeOrderStyles(StyleSheet);
  const s = { ...baseStyles, ...coStyles };
  const doc = (<Document><ChangeOrderDocument changeOrder={props.changeOrder} estimate={props.estimate} client={props.client} company={props.company} s={s} View={View} Text={Text} Page={Page} /></Document>);
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CO-${props.changeOrder.change_number}-${props.estimate.estimate_number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateChangeOrderPDFBase64(
  props: Omit<ChangeOrderDocumentProps, "s" | "View" | "Text" | "Page">
): Promise<string> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import("@react-pdf/renderer");
  const { createPDFStyles } = await import("./pdfStyles");
  const baseStyles = createPDFStyles(StyleSheet);
  const coStyles = createChangeOrderStyles(StyleSheet);
  const s = { ...baseStyles, ...coStyles };
  const doc = (<Document><ChangeOrderDocument changeOrder={props.changeOrder} estimate={props.estimate} client={props.client} company={props.company} s={s} View={View} Text={Text} Page={Page} /></Document>);
  const blob = await pdf(doc).toBlob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result as string; resolve(dataUrl.split(",")[1] ?? ""); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
