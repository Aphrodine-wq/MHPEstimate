/**
 * PDF Header section: company info + estimate title.
 * These are React-PDF components -- they must be rendered inside a @react-pdf/renderer <Page>.
 */
import type { Estimate, Client } from "@proestimate/shared/types";
import { TIER_LABELS } from "./pdfStyles";

interface PDFHeaderProps {
  estimate: Estimate;
  client: Client | null;
  company: { name: string; address: string; city_state_zip: string; email: string; phone?: string };
  estimateDate: string;
  validThrough: string | null;
  s: any; // StyleSheet styles
  View: any;
  Text: any;
}

export function PDFHeaderSection({ estimate, client, company, estimateDate, validThrough, s, View, Text }: PDFHeaderProps) {
  return (
    <>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.companyName}>{company.name}</Text>
          {company.address ? <Text style={s.companyDetail}>{company.address}</Text> : null}
          {company.city_state_zip ? <Text style={s.companyDetail}>{company.city_state_zip}</Text> : null}
          <Text style={s.companyDetail}>{company.email}</Text>
          {company.phone ? <Text style={s.companyDetail}>{company.phone}</Text> : null}
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
    </>
  );
}
