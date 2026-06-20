import { DollarSign, ShieldCheck, Database, Layers, BarChart3 } from "lucide-react";
import { Invoice } from "../types";

interface DashboardStatsProps {
  invoices: Invoice[];
}

export default function DashboardStats({ invoices }: DashboardStatsProps) {
  // 1. Calculate Sum
  const totalSpend = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  // 2. Average Confidence
  const averageConfidence = invoices.length
    ? Math.round(invoices.reduce((sum, inv) => sum + inv.confidence_score, 0) / invoices.length)
    : 100;

  // 3. Top Spending Category
  const topCategoryStats = invoices.reduce((acc, inv) => {
    acc[inv.category] = (acc[inv.category] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.keys(topCategoryStats).length
    ? Object.entries(topCategoryStats).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : "None";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
      {/* 1. Monthly Ledger Summary Card (Deep Indigo matching design exactly) */}
      <div className="sm:col-span-2 lg:col-span-5 bg-indigo-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-md shadow-indigo-900/10 min-h-[140px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-850 rounded-full translate-x-12 -translate-y-12 opacity-40 blur-md"></div>
        <div className="relative z-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider opacity-75">Monthly Ledger Total</h2>
          <p className="text-3xl font-extrabold mt-1.5 font-mono">
            ${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="relative z-10 flex justify-between items-end mt-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">Verified Ledger Rows</p>
            <p className="text-xl font-bold font-mono">{invoices.length} <span className="text-xs font-normal opacity-70">items</span></p>
          </div>
          {/* Decorative mini active bars from design HTML */}
          <div className="h-10 w-24 flex items-end gap-1">
            <div className="flex-1 bg-white opacity-20 h-[40%] rounded-t"></div>
            <div className="flex-1 bg-white opacity-40 h-[60%] rounded-t"></div>
            <div className="flex-1 bg-white opacity-30 h-[30%] rounded-t"></div>
            <div className="flex-1 bg-white opacity-100 h-[90%] rounded-t"></div>
          </div>
        </div>
      </div>

      {/* 2. Mean Extraction Trust / OCR Quality (Sleek slate-200 card) */}
      <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Mean Extraction Trust
          </span>
          <h3 className="text-2xl font-extrabold text-slate-900 font-mono flex items-baseline">
            {averageConfidence}%
            <span className="text-[10px] text-slate-400 font-normal ml-1.5 font-sans">Confidence</span>
          </h3>
          <p className="text-[10px] text-emerald-600 font-medium">Gemini 3.5 structured precision</p>
        </div>
        <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl border border-indigo-100 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Top Cost Center (Sleek slate-200 card) */}
      <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Top Cost Category
          </span>
          <h3 className="text-lg font-bold text-slate-800 truncate leading-snug" title={topCategory}>
            {topCategory}
          </h3>
          <p className="text-[10px] text-indigo-600 font-medium">Primary cost allocation</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl border border-emerald-100 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
