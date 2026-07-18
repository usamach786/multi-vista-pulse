import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: number; // fractional, e.g. 0.12
  icon?: LucideIcon;
  accent?: "primary" | "facebook" | "instagram" | "youtube" | "neutral";
  hint?: string;
}

const accentMap = {
  primary: "from-primary/20 to-primary/0 text-primary",
  facebook: "from-facebook/20 to-facebook/0 text-facebook",
  instagram: "from-instagram/20 to-instagram/0 text-instagram",
  youtube: "from-youtube/25 to-youtube/0 text-youtube",
  neutral: "from-muted/50 to-transparent text-foreground",
} as const;

export function MetricCard({ label, value, delta, icon: Icon, accent = "primary", hint }: MetricCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60", accentMap[accent])} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 truncate text-2xl font-semibold tabular-nums text-foreground">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          {Icon && (
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-background/50", accentMap[accent])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {delta !== undefined && (
          <div className="mt-4">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                positive
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {(delta * 100).toFixed(1)}%
              <span className="text-muted-foreground font-normal">vs prior period</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
