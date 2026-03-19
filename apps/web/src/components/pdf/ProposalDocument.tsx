/**
 * ProposalDocument -- Full branded multi-page proposal PDF.
 * Uses the same React-PDF primitives pattern as the existing estimate PDF components.
 */
import type { Estimate, EstimateLineItem, Client, EstimateChangeOrder } from "@proestimate/shared/types";
import { createPDFStyles, groupLineItems, fmt, NAVY, NAVY_LIGHT, WHITE, GRAY_BG, GRAY_BORDER, GRAY_TEXT, BLACK, TIER_LABELS } from "./pdfStyles";
import { PDFLineItemsSection } from "./PDFLineItems";
import { PDFSummarySection } from "./PDFSummary";
import { PDFPaymentScheduleSection } from "./PDFPaymentSchedule";
import { PDFSignatureSection } from "./PDFSignature";

export interface ProposalCompanyInfo { name: string; address: string; city_state_zip: string; email: string; phone?: string; license?: string; }
export interface ProposalConfig { depositPercent?: number; showTimeline?: boolean; showPaymentSchedule?: boolean; showPhotos?: boolean; accentColor?: string; warrantyText?: string; termsText?: string; }
export interface ProposalDocumentProps { estimate: Estimate; client: Client | null; company: ProposalCompanyInfo; lineItems: EstimateLineItem[]; changeOrders: EstimateChangeOrder[]; proposalConfig?: ProposalConfig; }

const DEFAULT_TERMS = [
  "1. SCOPE OF WORK: The contractor agrees to perform the work described in this proposal in a workmanlike manner and in compliance with all applicable building codes and regulations.",
  "2. CHANGES: Any changes to the scope of work must be documented in a written change order signed by both parties. Additional costs will be communicated before work proceeds.",
  "3. PERMITS: Unless otherwise stated, the contractor will obtain all necessary permits and inspections required for the work described herein.",
  "4. WARRANTY: The contractor warrants all workmanship for a period of one (1) year from the date of project completion. Manufacturer warranties on materials apply separately.",
  "5. LIABILITY: The contractor maintains general liability insurance and workers' compensation coverage. Proof of insurance available upon request.",
  "6. PAYMENT TERMS: Payments are due upon receipt of invoice for each milestone. Late payments may be subject to a finance charge of 1.5% per month.",
  "7. CANCELLATION: Either party may cancel this agreement with written notice. The client is responsible for payment of all work completed and materials ordered prior to cancellation.",
  "8. DISPUTE RESOLUTION: Any disputes arising from this agreement shall first be addressed through good-faith negotiation between the parties.",
].join("\n\n");

const DEFAULT_PHASES: Record<string, string[]> = {
  "New Construction": ["Permitting & Site Prep", "Foundation", "Framing", "Rough-In (MEP)", "Insulation & Drywall", "Finishes", "Final Inspection & Punch List"],
  "Renovation": ["Demo & Prep", "Structural Work", "Rough-In (MEP)", "Drywall & Finishes", "Final Inspection & Punch List"],
  "Addition": ["Permitting & Site Prep", "Foundation", "Framing", "Rough-In (MEP)", "Finishes", "Final Inspection"],
  "Remodel": ["Demo", "Rough-In", "Finishes", "Final Walkthrough"],
  "Repair": ["Assessment", "Repair Work", "Final Inspection"],
  default: ["Project Setup", "Phase 1", "Phase 2", "Completion & Walkthrough"],
};

function getPhasesForProject(projectType: string): string[] {
  const normalizedType = projectType.toLowerCase();
  for (const [key, phases] of Object.entries(DEFAULT_PHASES)) {
    if (key === "default") continue;
    if (normalizedType.includes(key.toLowerCase())) return phases;
  }
  return DEFAULT_PHASES.default ?? ["Project Setup", "Phase 1", "Phase 2", "Completion & Walkthrough"];
}

