import { getContractNumberSettings } from "@/lib/queries";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const contractSeq = await getContractNumberSettings();
  return <SettingsView contractSeq={contractSeq} />;
}
