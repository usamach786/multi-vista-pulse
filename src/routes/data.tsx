import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Facebook,
  Instagram,
  Youtube,
  Download,
  Eye,
  Activity,
  Share2,
  FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAnalytics, type Platform } from "@/lib/analytics-store";
import {
  exportReport,
  PLATFORM_FILTER_LABELS,
  type PlatformFilter,
} from "@/lib/export";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Export Settings · Pulse Analytics" },
      {
        name: "description",
        content:
          "Configure CSV report exports and import fresh Meta Business Suite or YouTube Studio data.",
      },
    ],
  }),
  component: ExportSettingsPage,
});

const platformMeta: Record<Platform, { label: string; icon: typeof Facebook; tone: string; example: string }> = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    tone: "text-facebook border-facebook/40 bg-facebook/10",
    example: "Meta Business Suite → Reels export",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    tone: "text-instagram border-instagram/40 bg-instagram/10",
    example: "Meta Business Suite → Instagram content export",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    tone: "text-youtube border-youtube/40 bg-youtube/10",
    example: "YouTube Studio → Advanced mode CSV",
  },
};

const METRIC_ITEMS: { value: "views" | "engagement" | "sharesSaves"; label: string; icon: typeof Eye }[] = [
  { value: "views", label: "Views", icon: Eye },
  { value: "engagement", label: "Engagement (Likes/Comments)", icon: Activity },
  { value: "sharesSaves", label: "Shares/Saves", icon: Share2 },
];

function ExportSettingsPage() {
  const { data, imports, applyImport, resetData } = useAnalytics();
  const [dragOver, setDragOver] = useState<Platform | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [metric, setMetric] = useState<"views" | "engagement" | "sharesSaves">("views");
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewRows = useMemo(() => {
    const platforms: Platform[] =
      platformFilter === "all" ? ["facebook", "instagram", "youtube"] : [platformFilter];
    const rows: { date: string; platform: string; metric: string; count: number }[] = [];
    for (const p of platforms) {
      for (const point of data[p].daily) {
        rows.push({
          date: point.date,
          platform: platformMeta[p].label,
          metric: METRIC_ITEMS.find((m) => m.value === metric)!.label,
          count: point[metric],
        });
      }
    }
    return rows;
  }, [data, platformFilter, metric]);

  const handleExport = () => {
    const seriesByPlatform: Record<Platform, typeof data.facebook.daily> = {
      facebook: data.facebook.daily,
      instagram: data.instagram.daily,
      youtube: data.youtube.daily,
    };
    const { fileName, rows } = exportReport(seriesByPlatform, { platform: platformFilter, metric });
    if (rows === 0) {
      toast.error("No data to export for the current selection");
      return;
    }
    toast.success(`Exported ${rows} rows`, { description: fileName });
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Export Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure and download Excel-ready CSV reports, or refresh the dashboard with your own exports.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { resetData(); toast.success("Reset to sample data"); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to sample
        </Button>
      </div>

      <Card className="mt-6 border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Report configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Platform</label>
              <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
                <SelectTrigger className="w-[220px]">
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
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Metric</label>
              <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
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
            <div className="flex gap-2">
              <Button onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button variant="secondary" onClick={() => setPreviewOpen((v) => !v)} className="gap-2">
                <FileDown className="h-4 w-4" />
                {previewOpen ? "Hide preview" : "Preview rows"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            Output columns: <code className="rounded bg-muted px-1">Date</code>,{" "}
            <code className="rounded bg-muted px-1">Platform</code>,{" "}
            <code className="rounded bg-muted px-1">Metric_Type</code>,{" "}
            <code className="rounded bg-muted px-1">Count</code>.{" "}
            {platformFilter === "all"
              ? "Includes rows for all three channels."
              : `Includes only ${PLATFORM_FILTER_LABELS[platformFilter]} rows (platform-specific metrics like Instagram Saves are preserved).`}
          </div>

          {previewOpen && (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Metric_Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 100).map((r, i) => (
                      <TableRow key={`${r.date}-${r.platform}-${i}`}>
                        <TableCell className="font-mono text-xs">{r.date}</TableCell>
                        <TableCell className="text-xs">{r.platform}</TableCell>
                        <TableCell className="text-xs">{r.metric}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Showing {Math.min(previewRows.length, 100)} of {previewRows.length} rows in the export.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(Object.keys(platformMeta) as Platform[]).map((p) => (
          <DropZone
            key={p}
            platform={p}
            active={dragOver === p}
            onDragEnter={() => setDragOver(p)}
            onDragLeave={() => setDragOver(null)}
            onFile={(file) => {
              setDragOver(null);
              parseAndApply(file, p, (rows) => {
                const n = applyImport(p, rows, file.name);
                if (n > 0) toast.success(`Imported ${n} rows for ${platformMeta[p].label}`);
                else toast.error("Could not parse this file");
              });
            }}
          />
        ))}
      </section>

      <Card className="mt-6 border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No imports yet. Drop a CSV above to populate the dashboard with your own data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead>Imported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => {
                  const meta = platformMeta[imp.platform];
                  const Icon = meta.icon;
                  return (
                    <TableRow key={imp.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{imp.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", meta.tone)}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{imp.rows}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(imp.importedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Expected format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Pulse auto-detects columns from Meta Business Suite and YouTube Studio exports. The parser looks for
            a date column (<code className="rounded bg-muted px-1">date</code>, <code className="rounded bg-muted px-1">day</code>,
            or <code className="rounded bg-muted px-1">publish time</code>) and a views column
            (<code className="rounded bg-muted px-1">views</code>, <code className="rounded bg-muted px-1">impressions</code>,
            <code className="rounded bg-muted px-1">plays</code>, or <code className="rounded bg-muted px-1">reach</code>).
          </p>
          <p>
            Optional engagement columns like <code className="rounded bg-muted px-1">engagement rate</code> or
            <code className="rounded bg-muted px-1">average view %</code> are picked up automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function parseAndApply(
  file: File,
  _platform: Platform,
  onParsed: (rows: Array<Record<string, string>>) => void,
) {
  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      onParsed(results.data || []);
    },
    error: () => onParsed([]),
  });
}

function DropZone({
  platform,
  active,
  onDragEnter,
  onDragLeave,
  onFile,
}: {
  platform: Platform;
  active: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onFile: (f: File) => void;
}) {
  const meta = platformMeta[platform];
  const Icon = meta.icon;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition",
        active ? "border-primary bg-primary/5" : "border-border/70 bg-card/60 hover:bg-card/80",
      )}
    >
      <div className={cn("grid h-12 w-12 place-items-center rounded-xl border", meta.tone)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-3 text-sm font-semibold">{meta.label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{meta.example}</div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" />
        Drop CSV / XLSX here
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </Button>
    </div>
  );
}
