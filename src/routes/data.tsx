import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, RotateCcw, Facebook, Instagram, Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Manager · Pulse Analytics" },
      {
        name: "description",
        content:
          "Import Meta Business Suite and YouTube Studio exports (CSV) to update your dashboard analytics.",
      },
    ],
  }),
  component: DataManagerPage,
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

function DataManagerPage() {
  const { imports, applyImport, resetData } = useAnalytics();
  const [dragOver, setDragOver] = useState<Platform | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Data Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop in exports from Meta Business Suite and YouTube Studio to refresh the dashboard.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { resetData(); toast.success("Reset to sample data"); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to sample
        </Button>
      </div>

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
