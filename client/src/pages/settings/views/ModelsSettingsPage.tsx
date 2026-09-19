import ModelRoutesPage from "../ModelRoutesPage";
import SettingsPage from "../SettingsPage";
import { SettingsShell } from "../components/SettingsShell";

export default function ModelsSettingsPage() {
  return (
    <SettingsShell title="Models and manufacturers" description="Manage available models, task routing, and structured output alternate models.">
      <SettingsPage />
      <ModelRoutesPage />
    </SettingsShell>
  );
}
