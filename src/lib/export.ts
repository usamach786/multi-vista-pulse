import type { DailyPoint, MetricKey, Platform } from "@/lib/analytics-store";
import { PLATFORM_LABELS, METRIC_LABELS } from "@/lib/analytics-store";

export type PlatformFilter = "all" | Platform;

export const PLATFORM_FILTER_LABELS: Record<PlatformFilter, string> = {
  all: "All Platforms (Combined)",
  facebook: "Facebook Only",
  instagram: "Instagram Only",
  youtube: "YouTube Only",
};

export const METRIC_KEYS: MetricKey[] = ["views", "engagement", "sharesSaves"];

export interface ExportOptions {
  platform: PlatformFilter;
  metric: MetricKey;
  fileName?: string;
}

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Build the rows for export. When platform === "all", each platform's
// daily points are emitted as separate rows (Date, Platform, Metric_Type, Count).
// When filtered to a single platform, only that platform's rows are included,
// with platform-specific metric labels (e.g. Instagram "Saves").
function buildRows(
  seriesByPlatform: Record<Platform, DailyPoint[]>,
  options: ExportOptions,
): string[][] {
  const { platform, metric } = options;
  const platforms: Platform[] = platform === "all" ? ["facebook", "instagram", "youtube"] : [platform];

  const rows: string[][] = [];
  for (const p of platforms) {
    const series = seriesByPlatform[p] || [];
    const metricLabel = METRIC_LABELS[metric];
    for (const point of series) {
      rows.push([point.date, PLATFORM_LABELS[p], metricLabel, String(point[metric])]);
    }
  }
  return rows;
}

function toCsv(rows: string[][]): string {
  // Prepend BOM so Excel detects UTF-8 and opens without garbling.
  return "\uFEFF" + rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
}

function triggerDownload(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function defaultFileName(platform: PlatformFilter, metric: MetricKey): string {
  const p = platform === "all" ? "all-platforms" : platform;
  const m = metric === "sharesSaves" ? "shares-saves" : metric;
  const date = new Date().toISOString().slice(0, 10);
  return `pulse-analytics_${p}_${m}_${date}.csv`;
}

export function exportReport(
  seriesByPlatform: Record<Platform, DailyPoint[]>,
  options: ExportOptions,
): { fileName: string; rows: number } {
  const rows = buildRows(seriesByPlatform, options);
  const header = ["Date", "Platform", "Metric_Type", "Count"];
  const allRows = [header, ...rows];
  const csv = toCsv(allRows);
  const fileName = options.fileName || defaultFileName(options.platform, options.metric);
  triggerDownload(csv, fileName);
  return { fileName, rows: rows.length };
}
