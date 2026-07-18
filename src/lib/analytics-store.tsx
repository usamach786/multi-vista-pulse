import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Platform = "facebook" | "instagram" | "youtube";
export type MetricKey = "views" | "engagement" | "sharesSaves";

export interface DailyPoint {
  date: string; // ISO yyyy-mm-dd
  views: number;
  engagement: number; // likes + comments
  sharesSaves: number; // shares (FB/YT) + saves (IG)
}

export interface FacebookMetrics {
  threeSecondViews: number;
  oneMinuteViews: number;
  shares: number;
}
export interface InstagramMetrics {
  retentionRate: number; // 0-1
  saves: number;
  reach: number;
  profileVisits: number;
}
export interface YoutubeMetrics {
  watchTimeHours: number;
  subscribersGained: number;
  avgPercentageViewed: number; // 0-1
}

export interface PlatformData {
  facebook: { label: string; accent: string; metrics: FacebookMetrics; daily: DailyPoint[] };
  instagram: { label: string; accent: string; metrics: InstagramMetrics; daily: DailyPoint[] };
  youtube: { label: string; accent: string; metrics: YoutubeMetrics; daily: DailyPoint[] };
}

export interface ImportRecord {
  id: string;
  fileName: string;
  platform: Platform;
  rows: number;
  importedAt: string;
}

function isoDaysAgo(i: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - i);
  return d.toISOString().slice(0, 10);
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

interface SeriesSpec {
  baseline: number;
  spike: number;
  engagementRatio: number;
  sharesRatio: number;
  spikeDay: number;
  spikeWidth: number;
  seed: number;
}

function buildSeries(days: number, spec: SeriesSpec): DailyPoint[] {
  const rng = makeRng(spec.seed);
  const out: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    const trend = spec.baseline + (spec.spike * 0.35 - spec.baseline) * Math.pow(t, 1.4);
    const dist = (i - spec.spikeDay) / spec.spikeWidth;
    const spikeBoost = spec.spike * Math.exp(-(dist * dist)) * 0.65;
    const seasonal = Math.sin((i / 7) * Math.PI * 2) * spec.baseline * 0.08;
    const noise = (rng() - 0.5) * spec.baseline * 0.12;
    const views = Math.max(0, Math.round(trend + spikeBoost + seasonal + noise));
    const engagement = Math.round(views * (spec.engagementRatio + (rng() - 0.5) * 0.01));
    const sharesSaves = Math.round(views * (spec.sharesRatio + (rng() - 0.5) * 0.004));
    out.push({ date: isoDaysAgo(days - 1 - i), views, engagement, sharesSaves });
  }
  return out;
}

const DAYS = 30;

const initialData: PlatformData = {
  facebook: {
    label: "Facebook",
    accent: "var(--facebook)",
    metrics: { threeSecondViews: 71_200, oneMinuteViews: 12_840, shares: 3_910 },
    daily: buildSeries(DAYS, {
      baseline: 1_400, spike: 3_200, engagementRatio: 0.062, sharesRatio: 0.018,
      spikeDay: 21, spikeWidth: 3.2, seed: 20240711,
    }),
  },
  instagram: {
    label: "Instagram",
    accent: "var(--instagram)",
    metrics: { retentionRate: 0.62, saves: 5_240, reach: 118_400, profileVisits: 7_410 },
    daily: buildSeries(DAYS, {
      baseline: 1_700, spike: 3_900, engagementRatio: 0.084, sharesRatio: 0.024,
      spikeDay: 23, spikeWidth: 3.0, seed: 81205,
    }),
  },
  youtube: {
    label: "YouTube",
    accent: "var(--youtube)",
    metrics: { watchTimeHours: 312, subscribersGained: 142, avgPercentageViewed: 0.54 },
    daily: buildSeries(DAYS, {
      baseline: 18, spike: 64, engagementRatio: 0.05, sharesRatio: 0.012,
      spikeDay: 19, spikeWidth: 3.5, seed: 419,
    }),
  },
};

interface AnalyticsContextValue {
  data: PlatformData;
  imports: ImportRecord[];
  applyImport: (platform: Platform, rows: Array<Record<string, string>>, fileName: string) => number;
  resetData: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlatformData>(initialData);
  const [imports, setImports] = useState<ImportRecord[]>([]);

