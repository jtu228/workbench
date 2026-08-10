import { getContractNumberSettings, getLeaveSettings } from "@/lib/queries";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const [contractSeq, leaveSettings] = await Promise.all([
    getContractNumberSettings(),
    getLeaveSettings(),
  ]);
  return <SettingsView contractSeq={contractSeq} leaveSettings={leaveSettings} />;
}
