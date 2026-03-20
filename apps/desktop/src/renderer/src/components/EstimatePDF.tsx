import type { Estimate, EstimateLineItem, Client, EstimateChangeOrder } from "@proestimate/shared/types";
import { groupLineItems, createPDFStyles } from "./pdf/pdfStyles";
import { PDFHeaderSection } from "./pdf/PDFHeader";
import { PDFLineItemsSection } from "./pdf/PDFLineItems";
import { PDFSummarySection } from "./pdf/PDFSummary";
import { PDFTermsSection } from "./pdf/PDFTerms";

/* -- Company info (pulled from settings or fallback) -- */

export interface CompanyInfo {
  name: string;
  address: string;
  city_state_zip: string;
  email: string;
  phone?: string;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: "MHP Construction",
  address: "",
  city_state_zip: "",
  email: "info@mhpestimate.cloud",
};

/* -- Shared PDF document builder -- */

async function buildDoc(
  estimate: Estimate,
  lineItems: EstimateLineItem[],
  client: Client | null,
  company: CompanyInfo,
  changeOrders: EstimateChangeOrder[] = []
) {
  const { Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const s = createPDFStyles(StyleSheet);
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

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <PDFHeaderSection
          estimate={estimate}
          client={client}
          company={company}
          estimateDate={estimateDate}
          validThrough={validThrough}
          s={s}
          View={View}
          Text={Text}
        />

        <PDFLineItemsSection
          groups={groups}
          s={s}
          View={View}
          Text={Text}
        />

        <PDFSummarySection
          estimate={estimate}
          changeOrders={changeOrders}
          s={s}
          View={View}
          Text={Text}
        />

        <PDFTermsSection
          s={s}
          View={View}
          Text={Text}
        />
      </Page>
    </Document>
  );
}

/* -- Public API -- */

/** Download PDF via Electron save dialog or browser fallback. */
export async function generateEstimatePDF(
  estimate: Estimate,
  lineItems: EstimateLineItem[],
  client: Client | null,
  company?: CompanyInfo,
  changeOrders?: EstimateChangeOrder[]
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await buildDoc(estimate, lineItems, client, company ?? DEFAULT_COMPANY, changeOrders ?? []);
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Use Electron save dialog if available, otherwise browser download
  if (window.electronAPI?.saveFile) {
    await window.electronAPI.saveFile({
      data: uint8,
      filename: `${estimate.estimate_number}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${estimate.estimate_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/** Generate PDF as a base64 string for attaching to emails. */
export async function generateEstimatePDFBase64(
  estimate: Estimate,
  lineItems: EstimateLineItem[],
  client: Client | null,
  company?: CompanyInfo,
  changeOrders?: EstimateChangeOrder[]
): Promise<string> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await buildDoc(estimate, lineItems, client, company ?? DEFAULT_COMPANY, changeOrders ?? []);
  const blob = await pdf(doc).toBlob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the data:application/pdf;base64, prefix
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
