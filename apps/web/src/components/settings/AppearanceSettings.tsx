import { EditableRow, SegmentedRow, Group } from "./shared";

/** Estimates / pricing defaults tab -- effectively the "appearance" of generated estimates. */
export function AppearanceSettings({ settings }: { settings: Record<string, unknown> }) {
  return (
    <>
      <Group title="Pricing">
        <SegmentedRow
          label="Default Pricing Tier"
          settingKey="default_tier"
          settings={settings}
          options={["budget", "midrange", "high_end"]}
          labels={{ budget: "Budget", midrange: "Midrange", high_end: "High End" }}
          defaultValue="midrange"
        />
        <EditableRow label="Estimate Validity Days" settingKey="valid_for_days" settings={settings} defaultValue={30} type="number" />
        <EditableRow label="Target Gross Margin %" settingKey="target_margin" settings={settings} defaultValue="35-42" />
      </Group>
      <Group title="Uploaded Documents">
        <EditableRow label="Payment Terms" settingKey="payment_terms" settings={settings} multiline />
        <EditableRow label="Warranty Text" settingKey="warranty_text" settings={settings} multiline />
        <EditableRow label="Default Scope Inclusions" settingKey="scope_inclusions_template" settings={settings} multiline />
        <EditableRow label="Default Scope Exclusions" settingKey="scope_exclusions_template" settings={settings} multiline />
      </Group>
    </>
  );
}
