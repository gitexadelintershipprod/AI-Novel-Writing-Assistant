import SettingsMaintenanceSection from "../components/SettingsMaintenanceSection";
import { SettingsShell } from "../components/SettingsShell";

export default function MaintenanceSettingsPage() {
  return (
    <SettingsShell title="Desktop and Maintenance" description="View updates, imports, and maintenance related to your current environment.">
      <SettingsMaintenanceSection />
    </SettingsShell>
  );
}
