import { ToggleRowWithDesc, Group } from "./shared";

export function NotificationSettings({ settings }: { settings: Record<string, unknown> }) {
  return (
    <>
      <Group title="Estimate Notifications">
        <ToggleRowWithDesc
          label="Estimate Accepted"
          description="Get notified when a client accepts and signs an estimate via the portal"
          settingKey="notify_estimate_accepted"
          settings={settings}
          defaultValue={true}
        />
        <ToggleRowWithDesc
          label="Estimate Viewed"
          description="Get notified when a client opens the estimate portal link"
          settingKey="notify_estimate_viewed"
          settings={settings}
          defaultValue={false}
        />
        <ToggleRowWithDesc
          label="Estimate Expiring"
          description="Reminder when an estimate is within 7 days of its valid-through date"
          settingKey="notify_estimate_expiring"
          settings={settings}
          defaultValue={true}
        />
      </Group>
      <Group title="Change Order Notifications">
        <ToggleRowWithDesc
          label="Change Order Submitted"
          description="Get notified when a new change order is created on an approved estimate"
          settingKey="notify_change_order_submitted"
          settings={settings}
          defaultValue={true}
        />
        <ToggleRowWithDesc
          label="Change Order Signed"
          description="Get notified when a client marks a change order as signed"
          settingKey="notify_change_order_signed"
          settings={settings}
          defaultValue={true}
        />
      </Group>
      <Group title="Financial Notifications">
        <ToggleRowWithDesc
          label="Payment Received"
          description="Get notified when a payment is logged against an estimate"
          settingKey="notify_payment_received"
          settings={settings}
          defaultValue={true}
        />
        <ToggleRowWithDesc
          label="Invoice Processed"
          description="Get notified when a supplier invoice is confirmed in the system"
          settingKey="notify_invoice_processed"
          settings={settings}
          defaultValue={true}
        />
        <ToggleRowWithDesc
          label="Price Alerts"
          description="Get alerted when material prices change significantly vs. your last estimate"
          settingKey="notify_price_alerts"
          settings={settings}
          defaultValue={true}
        />
      </Group>
      <Group title="Digest">
        <ToggleRowWithDesc
          label="Daily Summary Email"
          description="Receive a daily digest email summarizing new estimates, invoices, and activity"
          settingKey="notify_daily_summary"
          settings={settings}
          defaultValue={false}
        />
      </Group>
    </>
  );
}
