"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DisputeRow } from "@/lib/queries";
import { daysUntil, money, reasonLabel, shortDate, shortDateTime } from "@/lib/ui/format";
import { recommendationLabel } from "@/lib/ui/status";
import { StatusChip } from "./status-chip";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 14,
  foregroundColor: "#0f172a",
  textColor: "#0f172a",
  headerBackgroundColor: "#f8fafc",
  headerTextColor: "#475569",
  headerFontSize: 12,
  headerFontWeight: 600,
  borderColor: "#e5e7eb",
  rowBorder: { color: "#f1f5f9" },
  accentColor: "#2563eb",
  rowHoverColor: "#f8fafc",
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  spacing: 8,
});

type Filter = "all" | "open" | "approval";

function DisputeCell({ data }: ICellRendererParams<DisputeRow>) {
  if (!data) return null;
  return (
    <div className="flex flex-col justify-center gap-0.5 leading-tight">
      <span className="font-semibold">{data.buyer}</span>
      {data.items && <span className="truncate text-xs text-muted">{data.items}</span>}
    </div>
  );
}

function DueCell({ data }: ICellRendererParams<DisputeRow>) {
  if (!data?.dueAt) return <span className="text-muted">—</span>;
  const days = daysUntil(data.dueAt);
  const urgent = days !== null && days <= 3;
  return (
    <span className={urgent ? "font-semibold text-danger" : "text-body"}>
      {shortDate(data.dueAt)}
      {days !== null && <span className="ml-1.5 text-xs font-normal text-muted">({days < 0 ? "overdue" : `${days}d`})</span>}
    </span>
  );
}

function RecommendationCell({ data }: ICellRendererParams<DisputeRow>) {
  if (!data?.recommendation) return <span className="text-muted">Not investigated</span>;
  const pct = Math.round((data.confidence ?? 0) * 100);
  const color = data.recommendation === "fight" ? "bg-accent-ink" : data.recommendation === "refund" ? "bg-muted" : "bg-warn";
  const text = data.recommendation === "fight" ? "text-accent-ink" : data.recommendation === "refund" ? "text-muted" : "text-warn";
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 leading-tight">
      <span className={`font-semibold ${text}`}>{recommendationLabel[data.recommendation]}</span>
      <span className="flex items-center gap-2">
        <span className="h-1 flex-grow overflow-hidden rounded-full bg-line">
          <span className={`block h-1 ${color}`} style={{ width: `${pct}%` }} />
        </span>
        <span className="w-9 flex-shrink-0 text-right text-xs tabular-nums text-muted">{pct}%</span>
      </span>
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<DisputeRow>) {
  return data ? <StatusChip status={data.status} /> : null;
}

export function DisputesGrid({ rows }: { rows: DisputeRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: rows.length,
    open: rows.filter((r) => r.status.label !== "Resolved" && r.status.label !== "Done").length,
    approval: rows.filter((r) => r.status.label === "Awaiting approval").length,
  };

  const visible = useMemo(() => {
    if (filter === "open") return rows.filter((r) => r.status.label !== "Resolved" && r.status.label !== "Done");
    if (filter === "approval") return rows.filter((r) => r.status.label === "Awaiting approval");
    return rows;
  }, [rows, filter]);

  const columns = useMemo<ColDef<DisputeRow>[]>(
    () => [
      { headerName: "Dispute", field: "buyer", cellRenderer: DisputeCell, flex: 1.4, minWidth: 190 },
      { headerName: "Reason", field: "reason", valueFormatter: (p) => reasonLabel(p.value ?? ""), flex: 1.1, minWidth: 150 },
      {
        headerName: "Amount",
        field: "amount",
        type: "rightAligned",
        valueFormatter: (p) => (p.data ? money(p.data.amount, p.data.currency) : ""),
        // Keep AG Grid's right alignment class alongside our own styling.
        cellClass: ["ag-right-aligned-cell", "font-semibold", "tabular-nums"],
        flex: 0.7,
        minWidth: 100,
      },
      {
        headerName: "Opened",
        field: "openedAt",
        sort: "desc",
        valueFormatter: (p) => (p.value ? shortDateTime(p.value) : "—"),
        cellClass: "text-body tabular-nums",
        flex: 1,
        minWidth: 150,
      },
      { headerName: "Respond by", field: "dueAt", cellRenderer: DueCell, flex: 0.9, minWidth: 120 },
      {
        headerName: "Agent recommendation",
        field: "confidence",
        cellRenderer: RecommendationCell,
        flex: 1.2,
        minWidth: 170,
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: StatusCell,
        comparator: (a: DisputeRow["status"], b: DisputeRow["status"]) => a.label.localeCompare(b.label),
        flex: 1,
        minWidth: 150,
      },
    ],
    [],
  );

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: `All · ${counts.all}` },
    { key: "open", label: `Open · ${counts.open}` },
    { key: "approval", label: `Needs approval · ${counts.approval}` },
  ];

  return (
    <section aria-labelledby="disputes-title" className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="disputes-title" className="text-base font-semibold">
          Disputes
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter disputes">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-8 rounded-full px-3 text-[13px] ${
                filter === f.key ? "bg-ink font-semibold text-white" : "border border-line bg-white font-medium text-body hover:bg-subtle"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-12 text-center text-muted">No disputes yet. Click “Sync with PayPal” to pull them in.</p>
      ) : (
        <div style={{ height: Math.min(64 * visible.length + 44, 560) }}>
          <AgGridReact<DisputeRow>
            theme={theme}
            rowData={visible}
            columnDefs={columns}
            rowHeight={64}
            headerHeight={44}
            getRowId={(p) => p.data.id}
            defaultColDef={{ sortable: true, resizable: true, suppressMovable: true }}
            onRowClicked={(e) => e.data && router.push(`/disputes/${encodeURIComponent(e.data.id)}`)}
            rowClass="cursor-pointer"
            overlayNoRowsTemplate="<span>No disputes match this filter.</span>"
          />
        </div>
      )}
    </section>
  );
}
