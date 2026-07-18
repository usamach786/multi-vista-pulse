import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint, MetricKey, Platform } from "@/lib/analytics-store";
import { METRIC_LABELS } from "@/lib/analytics-store";

export interface ChartSeries {
  platform: Platform;
  data: DailyPoint[];
  color: string;
}

interface Props {
  series: ChartSeries[];
  metric: MetricKey;
  height?: number;
}

function formatDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
};

export function MainChart({ series, metric, height = 300 }: Props) {
  // Merge all series into a single dataset keyed by date.
  const dates = new Set<string>();
  for (const s of series) for (const p of s.data) dates.add(p.date);
  const sortedDates = Array.from(dates).sort((a, b) => a.localeCompare(b));

  const merged = sortedDates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      const point = s.data.find((p) => p.date === date);
      row[s.platform] = point ? point[metric] : 0;
    }
    return row;
  });

  const metricLabel = METRIC_LABELS[metric];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="var(--muted-foreground)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={formatNumber}
          stroke="var(--muted-foreground)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
          labelFormatter={(l) => formatDate(String(l))}
          formatter={(value: number, name: string) => [formatNumber(value), PLATFORM_LABEL[name as Platform] || name]}
          label={metricLabel}
        />
        {series.map((s) => (
          <Line
            key={s.platform}
            type="monotone"
            dataKey={s.platform}
            name={PLATFORM_LABEL[s.platform]}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={400}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
