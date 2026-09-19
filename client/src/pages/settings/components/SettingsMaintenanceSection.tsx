import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DesktopLegacyDataImportCard from "@/components/layout/DesktopLegacyDataImportCard";
import DesktopUpdateCard from "@/components/layout/DesktopUpdateCard";
import { APP_RUNTIME } from "@/lib/constants";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export default function SettingsMaintenanceSection() {
  if (APP_RUNTIME !== "desktop") {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>System maintenance</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            Currently using the web version. Desktop updates and native legacy data import are only available in the desktop version.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>System maintenance</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            Check for desktop updates or import native legacy data; these operations will not affect the current authoring configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className={`text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          When there is no need for maintenance, you can directly return to the creation configuration above.
        </CardContent>
      </Card>
      <DesktopUpdateCard />
      <DesktopLegacyDataImportCard compact />
    </div>
  );
}
