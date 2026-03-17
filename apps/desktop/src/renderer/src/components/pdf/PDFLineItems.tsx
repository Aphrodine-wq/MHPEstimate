/**
 * PDF Line Items section: grouped by category with subtotals.
 * These are React-PDF components -- they must be rendered inside a @react-pdf/renderer <Page>.
 */
import { fmt, type GroupedLines } from "./pdfStyles";

interface PDFLineItemsProps {
  groups: GroupedLines[];
  s: any; // StyleSheet styles
  View: any;
  Text: any;
}

export function PDFLineItemsSection({ groups, s, View, Text }: PDFLineItemsProps) {
  return (
    <>
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
    </>
  );
}
