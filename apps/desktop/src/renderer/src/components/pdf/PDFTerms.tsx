/**
 * PDF Footer / Terms & Conditions section.
 * These are React-PDF components -- they must be rendered inside a @react-pdf/renderer <Page>.
 */

interface PDFTermsProps {
  s: any; // StyleSheet styles
  View: any;
  Text: any;
}

export function PDFTermsSection({ s, View, Text }: PDFTermsProps) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        This estimate is valid for 30 days from the date of issue unless otherwise specified.
        Prices are subject to change based on material availability and site conditions.
        A signed acceptance of this estimate constitutes authorization to proceed with the work described above.
      </Text>
      <Text
        style={s.pageNumber}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}