function CoverPageSection({ estimate, client, company, estimateDate, accentColor, View, Text }: { estimate: Estimate; client: Client | null; company: ProposalCompanyInfo; estimateDate: string; accentColor: string; View: any; Text: any }) {
  return (<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
    <View style={{ width: "100%", height: 4, backgroundColor: accentColor, marginBottom: 60 }} />
    <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: accentColor, textAlign: "center", marginBottom: 8 }}>{company.name}</Text>
    {company.address ? <Text style={{ fontSize: 10, color: GRAY_TEXT, textAlign: "center", lineHeight: 1.5 }}>{company.address}</Text> : null}
    {company.city_state_zip ? <Text style={{ fontSize: 10, color: GRAY_TEXT, textAlign: "center", lineHeight: 1.5 }}>{company.city_state_zip}</Text> : null}
    <Text style={{ fontSize: 10, color: GRAY_TEXT, textAlign: "center", lineHeight: 1.5 }}>{[company.email, company.phone].filter(Boolean).join("  |  ")}</Text>
    {company.license ? <Text style={{ fontSize: 9, color: GRAY_TEXT, textAlign: "center", marginTop: 2 }}>License: {company.license}</Text> : null}
    <View style={{ width: 80, height: 2, backgroundColor: GRAY_BORDER, marginVertical: 40 }} />
    <Text style={{ fontSize: 36, fontFamily: "Helvetica-Bold", color: accentColor, textAlign: "center", letterSpacing: 3, marginBottom: 20 }}>PROPOSAL</Text>
    <Text style={{ fontSize: 14, color: BLACK, textAlign: "center", marginBottom: 6 }}>{estimate.project_type}</Text>
    <Text style={{ fontSize: 11, color: GRAY_TEXT, textAlign: "center", marginBottom: 30 }}>{TIER_LABELS[estimate.tier] ?? estimate.tier} Tier</Text>
    {client && (<View style={{ alignItems: "center", marginBottom: 12 }}><Text style={{ fontSize: 9, color: GRAY_TEXT, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Prepared For</Text><Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK }}>{client.full_name}</Text>{estimate.project_address && <Text style={{ fontSize: 10, color: GRAY_TEXT, marginTop: 2 }}>{estimate.project_address}</Text>}</View>)}
    <Text style={{ fontSize: 10, color: GRAY_TEXT, marginTop: 20 }}>{estimateDate}</Text>
    <Text style={{ fontSize: 9, color: GRAY_TEXT, marginTop: 4 }}>Ref: {estimate.estimate_number}</Text>
    <View style={{ width: "100%", height: 4, backgroundColor: accentColor, marginTop: 60 }} />
  </View>);
}

function ScopeOfWorkSection({ estimate, accentColor, s, View, Text }: { estimate: Estimate; accentColor: string; s: any; View: any; Text: any }) {
  const hasInclusions = estimate.scope_inclusions.length > 0;
  const hasExclusions = estimate.scope_exclusions.length > 0;
  if (!hasInclusions && !hasExclusions) return null;
  return (<View wrap={false}><Text style={s.sectionHeading}>Scope of Work</Text><View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
    <View style={{ flex: 1 }}><View style={{ backgroundColor: GRAY_BG, borderRadius: 4, padding: 12, minHeight: 60 }}><Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: accentColor, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>What&apos;s Included</Text>{hasInclusions ? estimate.scope_inclusions.map((item, i) => (<Text key={i} style={{ fontSize: 9, color: BLACK, lineHeight: 1.7, paddingLeft: 4 }}>{"\u2022"} {item}</Text>)) : <Text style={{ fontSize: 9, color: GRAY_TEXT, fontStyle: "italic" }}>See line items for full scope</Text>}</View></View>
    <View style={{ flex: 1 }}><View style={{ backgroundColor: GRAY_BG, borderRadius: 4, padding: 12, minHeight: 60 }}><Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: GRAY_TEXT, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>What&apos;s Not Included</Text>{hasExclusions ? estimate.scope_exclusions.map((item, i) => (<Text key={i} style={{ fontSize: 9, color: BLACK, lineHeight: 1.7, paddingLeft: 4 }}>{"\u2022"} {item}</Text>)) : <Text style={{ fontSize: 9, color: GRAY_TEXT, fontStyle: "italic" }}>No exclusions noted</Text>}</View></View>
  </View></View>);
}

