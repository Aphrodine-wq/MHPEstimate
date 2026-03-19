/**
 * PDF Payment Schedule section: deposit, progress payments, and final payment.
 * These are React-PDF components -- they must be rendered inside a @react-pdf/renderer <Page>.
 */
import { fmt, NAVY, NAVY_LIGHT, WHITE, GRAY_BG, GRAY_BORDER, GRAY_TEXT, BLACK } from "./pdfStyles";

interface PaymentMilestone {
  label: string;
  percent: number;
  amount: number;
  description: string;
}

interface PDFPaymentScheduleProps {
  grandTotal: number;
  depositPercent: number;
  s: any;
  View: any;
  Text: any;
}

function buildPaymentMilestones(grandTotal: number, depositPercent: number): PaymentMilestone[] {
  const deposit = grandTotal * depositPercent;
  const remaining = grandTotal - deposit;
  if (depositPercent >= 0.5) {
    return [
      { label: "Deposit", percent: depositPercent * 100, amount: deposit, description: "Due upon signed acceptance of this proposal" },
      { label: "Final Payment", percent: (1 - depositPercent) * 100, amount: remaining, description: "Due upon project completion and final walkthrough" },
    ];
  }
  const progressPercent = (1 - depositPercent) / 2;
  const progressAmount = grandTotal * progressPercent;
  const finalAmount = grandTotal - deposit - progressAmount;
  return [
    { label: "Deposit", percent: depositPercent * 100, amount: deposit, description: "Due upon signed acceptance of this proposal" },
    { label: "Progress Payment", percent: Math.round(progressPercent * 100), amount: progressAmount, description: "Due at project midpoint / rough-in completion" },
    { label: "Final Payment", percent: Math.round((finalAmount / grandTotal) * 100), amount: finalAmount, description: "Due upon project completion and final walkthrough" },
  ];
}

export function PDFPaymentScheduleSection({ grandTotal, depositPercent, s, View, Text }: PDFPaymentScheduleProps) {
  const milestones = buildPaymentMilestones(grandTotal, depositPercent);
  return (
    <View wrap={false}>
      <Text style={s.sectionHeading}>Payment Schedule</Text>
      <View style={{ flexDirection: "row", backgroundColor: NAVY_LIGHT, paddingVertical: 5, paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "25%" }}>Milestone</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "15%", textAlign: "right" as const }}>Percent</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "20%", textAlign: "right" as const }}>Amount</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE, textTransform: "uppercase" as const, letterSpacing: 0.4, width: "40%", paddingLeft: 8 }}>When Due</Text>
      </View>
      {milestones.map((m, idx) => (
        <View key={idx} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: GRAY_BORDER, backgroundColor: idx % 2 === 1 ? GRAY_BG : WHITE }}>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, width: "25%" }}>{m.label}</Text>
          <Text style={{ fontSize: 9, color: BLACK, width: "15%", textAlign: "right" as const }}>{Math.round(m.percent)}%</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, width: "20%", textAlign: "right" as const }}>${fmt(m.amount)}</Text>
          <Text style={{ fontSize: 9, color: GRAY_TEXT, width: "40%", paddingLeft: 8 }}>{m.description}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: NAVY }}>
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, width: "40%" }}>TOTAL</Text>
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE, width: "20%", textAlign: "right" as const }}>${fmt(grandTotal)}</Text>
        <Text style={{ fontSize: 9, color: WHITE, width: "40%", paddingLeft: 8 }}> </Text>
      </View>
    </View>
  );
}
