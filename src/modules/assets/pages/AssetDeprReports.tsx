import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingDown,
  Download,
  Printer,
  RefreshCw,
  Filter,
  FileText,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/src/shared/components/AuthProvider";
import { useCurrency } from "@/src/shared/components/SettingsProvider";
import { fetchWithAuth } from "@/src/shared/lib/api";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface SummaryRow {
  categoryId: string;
  categoryName: string;
  ratePercent: number;
  costOpeningBal: number;
  costAddition: number;
  costDisposal: number;
  costClosingBal: number;
  deprOpeningBal: number;
  deprCharge: number;
  deprWrittenOff: number;
  deprClosingBal: number;
  wdv: number;
}

interface SummaryResponse {
  rows: SummaryRow[];
  totals: SummaryRow;
  period: { startDate: string; endDate: string };
}

interface DetailRow {
  rowType: "opening" | "charge";
  categoryId: string;
  categoryName: string;
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  date: string;
  description: string;
  opening: number;
  addition: number;
  accDep: number;
  netCost: number;
  yearEnd: string;
  rate: number;
  depreciation: number;
}

interface DetailResponse {
  rows: DetailRow[];
  totals: { opening: number; netCost: number; depreciation: number };
  period: { startDate: string; endDate: string };
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function AssetDeprReports() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  const [activeTab, setActiveTab] = useState<"summary" | "detailed">("summary");

  // Filters
  const [startMonth, setStartMonth] = useState(currentYearMonth());
  const [endMonth, setEndMonth] = useState(currentYearMonth());
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");

