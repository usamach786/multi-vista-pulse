import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, TrendingUp, Activity, Facebook, Instagram, Youtube, Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RangeSelect, type RangeKey } from "@/components/dashboard/RangeSelect";
import { LiveBadge } from "@/components/dashboard/LiveBadge";
import { MainChart, type ChartSeries } from "@/components/dashboard/MainChart";
import {
  engagementRate,
  filterByRange,
  growthVelocity,
  mergeDaily,
  platformSummary,
  sumMetric,
  useAnalytics,
  type MetricKey,
  type Platform,
  type PlatformData,
  type DailyPoint,
} from "@/lib/analytics-store";
import {
  exportReport,
  PLATFORM_FILTER_LABELS,
  type PlatformFilter,
} from "@/lib/export";

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

const METRIC_ITEMS: { value: MetricKey; label: string }[] = [
  { value: "views", label: "Views" },
  { value: "engagement", label: "Engagement (Likes/Comments)" },
  { value: "sharesSaves", label: "Shares/Saves" },
];

function seriesForFilter(data: PlatformData, filter: PlatformFilter, days: 7 | 30 | "all") {
  const fb = filterByRange(data.facebook.daily, days);
  const ig = filterByRange(data.instagram.daily, days);
  const yt = filterByRange(data.youtube.daily, days);
  if (filter === "all") return { fb, ig, yt, all: mergeDaily([fb, ig, yt]) };
  if (filter === "facebook") return { fb, ig: [], yt: [], all: fb };
  if (filter === "instagram") return { fb: [], ig, yt: [], all: ig };
  return { fb: [], ig: [], yt, all: yt };
}

function OverviewPage() {
  const { data } = useAnalytics();
  const [range, setRange] = useState<RangeKey>("30");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [metric, setMetric] = useState<MetricKey>("views");
  const days = range === "all" ? "all" : (Number(range) as 7 | 30);

  const filtered = useMemo(
    () => seriesForFilter(data, platformFilter, days),
    [data, platformFilter, days],
  );

  const totalViews = sumMetric(filtered.all, "views");
  const totalEngagement = sumMetric(filtered.all, "engagement");
  const totalSharesSaves = sumMetric(filtered.all, "sharesSaves");
  const velocity = growthVelocity(filtered.all);
  const engRate = engagementRate(filtered.all);

  const chartSeries: ChartSeries[] = [];
  if (platformFilter === "all" || platformFilter === "facebook")
    chartSeries.push({ platform: "facebook", data: filtered.fb, color: "var(--facebook)" });
  if (platformFilter === "all" || platformFilter === "instagram")
    chartSeries.push({ platform: "instagram", data: filtered.ig, color: "var(--instagram)" });
  if (platformFilter === "all" || platformFilter === "youtube")
    chartSeries.push({ platform: "youtube", data: filtered.yt, color: "var(--youtube)" });

  const metricValue = (p: Platform) => {
    const daily = p === "facebook" ? filtered.fb : p === "instagram" ? filtered.ig : filtered.yt;
    return sumMetric(daily, metric);
  };

  const handleExport = () => {
    const seriesByPlatform: Record<Platform, DailyPoint[]> = {
      facebook: filtered.fb,
      instagram: filtered.ig,
      youtube: filtered.yt,
    };
    const { fileName, rows } = exportReport(seriesByPlatform, { platform: platformFilter, metric });
    if (rows === 0) {
      toast.error("No data to export for the current selection");
      return;
    }
    toast.success(`Exported ${rows} rows`, { description: fileName });
  };

  const subtitle =
    platformFilter === "all"
      ? "Facebook + Instagram + YouTube"
      : `${PLATFORM_FILTER_LABELS[platformFilter]} · last ${days === "all" ? "all" : days} days`;

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h1>
            <LiveBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

      <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PLATFORM_FILTER_LABELS) as PlatformFilter[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {PLATFORM_FILTER_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <SelectTrigger className="w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_ITEMS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total Combined Views"
          value={formatNumber(totalViews)}
          delta={velocity}
          icon={Eye}
          accent="primary"
          hint={platformFilter === "all" ? "Facebook + Instagram + YouTube" : PLATFORM_FILTER_LABELS[platformFilter]}
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
          label="Engagement Rate"
          value={`${(engRate * 100).toFixed(2)}%`}
          delta={engRate - 0.05}
          icon={Activity}
          accent="youtube"
          hint="Engagement / views in range"
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">
                {metric === "views"
                  ? "Daily Views"
                  : metric === "engagement"
                    ? "Daily Engagement"
                    : "Daily Shares/Saves"}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {platformFilter === "all" ? "All platforms" : PLATFORM_FILTER_LABELS[platformFilter]}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <MainChart series={chartSeries} metric={metric} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Per-Platform Volume</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {metric === "views" ? "Views" : metric === "engagement" ? "Engagement" : "Shares/Saves"} in range
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <PlatformRow
              icon={<Facebook className="h-4 w-4 text-facebook" />}
              label="Facebook"
              value={metricValue("facebook")}
              total={metric === "views" ? totalViews : metric === "engagement" ? totalEngagement : totalSharesSaves}
              barClass="bg-facebook"
            />
            <PlatformRow
              icon={<Instagram className="h-4 w-4 text-instagram" />}
              label="Instagram"
              value={metricValue("instagram")}
              total={metric === "views" ? totalViews : metric === "engagement" ? totalEngagement : totalSharesSaves}
              barClass="bg-instagram"
            />
            <PlatformRow
              icon={<Youtube className="h-4 w-4 text-youtube" />}
              label="YouTube"
              value={metricValue("youtube")}
              total={metric === "views" ? totalViews : metric === "engagement" ? totalEngagement : totalSharesSaves}
              barClass="bg-youtube"
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniChartCard title="Facebook Reels" color="var(--facebook)" data={filtered.fb} />
        <MiniChartCard title="Instagram Reels" color="var(--instagram)" data={filtered.ig} />
        <MiniChartCard title="YouTube Shorts" color="var(--youtube)" data={filtered.yt} />
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
        {data.length ? (
          <TrendChart data={data} color={color} type="bar" />
        ) : (
          <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">
            Hidden by platform filter
          </div>
        )}
      </CardContent>
    </Card>
  );
}
