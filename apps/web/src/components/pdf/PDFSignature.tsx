/**
 * PDF Signature / Acceptance block section.
 * These are React-PDF components -- they must be rendered inside a @react-pdf/renderer <Page>.
 */
import { NAVY, GRAY_BG, GRAY_BORDER, GRAY_TEXT, BLACK } from "./pdfStyles";

interface PDFSignatureProps {
  companyName: string;
  s: any; // StyleSheet styles
  View: any;
  Text: any;
}

export function PDFSignatureSection({ companyName, s, View, Text }: PDFSignatureProps) {
  const signatureLineStyle = {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    marginTop: 28,
    marginBottom: 4,
    width: "100%",
  };

  const signatureLabelStyle = {
    fontSize: 8,
    color: GRAY_TEXT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  };

  return (
    <View wrap={false} style={{ marginTop: 30 }}>
      {/* Authorization text */}
      <View
        style={{
          backgroundColor: GRAY_BG,
          borderWidth: 1,
          borderColor: GRAY_BORDER,
          borderRadius: 4,
          padding: 14,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontFamily: "Helvetica-Bold",
            color: NAVY,
            marginBottom: 8,
          }}
        >
          AUTHORIZATION TO PROCEED
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: BLACK,
            lineHeight: 1.6,
          }}
        >
          By signing below, you authorize {companyName} to proceed with the work described in this
          proposal. This signed document constitutes a binding agreement between both parties subject
          to the terms and conditions outlined herein. Any changes to the scope of work will be
          documented via a written change order and require mutual approval before implementation.
        </Text>
      </View>

      {/* Two-column signature area */}
      <View style={{ flexDirection: "row", gap: 30 }}>
        {/* Client signature */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontFamily: "Helvetica-Bold",
              color: NAVY,
              marginBottom: 4,
            }}
          >
            CLIENT
          </Text>

          <View style={signatureLineStyle} />
          <Text style={signatureLabelStyle}>Signature</Text>

          <View style={signatureLineStyle} />
          <Text style={signatureLabelStyle}>Printed Name</Text>

          <View style={signatureLineStyle} />
          <Text style={signatureLabelStyle}>Date</Text>
        </View>

        {/* Contractor signature */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontFamily: "Helvetica-Bold",
              color: NAVY,
              marginBottom: 4,
            }}
          >
            CONTRACTOR
          </Text>

          <View style={signatureLineStyle} />
          <Text style={signatureLabelStyle}>Signature</Text>

          <View style={signatureLineStyle} />
          <Text style={signatureLabelStyle}>Printed Name</Text>

          <View style={signatureLineStyle} />
          <Text style={signatureLabelStyle}>Date</Text>
        </View>
      </View>
    </View>
  );
}