  // Data
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [detailData, setDetailData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ startMonth, endMonth });
      if (categoryId) params.set("categoryId", categoryId);
      if (branchId) params.set("branchId", branchId);

      if (activeTab === "summary") {
        const data = await fetchWithAuth(`/api/assets/reports/depr-summary?${params}`, token);
        setSummaryData(data);
      } else {
        const data = await fetchWithAuth(`/api/assets/reports/depr-detailed?${params}`, token);
        setDetailData(data);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [getToken, activeTab, startMonth, endMonth, categoryId, branchId]);

  const fmt = (n: number | undefined | null) =>
    `${currencySymbol}${Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const exportSummaryCSV = () => {
    if (!summaryData) return;
    const headers = [
      "Particulars","Rate %",
      "Cost Opening","Cost Addition","Cost Disposal","Cost Closing",
      "Depr Opening","Depr Charge","Depr Written Off","Depr Closing","WDV",
    ];
    const csvRows = summaryData.rows.map((r) => [
      r.categoryName, r.ratePercent,
      r.costOpeningBal, r.costAddition, r.costDisposal, r.costClosingBal,
      r.deprOpeningBal, r.deprCharge, r.deprWrittenOff, r.deprClosingBal, r.wdv,
    ]);
    const t = summaryData.totals;
    csvRows.push(["Total","",t.costOpeningBal,t.costAddition,t.costDisposal,t.costClosingBal,t.deprOpeningBal,t.deprCharge,t.deprWrittenOff,t.deprClosingBal,t.wdv]);
    downloadCSV([headers, ...csvRows].map((r) => r.join(",")).join("\n"), `depr_summary_${startMonth}_${endMonth}.csv`);
  };

  const exportDetailCSV = () => {
    if (!detailData) return;
    const headers = ["Date","FS Category","Description","Opening","Addition","Acc Dep","Net Cost","Year End","Rate %","Depreciation"];
    const csvRows = detailData.rows.map((r) => [r.date,r.categoryName,r.description,r.opening,r.addition,r.accDep,r.netCost,r.yearEnd,r.rate,r.depreciation]);
    downloadCSV([headers, ...csvRows].map((r) => r.join(",")).join("\n"), `depr_detailed_${startMonth}_${endMonth}.csv`);
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button id="depr-reports-back-btn" onClick={() => navigate("/asset-reports")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />Back
            </button>
            <div className="w-px h-5 bg-gray-300" />
            <TrendingDown className="w-5 h-5 text-purple-600" />
            <h1 className="text-lg font-semibold text-gray-800">Depreciation Reports</h1>
          </div>
          <div className="flex items-center gap-2">
            <button id="depr-reports-export-csv"
              onClick={activeTab === "summary" ? exportSummaryCSV : exportDetailCSV}
              disabled={!summaryData && !detailData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <Download className="w-4 h-4" />Export CSV
            </button>
            <button id="depr-reports-print" onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4" />Print
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 print:hidden">
        <div className="flex">
          {(["summary", "detailed"] as const).map((tab) => (
            <button key={tab} id={`depr-tab-${tab}`}
              onClick={() => { setActiveTab(tab); setSummaryData(null); setDetailData(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
              {tab === "summary" ? <BarChart3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {tab === "summary" ? "Summary Report" : "Detailed Report"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Month</label>
            <input id="depr-filter-start-month" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Month</label>
            <input id="depr-filter-end-month" type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category ID <span className="text-gray-400">(optional)</span></label>
            <input id="depr-filter-category" type="text" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              placeholder="All categories"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Branch ID <span className="text-gray-400">(optional)</span></label>
            <input id="depr-filter-branch" type="text" value={branchId} onChange={(e) => setBranchId(e.target.value)}
              placeholder="All branches"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-36" />
          </div>
          <button id="depr-filter-generate" onClick={fetchReport} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>
        )}
        {!summaryData && !detailData && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <TrendingDown className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium">No report generated yet</p>
            <p className="text-sm mt-1">Select a period and click <strong>Generate Report</strong></p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
        {activeTab === "summary" && summaryData && (
          <SummaryTable data={summaryData} fmt={fmt} currencySymbol={currencySymbol} />
        )}
        {activeTab === "detailed" && detailData && (
          <DetailTable data={detailData} fmt={fmt} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Summary Table
// ──────────────────────────────────────────────────────────────
function SummaryTable({ data, fmt, currencySymbol }: { data: SummaryResponse; fmt: (n: number) => string; currencySymbol: string }) {
  const { rows, totals, period } = data;
  const fmtLabel = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const startLabel = fmtLabel(period.startDate);
  const endLabel = fmtLabel(period.endDate);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm print:shadow-none print:border-0">
      <div className="hidden print:block px-6 py-4 border-b">
        <h2 className="text-lg font-bold">Depreciation Schedule - Summary Report</h2>
        <p className="text-sm text-gray-600">Period: {startLabel} to {endLabel}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th rowSpan={2} className="px-3 py-2.5 text-left border-r border-slate-600 min-w-[160px]">Particulars</th>
              <th colSpan={4} className="px-3 py-2 text-center border-r border-slate-600 font-semibold tracking-wide">COST ({currencySymbol})</th>
              <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-600 whitespace-nowrap">Dep Rate %</th>
              <th colSpan={4} className="px-3 py-2 text-center border-r border-slate-600 font-semibold tracking-wide">DEPRECIATION ({currencySymbol})</th>
              <th rowSpan={2} className="px-3 py-2.5 text-right whitespace-nowrap">WDV ({currencySymbol})</th>
            </tr>
            <tr className="bg-slate-700 text-slate-200 text-[10px]">
              <th className="px-3 py-2 text-right border-r border-slate-600 whitespace-nowrap">Bal as at {startLabel}</th>
              <th className="px-3 py-2 text-right border-r border-slate-600">Addition</th>
              <th className="px-3 py-2 text-right border-r border-slate-600">Disposal</th>
              <th className="px-3 py-2 text-right border-r border-slate-600 whitespace-nowrap">Bal as at {endLabel}</th>
              <th className="px-3 py-2 text-right border-r border-slate-600 whitespace-nowrap">Bal as at {startLabel}</th>
              <th className="px-3 py-2 text-right border-r border-slate-600">Charge</th>
              <th className="px-3 py-2 text-right border-r border-slate-600">Written Off</th>
              <th className="px-3 py-2 text-right border-r border-slate-600 whitespace-nowrap">Bal as at {endLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No data for selected period</td></tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row.categoryId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2 font-medium text-gray-800 border-r border-gray-100">{row.categoryName}</td>
                <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100 tabular-nums">{fmt(row.costOpeningBal)}</td>
                <td className="px-3 py-2 text-right text-green-700 border-r border-gray-100 tabular-nums">{fmt(row.costAddition)}</td>
                <td className="px-3 py-2 text-right text-red-600 border-r border-gray-100 tabular-nums">{fmt(row.costDisposal)}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800 border-r border-gray-100 tabular-nums">{fmt(row.costClosingBal)}</td>
                <td className="px-3 py-2 text-center text-purple-700 border-r border-gray-100 font-medium">{row.ratePercent > 0 ? `${row.ratePercent}%` : "-"}</td>
                <td className="px-3 py-2 text-right text-gray-700 border-r border-gray-100 tabular-nums">{fmt(row.deprOpeningBal)}</td>
                <td className="px-3 py-2 text-right text-orange-600 border-r border-gray-100 tabular-nums">{fmt(row.deprCharge)}</td>
                <td className="px-3 py-2 text-right text-red-600 border-r border-gray-100 tabular-nums">{fmt(row.deprWrittenOff)}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800 border-r border-gray-100 tabular-nums">{fmt(row.deprClosingBal)}</td>
                <td className="px-3 py-2 text-right font-bold text-blue-700 tabular-nums">{fmt(row.wdv)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-semibold">
              <td className="px-3 py-2.5 border-r border-slate-600">Total</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.costOpeningBal)}</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.costAddition)}</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.costDisposal)}</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.costClosingBal)}</td>
              <td className="px-3 py-2.5 border-r border-slate-600" />
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.deprOpeningBal)}</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.deprCharge)}</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.deprWrittenOff)}</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.deprClosingBal)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{fmt(totals.wdv)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Detailed Table
// ──────────────────────────────────────────────────────────────
function DetailTable({ data, fmt }: { data: DetailResponse; fmt: (n: number) => string }) {
  const { rows, totals, period } = data;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

  // Group rows by category for visual separation
  const groups: { catId: string; catName: string; rows: DetailRow[] }[] = [];
  let cur: { catId: string; catName: string; rows: DetailRow[] } | null = null;
  for (const row of rows) {
    if (!cur || cur.catId !== row.categoryId) {
      cur = { catId: row.categoryId, catName: row.categoryName, rows: [] };
      groups.push(cur);
    }
    cur.rows.push(row);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm print:shadow-none print:border-0">
      <div className="hidden print:block px-6 py-4 border-b">
        <h2 className="text-lg font-bold">Depreciation Schedule - Detailed Report</h2>
        <p className="text-sm text-gray-600">Period: {fmtDate(period.startDate)} to {fmtDate(period.endDate)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2.5 text-left border-r border-slate-600 min-w-[90px]">Date</th>
              <th className="px-3 py-2.5 text-left border-r border-slate-600 min-w-[130px]">FS Category</th>
              <th className="px-3 py-2.5 text-left border-r border-slate-600 min-w-[220px]">Description</th>
              <th className="px-3 py-2.5 text-right border-r border-slate-600 min-w-[100px]">Opening</th>
              <th className="px-3 py-2.5 text-right border-r border-slate-600 min-w-[90px]">Addition</th>
              <th className="px-3 py-2.5 text-right border-r border-slate-600 min-w-[90px]">Acc Dep</th>
              <th className="px-3 py-2.5 text-right border-r border-slate-600 min-w-[90px]">Net Cost</th>
              <th className="px-3 py-2.5 text-right border-r border-slate-600 min-w-[90px]">Year End</th>
              <th className="px-3 py-2.5 text-center border-r border-slate-600 min-w-[70px]">Rate %</th>
              <th className="px-3 py-2.5 text-right min-w-[100px]">Depreciation</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No depreciation transactions found for this period</td></tr>
            )}
            {groups.map((group) => (
              <React.Fragment key={group.catId}>
                <tr className="bg-purple-50 border-t-2 border-purple-200">
                  <td colSpan={10} className="px-3 py-1.5 text-xs font-bold text-purple-800 uppercase tracking-wide">{group.catName}</td>
                </tr>
                {group.rows.map((row, idx) => {
                  const isOpening = row.rowType === "opening";
                  return (
                    <tr key={`${row.categoryId}-${idx}`}
                      className={isOpening ? "bg-amber-50 italic border-b border-amber-100" : (idx % 2 === 0 ? "bg-white" : "bg-gray-50")}>
                      <td className="px-3 py-2 text-gray-600 border-r border-gray-100 whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-3 py-2 border-r border-gray-100 text-gray-700">{row.categoryName}</td>
                      <td className="px-3 py-2 border-r border-gray-100">
                        <span className={isOpening ? "text-amber-700 font-semibold" : "text-gray-700"}>{row.description}</span>
                        {row.assetCode && <span className="ml-1.5 text-gray-400 text-[10px]">[{row.assetCode}]</span>}
                      </td>
                      <td className="px-3 py-2 text-right border-r border-gray-100 tabular-nums text-gray-700">{row.opening > 0 ? fmt(row.opening) : "-"}</td>
                      <td className="px-3 py-2 text-right border-r border-gray-100 tabular-nums text-green-700">{row.addition > 0 ? fmt(row.addition) : "-"}</td>
                      <td className="px-3 py-2 text-right border-r border-gray-100 tabular-nums text-gray-700">{row.accDep > 0 ? fmt(row.accDep) : "-"}</td>
                      <td className="px-3 py-2 text-right border-r border-gray-100 tabular-nums font-medium text-blue-700">{fmt(row.netCost)}</td>
                      <td className="px-3 py-2 text-right border-r border-gray-100 tabular-nums text-gray-500 whitespace-nowrap">{row.yearEnd && !isOpening ? fmtDate(row.yearEnd) : "-"}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-100 text-purple-700">{row.rate > 0 ? `${row.rate}%` : "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-orange-600">{row.depreciation > 0 ? fmt(row.depreciation) : "-"}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-semibold">
              <td colSpan={3} className="px-3 py-2.5 border-r border-slate-600">Total</td>
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.opening)}</td>
              <td className="px-3 py-2.5 border-r border-slate-600" />
              <td className="px-3 py-2.5 border-r border-slate-600" />
              <td className="px-3 py-2.5 text-right border-r border-slate-600 tabular-nums">{fmt(totals.netCost)}</td>
              <td className="px-3 py-2.5 border-r border-slate-600" />
              <td className="px-3 py-2.5 border-r border-slate-600" />
              <td className="px-3 py-2.5 text-right tabular-nums">{fmt(totals.depreciation)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}