  const applyImport: AnalyticsContextValue["applyImport"] = (platform, rows, fileName) => {
    if (!rows.length) return 0;

    const findKey = (row: Record<string, string>, keys: string[]) => {
      const lowerKeys = Object.keys(row).map((k) => k.toLowerCase());
      for (const target of keys) {
        const idx = lowerKeys.findIndex((k) => k.includes(target));
        if (idx >= 0) return Object.keys(row)[idx];
      }
      return null;
    };

    const first = rows[0];
    const dateKey = findKey(first, ["date", "day", "publish"]);
    const viewsKey = findKey(first, ["views", "impression", "plays", "reach"]);
    const engKey = findKey(first, ["engagement", "likes", "comments", "rate", "retention"]);
    const sharesKey = findKey(first, ["shares", "saves"]);

    const num = (v: string | undefined) =>
      Math.max(0, Number((v || "0").toString().replace(/[^0-9.-]/g, "")) || 0);

    const daily: DailyPoint[] = rows
      .map((r, i) => {
        const rawDate = dateKey ? r[dateKey] : "";
        const d = rawDate ? new Date(rawDate) : new Date(Date.now() - (rows.length - i) * 86_400_000);
        const iso = isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
        return {
          date: iso,
          views: num(viewsKey ? r[viewsKey] : ""),
          engagement: num(engKey ? r[engKey] : ""),
          sharesSaves: num(sharesKey ? r[sharesKey] : ""),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!daily.length) return 0;

    const totalViews = daily.reduce((s, p) => s + p.views, 0);

    setData((prev) => {
      const next: PlatformData = { ...prev };
      if (platform === "facebook") {
        next.facebook = {
          ...prev.facebook,
          daily,
          metrics: {
            threeSecondViews: totalViews,
            oneMinuteViews: Math.round(totalViews * 0.18),
            shares: daily.reduce((s, p) => s + p.sharesSaves, 0),
          },
        };
      } else if (platform === "instagram") {
        next.instagram = {
          ...prev.instagram,
          daily,
          metrics: {
            retentionRate: 0.62,
            saves: daily.reduce((s, p) => s + p.sharesSaves, 0),
            reach: Math.round(totalViews * 1.4),
            profileVisits: Math.round(totalViews * 0.06),
          },
        };
      } else {
        next.youtube = {
          ...prev.youtube,
          daily,
          metrics: {
            watchTimeHours: Math.round(totalViews * 0.02),
            subscribersGained: Math.round(totalViews * 0.008),
            avgPercentageViewed: 0.54,
          },
        };
      }
      return next;
    });

    setImports((prev) => [
      { id: crypto.randomUUID(), fileName, platform, rows: daily.length, importedAt: new Date().toISOString() },
      ...prev,
    ]);

    return daily.length;
  };

  const resetData = () => {
    setData(initialData);
    setImports([]);
  };

  const value = useMemo(() => ({ data, imports, applyImport, resetData }), [data, imports]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics must be used within AnalyticsProvider");
  return ctx;
}

// ---------- aggregation helpers ----------

export function sumMetric(daily: DailyPoint[], metric: MetricKey): number {
  return daily.reduce((s, p) => s + p[metric], 0);
}

export function growthVelocity(daily: DailyPoint[]): number {
  if (daily.length < 2) return 0;
  const half = Math.floor(daily.length / 2);
  const first = daily.slice(0, half).reduce((s, p) => s + p.views, 0) / Math.max(1, half);
  const second = daily.slice(half).reduce((s, p) => s + p.views, 0) / Math.max(1, daily.length - half);
  if (!first) return 0;
  return (second - first) / first;
}

export function engagementRate(daily: DailyPoint[]): number {
  const views = sumMetric(daily, "views");
  const eng = sumMetric(daily, "engagement");
  if (!views) return 0;
  return eng / views;
}

export function filterByRange(daily: DailyPoint[], days: number | "all") {
  if (days === "all") return daily;
  return daily.slice(-days);
}

export function mergeDaily(series: DailyPoint[][]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const s of series) {
    for (const p of s) {
      const existing = map.get(p.date);
      if (existing) {
        existing.views += p.views;
        existing.engagement += p.engagement;
        existing.sharesSaves += p.sharesSaves;
      } else {
        map.set(p.date, { ...p });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  views: "Views",
  engagement: "Engagement (Likes/Comments)",
  sharesSaves: "Shares/Saves",
};
