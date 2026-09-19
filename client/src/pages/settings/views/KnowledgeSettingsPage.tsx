import { useQuery } from "@tanstack/react-query";
import { Database, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { getRagSettings } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StyleEngineRuntimeSettingsCard from "../components/StyleEngineRuntimeSettingsCard";
import { SettingsShell } from "../components/SettingsShell";

export default function KnowledgeSettingsPage() {
  const ragQuery = useQuery({ queryKey: queryKeys.settings.rag, queryFn: getRagSettings });
  const rag = ragQuery.data?.data;
  return (
    <SettingsShell title="Knowledge base and writing methods" description="These enhancements will help AI understand your information and writing methods, without affecting your ability to start creating in the first place.">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Knowledge base search</CardTitle>
          <CardDescription>
            {ragQuery.isLoading ? "Reading retrieval status..." : rag?.enabled ? `Data retrieval is enabled and currently used ${rag.embeddingModel || "Default vector model"}.` : "Data retrieval is not enabled, but book opening and chapter production can still proceed normally."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Vector models, database addresses, indexing and recall parameters are all maintained on the same search configuration page.</p>
          <Button asChild variant="outline"><Link to="/knowledge?tab=settings">Configuration retrieval<ExternalLink className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
      <StyleEngineRuntimeSettingsCard />
    </SettingsShell>
  );
}
