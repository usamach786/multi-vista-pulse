import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, TrendingUp, Activity, Facebook, Instagram, Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RangeSelect, type RangeKey } from "@/components/dashboard/RangeSelect";
import {
  avgEngagement,
  filterByRange,
  growthVelocity,
  sumViews,
  useAnalytics,
  type DailyPoint,
} from "@/lib/analytics-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Pulse Analytics" },
      {
        name: "description",
        content:
          "Aggregate views, engagement and growth velocity across Facebook, Instagram and YouTube in one glance.",
      },
    ],
  }),
  component: OverviewPage,
});

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function mergeDaily(series: DailyPoint[][]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const s of series) {
    for (const p of s) {
      const existing = map.get(p.date);
      if (existing) {
        existing.views += p.views;
        existing.engagement = (existing.engagement + p.engagement) / 2;
      } else {
        map.set(p.date, { ...p });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function OverviewPage() {
  const { data } = useAnalytics();
  const [range, setRange] = useState<RangeKey>("30");
  const days = range === "all" ? "all" : Number(range) as 7 | 30;

  const combined = useMemo(() => {
    const fb = filterByRange(data.facebook.daily, days);
    const ig = filterByRange(data.instagram.daily, days);
    const yt = filterByRange(data.youtube.daily, days);
    return { fb, ig, yt, all: mergeDaily([fb, ig, yt]) };
  }, [data, days]);

  const totalViews = sumViews(combined.all);
  const velocity = growthVelocity(combined.all);
  const engagement = avgEngagement(combined.all);

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregate performance across all your connected channels.
          </p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total Combined Views"
          value={formatNumber(totalViews)}
          delta={velocity}
          icon={Eye}
          accent="primary"
          hint="Facebook + Instagram + YouTube"
        />
        <MetricCard
          label="Growth Velocity"
          value={`${(velocity * 100).toFixed(1)}%`}
          delta={velocity}
          icon={TrendingUp}
          accent="instagram"
          hint="Second half vs first half of range"
        />
        <MetricCard
          label="Overall Engagement Rate"
          value={`${(engagement * 100).toFixed(2)}%`}
          delta={engagement - 0.05}
          icon={Activity}
          accent="youtube"
          hint="Weighted across platforms"
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Combined Daily Views</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">All platforms merged</p>
            </div>
          </CardHeader>
          <CardContent>
            <TrendChart data={combined.all} color="oklch(0.62 0.19 256)" />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per-Platform Volume</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Total views in range</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <PlatformRow
              icon={<Facebook className="h-4 w-4 text-facebook" />}
              label="Facebook"
              value={sumViews(combined.fb)}
              total={totalViews}
              barClass="bg-facebook"
            />
            <PlatformRow
              icon={<Instagram className="h-4 w-4 text-instagram" />}
              label="Instagram"
              value={sumViews(combined.ig)}
              total={totalViews}
              barClass="bg-instagram"
            />
            <PlatformRow
              icon={<Youtube className="h-4 w-4 text-youtube" />}
              label="YouTube"
              value={sumViews(combined.yt)}
              total={totalViews}
              barClass="bg-youtube"
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniChartCard title="Facebook Reels" color="var(--facebook)" data={combined.fb} />
        <MiniChartCard title="Instagram Reels" color="var(--instagram)" data={combined.ig} />
        <MiniChartCard title="YouTube Shorts" color="var(--youtube)" data={combined.yt} />
      </section>
    </div>
  );
}

function PlatformRow({
  icon,
  label,
  value,
  total,
  barClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="tabular-nums text-muted-foreground">{formatNumber(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniChartCard({ title, color, data }: { title: string; color: string; data: DailyPoint[] }) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <TrendChart data={data} color={color} type="bar" />
      </CardContent>
    </Card>
  );
}
