import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Platform = "facebook" | "instagram" | "youtube";

export interface DailyPoint {
  date: string; // ISO yyyy-mm-dd
  views: number;
  engagement: number; // 0-1
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
  facebook: {
    metrics: FacebookMetrics;
    daily: DailyPoint[];
  };
  instagram: {
    metrics: InstagramMetrics;
    daily: DailyPoint[];
  };
  youtube: {
    metrics: YoutubeMetrics;
    daily: DailyPoint[];
  };
}

export interface ImportRecord {
  id: string;
  fileName: string;
  platform: Platform;
  rows: number;
  importedAt: string;
}

function makeDaily(days: number, baseline: number, spike: number, engagementBase: number): DailyPoint[] {
  const out: DailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // scaling curve: baseline -> spike over time
    const t = (days - 1 - i) / (days - 1 || 1);
    const trend = baseline + (spike - baseline) * Math.pow(t, 1.6);
    const wobble = Math.sin(i * 1.3) * baseline * 0.15;
    const noise = (Math.sin(i * 3.7) + Math.cos(i * 2.1)) * baseline * 0.1;
    const views = Math.max(0, Math.round(trend + wobble + noise));
    const engagement = Math.min(0.35, Math.max(0.01, engagementBase + Math.sin(i * 0.9) * 0.015));
    out.push({ date: d.toISOString().slice(0, 10), views, engagement });
  }
  return out;
}

const initialData: PlatformData = {
  facebook: {
    metrics: { threeSecondViews: 482_310, oneMinuteViews: 87_450, shares: 12_940 },
    daily: makeDaily(30, 8_000, 42_000, 0.048),
  },
  instagram: {
    metrics: { retentionRate: 0.62, saves: 24_180, reach: 612_400, profileVisits: 38_720 },
    daily: makeDaily(30, 12_000, 68_000, 0.081),
  },
  youtube: {
    metrics: { watchTimeHours: 9_842, subscribersGained: 4_310, avgPercentageViewed: 0.54 },
    daily: makeDaily(30, 5_000, 55_000, 0.065),
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

    // Try to find a date column and a views/impressions column
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
    const engKey = findKey(first, ["engagement", "rate", "retention"]);

    const daily: DailyPoint[] = rows
      .map((r, i) => {
        const rawDate = dateKey ? r[dateKey] : "";
        const d = rawDate ? new Date(rawDate) : new Date(Date.now() - (rows.length - i) * 86_400_000);
        const iso = isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
        const viewsRaw = viewsKey ? r[viewsKey] : "";
        const views = Number((viewsRaw || "0").toString().replace(/[^0-9.-]/g, "")) || 0;
        const engRaw = engKey ? r[engKey] : "";
        const engagement = engRaw
          ? Math.min(1, Number(engRaw.toString().replace(/[^0-9.]/g, "")) / (engRaw.includes("%") ? 100 : 1))
          : 0.05;
        return { date: iso, views, engagement };
      })
      .filter((p) => p.views >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!daily.length) return 0;

    const totalViews = daily.reduce((s, p) => s + p.views, 0);

    setData((prev) => {
      const next: PlatformData = { ...prev };
      if (platform === "facebook") {
        next.facebook = {
          daily,
          metrics: {
            threeSecondViews: totalViews,
            oneMinuteViews: Math.round(totalViews * 0.18),
            shares: Math.round(totalViews * 0.025),
          },
        };
      } else if (platform === "instagram") {
        const avgEng = daily.reduce((s, p) => s + p.engagement, 0) / daily.length;
        next.instagram = {
          daily,
          metrics: {
            retentionRate: Math.min(0.95, avgEng * 8),
            saves: Math.round(totalViews * 0.04),
            reach: Math.round(totalViews * 1.4),
            profileVisits: Math.round(totalViews * 0.06),
          },
        };
      } else {
        next.youtube = {
          daily,
          metrics: {
            watchTimeHours: Math.round(totalViews * 0.02),
            subscribersGained: Math.round(totalViews * 0.008),
            avgPercentageViewed: Math.min(0.95, daily.reduce((s, p) => s + p.engagement, 0) / daily.length * 6),
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

// helpers
export function sumViews(daily: DailyPoint[]) {
  return daily.reduce((s, p) => s + p.views, 0);
}

export function avgEngagement(daily: DailyPoint[]) {
  if (!daily.length) return 0;
  return daily.reduce((s, p) => s + p.engagement, 0) / daily.length;
}

export function growthVelocity(daily: DailyPoint[]) {
  if (daily.length < 2) return 0;
  const half = Math.floor(daily.length / 2);
  const first = daily.slice(0, half).reduce((s, p) => s + p.views, 0) / half;
  const second = daily.slice(half).reduce((s, p) => s + p.views, 0) / (daily.length - half);
  if (!first) return 0;
  return (second - first) / first;
}

export function filterByRange(daily: DailyPoint[], days: number | "all") {
  if (days === "all") return daily;
  return daily.slice(-days);
}
