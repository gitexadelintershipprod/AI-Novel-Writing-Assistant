import { useState } from "react";
import AutoDirectorSettingsSection from "../AutoDirectorSettingsSection";
import SettingsActionResult from "../SettingsActionResult";
import { SettingsShell } from "../components/SettingsShell";

export default function DirectorSettingsPage() {
  const [message, setMessage] = useState("");
  return (
    <SettingsShell title="Auto-Director" description="Set up problem handling, automatic confirmation and creation reminders; after each book is started, it will retain its own execution rules according to the settings at that time.">
      <AutoDirectorSettingsSection onActionResult={setMessage} collapseAdvanced />
      <SettingsActionResult message={message} />
    </SettingsShell>
  );
}