function TimelineSection({ estimate, accentColor, s, View, Text }: { estimate: Estimate; accentColor: string; s: any; View: any; Text: any }) {
  const phases = getPhasesForProject(estimate.project_type);
  const startDate = estimate.estimated_start ? new Date(estimate.estimated_start).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "TBD";
  const endDate = estimate.estimated_end ? new Date(estimate.estimated_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "TBD";
  return (<View wrap={false}><Text style={s.sectionHeading}>Project Timeline</Text>
    <View style={{ flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 12 }}>
      <View style={{ flex: 1, backgroundColor: GRAY_BG, borderRadius: 4, padding: 10 }}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: accentColor, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>Estimated Start</Text><Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK }}>{startDate}</Text></View>
      <View style={{ flex: 1, backgroundColor: GRAY_BG, borderRadius: 4, padding: 10 }}><Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: accentColor, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>Estimated Completion</Text><Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK }}>{endDate}</Text></View>
    </View>
    <View style={{ flexDirection: "row", backgroundColor: NAVY_LIGHT, paddingVertical: 5, paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "10%" }}>#</Text>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "50%" }}>Phase</Text>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "20%" }}>Start Date</Text>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "20%" }}>End Date</Text>
    </View>
    {phases.map((phase, idx) => (<View key={idx} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: GRAY_BORDER, backgroundColor: idx % 2 === 1 ? GRAY_BG : WHITE }}>
      <Text style={{ fontSize: 9, color: GRAY_TEXT, width: "10%" }}>{idx + 1}</Text><Text style={{ fontSize: 9, color: BLACK, width: "50%" }}>{phase}</Text><Text style={{ fontSize: 9, color: GRAY_TEXT, width: "20%" }}>___________</Text><Text style={{ fontSize: 9, color: GRAY_TEXT, width: "20%" }}>___________</Text>
    </View>))}
    <Text style={{ fontSize: 8, color: GRAY_TEXT, marginTop: 6, fontStyle: "italic" }}>Dates are estimates and may be adjusted based on weather, material availability, permitting, and site conditions.</Text>
  </View>);
}

function ProposalTermsSection({ accentColor, warrantyText, termsText, s, View, Text }: { accentColor: string; warrantyText?: string; termsText?: string; s: any; View: any; Text: any }) {
  const content = termsText || DEFAULT_TERMS;
  return (<View><Text style={s.sectionHeading}>Terms & Conditions</Text><View style={{ marginTop: 8, paddingHorizontal: 4 }}>{content.split("\n\n").map((paragraph, idx) => (<Text key={idx} style={{ fontSize: 9, color: BLACK, lineHeight: 1.6, marginBottom: 6 }}>{paragraph}</Text>))}</View>
    {warrantyText && (<View style={{ backgroundColor: GRAY_BG, borderLeftWidth: 3, borderLeftColor: accentColor, padding: 12, marginTop: 10, borderRadius: 2 }}><Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: accentColor, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Warranty</Text><Text style={{ fontSize: 9, color: BLACK, lineHeight: 1.6 }}>{warrantyText}</Text></View>)}
  </View>);
}

