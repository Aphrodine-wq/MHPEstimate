/**
 * PDF Financial Summary + Change Orders section.
 * These are React-PDF components -- they must be rendered inside a @react-pdf/renderer <Page>.
 */
import type { Estimate, EstimateChangeOrder } from "@proestimate/shared/types";
import { fmt } from "./pdfStyles";

interface PDFSummaryProps {
  estimate: Estimate;
  changeOrders: EstimateChangeOrder[];
  s: any; // StyleSheet styles
  View: any;
  Text: any;
}

export function PDFSummarySection({ estimate, changeOrders, s, View, Text }: PDFSummaryProps) {
  return (
    <>
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

      {/* Change Orders */}
      {changeOrders.length > 0 && (
        <View wrap={false}>
          <Text style={s.sectionHeading}>Approved Change Orders</Text>

          <View style={s.coTableHeader}>
            <Text style={[s.tableHeaderText, s.coColNum]}>#</Text>
            <Text style={[s.tableHeaderText, s.coColDesc]}>Description</Text>
            <Text style={[s.tableHeaderText, s.coColTimeline]}>Timeline</Text>
            <Text style={[s.tableHeaderText, s.coColCost]}>Cost Impact</Text>
          </View>

          {changeOrders.map((co, idx) => (
            <View key={co.id ?? idx} style={[s.coRow, idx % 2 === 1 ? s.coRowAlt : {}]}>
              <Text style={[s.tableCell, s.coColNum]}>CO #{co.change_number}</Text>
              <Text style={[s.tableCell, s.coColDesc]}>{co.description}</Text>
              <Text style={[s.tableCell, s.coColTimeline]}>{co.timeline_impact ?? "\u2014"}</Text>
              <Text style={[s.tableCellRight, s.coColCost]}>
                {co.cost_impact >= 0 ? "+" : ""}${fmt(Math.abs(Number(co.cost_impact)))}
              </Text>
            </View>
          ))}

          {/* Change orders subtotal */}
          <View style={s.coTotalRow}>
            <Text style={[s.subtotalLabel, { width: "80%" }]}>Total Change Order Impact</Text>
            <Text style={[s.subtotalValue, { width: "20%", textAlign: "right" }]}>
              {changeOrders.reduce((sum, co) => sum + Number(co.cost_impact), 0) >= 0 ? "+" : ""}
              ${fmt(Math.abs(changeOrders.reduce((sum, co) => sum + Number(co.cost_impact), 0)))}
            </Text>
          </View>

          {/* Adjusted grand total */}
          <View style={[s.grandTotalRow, { marginTop: 4 }]}>
            <Text style={s.grandTotalLabel}>ADJUSTED GRAND TOTAL</Text>
            <Text style={s.grandTotalValue}>
              ${fmt(Number(estimate.grand_total))}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
