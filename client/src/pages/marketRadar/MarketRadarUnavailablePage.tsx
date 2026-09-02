import { Radar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MarketRadarUnavailablePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Radar className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Market Radar is temporarily unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Start with your own idea while we prepare sources that better fit Georgian and international readers.
        </p>
      </div>
      <Button asChild>
        <Link to="/novels/auto-director">Start with Auto Director</Link>
      </Button>
    </div>
  );
}
