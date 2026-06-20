import { DollarSign, ShieldCheck, Database, Layers, BarChart3, Sparkles } from "lucide-react";
import { Invoice } from "../types";

interface DashboardStatsProps {
  invoices: Invoice[];
  onOpenAiInsights?: () => void;
}

export default function DashboardStats({ invoices, onOpenAiInsights }: DashboardStatsProps) {
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

  // 4. Calculate anomalies count
  const anomaliesCount = invoices.filter(
    inv => inv.confidence_score < 80 || !inv.vendor || inv.vendor.toLowerCase().includes("unknown")
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
      {/* 1. Monthly Ledger Summary Card (Deep Indigo matching design exactly) */}
      <div className="sm:col-span-2 lg:col-span-4 bg-indigo-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-md shadow-indigo-900/10 min-h-[140px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-850 rounded-full translate-x-12 -translate-y-12 opacity-40 blur-md"></div>
        <div className="relative z-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider opacity-75">Monthly Ledger Total</h2>
          <p className="text-2xl font-extrabold mt-1.5 font-mono">
            ${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="relative z-10 flex justify-between items-end mt-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">Verified Ledger Rows</p>
            <p className="text-xl font-bold font-mono">{invoices.length} <span className="text-xs font-normal opacity-70">items</span></p>
          </div>
          {/* Decorative mini active bars from design HTML */}
          <div className="h-10 w-16 sm:w-20 flex items-end gap-1">
            <div className="flex-1 bg-white opacity-20 h-[40%] rounded-t"></div>
            <div className="flex-1 bg-white opacity-40 h-[60%] rounded-t"></div>
            <div className="flex-1 bg-white opacity-30 h-[30%] rounded-t"></div>
            <div className="flex-1 bg-white opacity-100 h-[90%] rounded-t"></div>
          </div>
        </div>
      </div>

      {/* 2. Mean Extraction Trust / OCR Quality (Sleek slate-200 card) */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors duration-200">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Mean Extraction Trust
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono flex items-baseline">
            {averageConfidence}%
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-1 font-sans">Confidence</span>
          </h3>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Gemini structured precision</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Top Cost Center (Sleek slate-200 card) */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors duration-200">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
            Top Cost Category
          </span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug" title={topCategory}>
            {topCategory}
          </h3>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Primary cost allocation</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 4. AI Interactive Insights Launcher Card */}
      <div 
        onClick={onOpenAiInsights}
        className="lg:col-span-2 bg-gradient-to-tr from-violet-50 dark:from-violet-950/20 to-indigo-50/50 dark:to-indigo-950/10 hover:from-violet-100 dark:hover:from-violet-900/30 hover:to-indigo-100/60 dark:hover:to-indigo-905/30 p-5 rounded-2xl border border-indigo-150 dark:border-indigo-900/40 shadow-xs flex items-center justify-between cursor-pointer group transition-all duration-200 active:scale-98"
      >
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400 animate-pulse" />
            Co-Pilot AI Insights
          </span>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-355 leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
            {anomaliesCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{anomaliesCount} Audit Warnings</span>
            ) : (
              "Ledger Diagnostic"
            )}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider group-hover:underline">Launch Report &rarr;</p>
        </div>
        <div className="bg-gradient-to-tr from-indigo-50 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-indigo-600 dark:text-white p-2.5 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-all duration-250">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

    </div>
  );
}
