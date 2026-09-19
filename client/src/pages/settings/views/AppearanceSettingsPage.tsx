import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsShell } from "../components/SettingsShell";
import { useTheme } from "@/components/theme/ThemeProvider";

const palettes = [
  { value: "ink", label: "Inkstone", description: "The restrained blue-gray color is suitable for daily creation." },
  { value: "paper", label: "warm paper", description: "Soft off-white, suitable for reading and chapter editing." },
  { value: "night", label: "Night flight", description: "Dark indigo and turquoise, suitable for AI execution and log viewing." },
] as const;

export default function AppearanceSettingsPage() {
  const { mode, palette, density, setMode, setPalette, setDensity, reset } = useTheme();
  return (
    <SettingsShell title="Appearance and themes" description="Choose interface colors and display density that suit long hours of creation.">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" />Interface appearance</CardTitle>
          <CardDescription>The theme is only saved on the current device and will not affect the novel content and task status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="block space-y-2 text-sm font-medium">
            <span>display mode</span>
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Follow the system</SelectItem>
                <SelectItem value="light">light color</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>theme style</span>
            <Select value={palette} onValueChange={(value) => setPalette(value as typeof palette)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {palettes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label} · {item.description}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Interface density</span>
            <Select value={density} onValueChange={(value) => setDensity(value as typeof density)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Restore default theme</Button>
          </div>
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
