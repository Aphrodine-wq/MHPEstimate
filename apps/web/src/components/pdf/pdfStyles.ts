import type { EstimateLineItem } from "@proestimate/shared/types";

/* Color palette */
export const NAVY = "#1e3a5f";
export const NAVY_LIGHT = "#2c5282";
export const GRAY_BG = "#f7f8fa";
export const GRAY_BORDER = "#d0d5dd";
export const GRAY_TEXT = "#667085";
export const BLACK = "#1a1a1a";
export const WHITE = "#ffffff";

/* Helpers */
export function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const TIER_LABELS: Record<string, string> = {
  budget: "Budget",
  midrange: "Midrange",
  high_end: "High End",
  good: "Budget",
  better: "Midrange",
  best: "High End",
};

export const CATEGORY_LABELS: Record<string, string> = {
  material: "Materials",
  labor: "Labor",
  subcontractor: "Subcontractors",
  equipment: "Equipment",
  other: "Other",
};

export const CATEGORY_ORDER = ["material", "labor", "subcontractor", "equipment", "other"];

export interface GroupedLines {
  category: string;
  label: string;
  items: EstimateLineItem[];
  subtotal: number;
}

export function groupLineItems(lineItems: EstimateLineItem[]): GroupedLines[] {
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

/**
 * Creates the stylesheet for the PDF document.
 * Must be called inside the async buildDoc function after importing @react-pdf/renderer.
 */
export function createPDFStyles(StyleSheet: { create: (styles: Record<string, any>) => any }) {
  return StyleSheet.create({
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
    coTableHeader: {
      flexDirection: "row",
      backgroundColor: NAVY_LIGHT,
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    coRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: GRAY_BORDER,
    },
    coRowAlt: {
      backgroundColor: GRAY_BG,
    },
    coColNum: { width: "10%" },
    coColDesc: { width: "50%" },
    coColTimeline: { width: "20%" },
    coColCost: { width: "20%", textAlign: "right" },
    coTotalRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      backgroundColor: "#edf2f7",
      borderTopWidth: 1,
      borderTopColor: GRAY_BORDER,
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
}
