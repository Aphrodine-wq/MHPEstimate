import { EditableRow, Group } from "./shared";

export function CompanySettings({ settings }: { settings: Record<string, unknown> }) {
  return (
    <>
      <Group title="Business Info">
        <EditableRow label="Company Name" settingKey="company_name" settings={settings} defaultValue="MS Home Pros" />
        <EditableRow label="License Number" settingKey="license_number" settings={settings} />
        <EditableRow label="Phone" settingKey="company_phone" settings={settings} />
        <EditableRow label="Email" settingKey="company_email" settings={settings} />
        <EditableRow label="Address" settingKey="company_address" settings={settings} />
      </Group>
      <Group title="Default Rates">
        <EditableRow label="Default Tax Rate %" settingKey="default_tax_rate" settings={settings} defaultValue={8.25} type="number" />
        <EditableRow label="Default Markup %" settingKey="default_markup" settings={settings} defaultValue={17.5} type="number" />
        <EditableRow label="Default Contingency %" settingKey="default_contingency" settings={settings} defaultValue={15} type="number" />
      </Group>
    </>
  );
}
