import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HomeAttentionItem } from "../homeViewModel";
import { toneBorderClass, toneTextClass } from "./homeTone";

export function HomeAttentionQueue(props: { items: HomeAttentionItem[]; hasNovels: boolean }) {
  return (
    <Card className="home-attention-queue border-0 bg-muted/35 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base tracking-normal"><ListChecks className="h-4 w-4 text-info" aria-hidden="true" />creative reminder</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {props.items.length === 0 ? (
          <div className="flex items-start gap-3 py-1">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" aria-hidden="true" />
            <div><div className="text-sm font-medium text-success">{props.hasNovels ? "Good creative rhythm" : "No pending creations yet"}</div><p className="mt-1 text-sm leading-6 text-success/90">{props.hasNovels ? "Follow the recommendation above to keep the novel moving." : "After you start your first novel, items that need your confirmation will show up here."}</p></div>
          </div>
        ) : props.items.map((item) => (
          <div key={item.id} className={cn("rounded-lg border bg-background/75 p-3", toneBorderClass(item.tone))}>
            <div className="flex items-start gap-3"><AlertTriangle className={cn("mt-0.5 h-4 w-4", toneTextClass(item.tone))} aria-hidden="true" /><div className="min-w-0 flex-1"><div className="text-sm font-medium">{item.title}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p></div>{item.to && item.actionLabel ? <Button asChild size="sm" variant="outline" className="shrink-0"><Link to={item.to}>{item.actionLabel}</Link></Button> : null}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
