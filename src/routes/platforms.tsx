import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Clock, Share2, Percent, Bookmark, Users, Radar, SquarePlay as PlaySquare, UserPlus, Facebook, Instagram, Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { RangeSelect, type RangeKey } from "@/components/dashboard/RangeSelect";
import {
  engagementRate,
  filterByRange,
  growthVelocity,
  sumMetric,
  useAnalytics,
} from "@/lib/analytics-store";

export const Route = createFileRoute("/platforms")({
  head: () => ({
    meta: [
      { title: "Insights · Pulse Analytics" },
      {
        name: "description",
        content:
          "Deep-dive into Facebook Reels, Instagram Reels and YouTube Shorts performance with dedicated metrics per platform.",
      },
    ],
  }),
  component: PlatformsPage,
});

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function PlatformsPage() {
  const { data } = useAnalytics();
  const [range, setRange] = useState<RangeKey>("30");
  const days = range === "all" ? "all" : (Number(range) as 7 | 30);

  const fbDaily = useMemo(() => filterByRange(data.facebook.daily, days), [data, days]);
  const igDaily = useMemo(() => filterByRange(data.instagram.daily, days), [data, days]);
  const ytDaily = useMemo(() => filterByRange(data.youtube.daily, days), [data, days]);

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            Insights
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Native metrics for each channel, side by side.
          </p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

      <Tabs defaultValue="facebook" className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="facebook" className="gap-2">
            <Facebook className="h-4 w-4 text-facebook" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2">
            <Instagram className="h-4 w-4 text-instagram" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-2">
            <Youtube className="h-4 w-4 text-youtube" />
            YouTube
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facebook" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="3-Second Views"
              value={fmt(sumMetric(fbDaily, "views"))}
              delta={growthVelocity(fbDaily)}
              icon={Eye}
              accent="facebook"
            />
            <MetricCard
              label="1-Minute Views"
              value={fmt(Math.round(sumMetric(fbDaily, "views") * 0.18))}
              delta={growthVelocity(fbDaily) * 0.7}
              icon={Clock}
              accent="facebook"
            />
            <MetricCard
              label="Shares"
              value={fmt(sumMetric(fbDaily, "sharesSaves"))}
              delta={0.184}
              icon={Share2}
              accent="facebook"
            />
          </div>
          <ChartsRow title="Facebook Reels — Daily Views" color="var(--facebook)" data={fbDaily} />
        </TabsContent>

        <TabsContent value="instagram" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Retention Rate"
              value={`${(data.instagram.metrics.retentionRate * 100).toFixed(1)}%`}
              delta={engagementRate(igDaily) - 0.06}
              icon={Percent}
              accent="instagram"
            />
            <MetricCard
              label="Saves"
              value={fmt(sumMetric(igDaily, "sharesSaves"))}
              delta={0.221}
              icon={Bookmark}
              accent="instagram"
            />
            <MetricCard
              label="Reach"
              value={fmt(sumMetric(igDaily, "views") * 1.4)}
              delta={growthVelocity(igDaily)}
              icon={Radar}
              accent="instagram"
            />
            <MetricCard
              label="Profile Visits"
              value={fmt(Math.round(sumMetric(igDaily, "views") * 0.06))}
              delta={0.092}
              icon={Users}
              accent="instagram"
            />
          </div>
          <ChartsRow title="Instagram Reels — Daily Views" color="var(--instagram)" data={igDaily} />
        </TabsContent>

        <TabsContent value="youtube" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Watch Time (Hours)"
              value={fmt(Math.round(sumMetric(ytDaily, "views") * 0.02))}
              delta={growthVelocity(ytDaily)}
              icon={PlaySquare}
              accent="youtube"
            />
            <MetricCard
              label="Subscribers Gained"
              value={fmt(Math.round(sumMetric(ytDaily, "views") * 0.008))}
              delta={0.312}
              icon={UserPlus}
              accent="youtube"
            />
            <MetricCard
              label="Avg. Percentage Viewed"
              value={`${(data.youtube.metrics.avgPercentageViewed * 100).toFixed(1)}%`}
              delta={engagementRate(ytDaily) - 0.055}
              icon={Percent}
              accent="youtube"
            />
          </div>
          <ChartsRow title="YouTube Shorts — Daily Views" color="var(--youtube)" data={ytDaily} />
        </TabsContent>
      </Tabs>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniTotals
          label="Facebook Total Views"
          value={sumMetric(fbDaily, "views")}
          icon={<Facebook className="h-4 w-4 text-facebook" />}
        />
        <MiniTotals
          label="Instagram Total Views"
          value={sumMetric(igDaily, "views")}
          icon={<Instagram className="h-4 w-4 text-instagram" />}
        />
        <MiniTotals
          label="YouTube Total Views"
          value={sumMetric(ytDaily, "views")}
          icon={<Youtube className="h-4 w-4 text-youtube" />}
        />
      </section>
    </div>
  );
}

function ChartsRow({
  title,
  color,
  data,
}: {
  title: string;
  color: string;
  data: React.ComponentProps<typeof TrendChart>["data"];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title} — Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={data} color={color} type="area" />
        </CardContent>
      </Card>
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title} — Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={data} color={color} type="bar" />
        </CardContent>
      </Card>
    </div>
  );
}

function MiniTotals({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-xl font-semibold tabular-nums">{fmt(value)}</div>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-background/50">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