function ProposalFooterSection({ companyName, s, View, Text }: { companyName: string; s: any; View: any; Text: any }) {
  return (<View style={s.footer} fixed><Text style={s.footerText}>{companyName} -- Confidential Proposal</Text><Text style={s.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`} /></View>);
}

export function ProposalDocument({ estimate, client, company, lineItems, changeOrders, proposalConfig, Document, Page, View, Text, StyleSheet }: ProposalDocumentProps & { Document: any; Page: any; View: any; Text: any; StyleSheet: any }) {
  const config = { depositPercent: proposalConfig?.depositPercent ?? 0.3, showTimeline: proposalConfig?.showTimeline ?? true, showPaymentSchedule: proposalConfig?.showPaymentSchedule ?? true, showPhotos: proposalConfig?.showPhotos ?? false, accentColor: proposalConfig?.accentColor ?? NAVY, warrantyText: proposalConfig?.warrantyText, termsText: proposalConfig?.termsText };
  const s = createPDFStyles(StyleSheet);
  const groups = groupLineItems(lineItems);
  const estimateDate = new Date(estimate.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const interiorHeader = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: config.accentColor }}>
      <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: config.accentColor }}>{company.name}</Text>
      <Text style={{ fontSize: 9, color: GRAY_TEXT }}>{estimate.estimate_number} | {estimateDate}</Text>
    </View>
  );

  return (<Document>
    <Page size="LETTER" style={{ fontFamily: "Helvetica", fontSize: 10, color: BLACK, paddingTop: 40, paddingBottom: 60, paddingHorizontal: 40 }}>
      <CoverPageSection estimate={estimate} client={client} company={company} estimateDate={estimateDate} accentColor={config.accentColor} View={View} Text={Text} />
      <ProposalFooterSection companyName={company.name} s={s} View={View} Text={Text} />
    </Page>
    <Page size="LETTER" style={s.page}>
      {interiorHeader}
      <ScopeOfWorkSection estimate={estimate} accentColor={config.accentColor} s={s} View={View} Text={Text} />
      <PDFLineItemsSection groups={groups} s={s} View={View} Text={Text} />
      <PDFSummarySection estimate={estimate} changeOrders={changeOrders} s={s} View={View} Text={Text} />
      <ProposalFooterSection companyName={company.name} s={s} View={View} Text={Text} />
    </Page>
    {(config.showPaymentSchedule || config.showTimeline) && (
      <Page size="LETTER" style={s.page}>
        {interiorHeader}
        {config.showPaymentSchedule && <PDFPaymentScheduleSection grandTotal={Number(estimate.grand_total)} depositPercent={config.depositPercent} s={s} View={View} Text={Text} />}
        {config.showTimeline && <View style={{ marginTop: config.showPaymentSchedule ? 20 : 0 }}><TimelineSection estimate={estimate} accentColor={config.accentColor} s={s} View={View} Text={Text} /></View>}
        <ProposalFooterSection companyName={company.name} s={s} View={View} Text={Text} />
      </Page>
    )}
    <Page size="LETTER" style={s.page}>
      {interiorHeader}
      <ProposalTermsSection accentColor={config.accentColor} warrantyText={config.warrantyText} termsText={config.termsText} s={s} View={View} Text={Text} />
      <PDFSignatureSection companyName={company.name} s={s} View={View} Text={Text} />
      <ProposalFooterSection companyName={company.name} s={s} View={View} Text={Text} />
    </Page>
  </Document>);
}

export async function buildProposalDoc(estimate: Estimate, lineItems: EstimateLineItem[], client: Client | null, company: ProposalCompanyInfo, changeOrders: EstimateChangeOrder[] = [], proposalConfig?: ProposalConfig) {
  const { Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  return (<ProposalDocument estimate={estimate} client={client} company={company} lineItems={lineItems} changeOrders={changeOrders} proposalConfig={proposalConfig} Document={Document} Page={Page} View={View} Text={Text} StyleSheet={StyleSheet} />);
}

export async function generateProposalPDF(estimate: Estimate, lineItems: EstimateLineItem[], client: Client | null, company: ProposalCompanyInfo, changeOrders: EstimateChangeOrder[] = [], proposalConfig?: ProposalConfig): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await buildProposalDoc(estimate, lineItems, client, company, changeOrders, proposalConfig);
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${estimate.estimate_number}-proposal.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateProposalPDFBase64(estimate: Estimate, lineItems: EstimateLineItem[], client: Client | null, company: ProposalCompanyInfo, changeOrders: EstimateChangeOrder[] = [], proposalConfig?: ProposalConfig): Promise<string> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await buildProposalDoc(estimate, lineItems, client, company, changeOrders, proposalConfig);
  const blob = await pdf(doc).toBlob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result as string; resolve(dataUrl.split(",")[1] ?? ""); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
