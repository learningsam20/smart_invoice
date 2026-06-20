import { motion, AnimatePresence } from "motion/react";
import { 
  X, AlertTriangle, ShieldCheck, CheckCircle2, CircleDollarSign, 
  Settings, PenTool, Sparkles, HelpCircle, FileBarChart, RefreshCw, BarChart2
} from "lucide-react";
import { Invoice } from "../types";

interface AiInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onSelectInvoiceForView?: (invoice: Invoice) => void;
}

export default function AiInsightsModal({ 
  isOpen, 
  onClose, 
  invoices,
  onSelectInvoiceForView 
}: AiInsightsModalProps) {
  
  if (!isOpen) return null;

  // 1. Core Dynamic Stats Calculations
  const totalInvoicesCount = invoices.length;
  const verifiedInvoices = invoices.filter(inv => inv.validated_by_user);
  const pendingInvoices = invoices.filter(inv => !inv.validated_by_user);
  const modifiedInvoices = invoices.filter(inv => inv.status === "user_modified");

  const totalDollarValue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  
  // Total auto processed: processed by AI, not modified by user, high confidence
  const autoProcessedInvoices = invoices.filter(inv => {
    const isHighConfidence = inv.confidence_score >= 80;
    const isNotModified = inv.status !== "user_modified";
    return isHighConfidence && isNotModified;
  });
  
  const totalAutoProcessedValue = autoProcessedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const autoPercent = totalInvoicesCount ? Math.round((autoProcessedInvoices.length / totalInvoicesCount) * 100) : 0;
  
  // 2. Identify OCR Enhancements / Low Confidence Items
  const ocrEnhancements = invoices.map(inv => {
    const issues: { text: string; severity: "high" | "warning"; recommendation: string }[] = [];
    
    if (inv.confidence_score < 80) {
      issues.push({
        text: `Low OCR Confidence Score (${inv.confidence_score}%)`,
        severity: "high",
        recommendation: "Ensure source file has high contrast. Avoid heavy scan skew/rotation."
      });
    }
    
    const isVendorGeneric = !inv.vendor || inv.vendor.toLowerCase().includes("unknown") || inv.vendor.toLowerCase().includes("vendor");
    if (isVendorGeneric) {
      issues.push({
        text: "Generic or Ambiguous Merchant Vendor Name",
        severity: "warning",
        recommendation: "Update invoice prompt templates with known supplier catalog anchors to resolve."
      });
    }

    if (inv.category === "Other Business Expense") {
      issues.push({
        text: "Fallback Expense Category Classification",
        severity: "warning",
        recommendation: "Feed historical category matches to structured schema tags for smarter mapping."
      });
    }

    if (inv.status === "user_modified") {
      issues.push({
        text: "Overruled by Manual User Corrections",
        severity: "warning",
        recommendation: "OCR parameters likely missed tax breakdown or tips. Tune prompt to isolate raw totals."
      });
    }

    return {
      invoice: inv,
      issues
    };
  }).filter(item => item.issues.length > 0);

  // 3. Category distribution helper for visual insight
  const categorySummary = invoices.reduce((acc, inv) => {
    acc[inv.category] = (acc[inv.category] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryArray = Object.entries(categorySummary).map(([name, value]) => ({
    name,
    value,
    percent: totalDollarValue ? Math.round((value / totalDollarValue) * 100) : 0
  })).sort((a, b) => b.value - a.value);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Sheet panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-150 w-full max-w-2xl relative overflow-hidden flex flex-col z-10 max-h-[90vh]"
        >
          {/* Ambient Purple Sparkle Glow Header */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center space-x-2.5">
              <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl text-white shadow-md shadow-indigo-600/10 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  Ledger AI Co-Pilot Summary
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">OCR Performance & Audit Report</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal scrollable workspace */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* 1. Dynamic Scorecard Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Auto value */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Auto Processed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <span className="text-xl font-extrabold text-slate-800 font-mono">
                    ${totalAutoProcessedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {autoPercent}% of transactions ({autoProcessedInvoices.length} rows) require zero manual correction.
                  </p>
                </div>
              </div>

              {/* User corrected */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">User Corrected</span>
                  <PenTool className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <span className="text-xl font-extrabold text-slate-800 font-mono">
                    {modifiedInvoices.length}
                    <span className="text-xs font-normal text-slate-400 ml-1">rows</span>
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Feedback has been logged directly to train the custom OCR templates with verified edits.
                  </p>
                </div>
              </div>

              {/* Total Approved */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Total Validated</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <span className="text-xl font-extrabold text-slate-800 font-mono">
                    {verifiedInvoices.length}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ {totalInvoicesCount}</span>
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {pendingInvoices.length} transactions remain pending audit & manual validation.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. visual breakdown of cost allocation */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileBarChart className="w-4.5 h-4.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Ledger Spending Allocation</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Grand Total: ${totalDollarValue.toFixed(2)}</span>
              </div>

              <div className="space-y-2.5">
                {categoryArray.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No category data recorded yet</p>
                ) : (
                  categoryArray.map(cat => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-600">
                        <span className="truncate">{cat.name}</span>
                        <span className="font-mono">{cat.percent}% (${cat.value.toFixed(2)})</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${cat.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. OCR Areas that need Enhancements / Audit Warnings */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-800">OCR Parsing Alert Checklist & Correction Opportunities</h4>
              </div>

              {ocrEnhancements.length === 0 ? (
                <div className="border border-slate-150 rounded-2xl p-6 text-center bg-emerald-50/20 text-emerald-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div>
                    <p className="text-xs font-bold">100% Extraction Accuracy Standard!</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">All ledger receipts have high confidence metrics, proper vendor names, and accurate classifications.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {ocrEnhancements.map((item, index) => (
                    <div 
                      key={item.invoice.id} 
                      className="border border-slate-200/90 rounded-2xl p-4 bg-white hover:border-indigo-200 transition duration-150 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                            Opportunity #{index + 1} &bull; {item.invoice.date}
                          </span>
                          <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                            {item.invoice.vendor || "Unknown Supplier"}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-lg shrink-0">
                          ${item.invoice.amount.toFixed(2)}
                        </span>
                      </div>

                      {/* Warnings List */}
                      <div className="space-y-1.5 pl-3 border-l-2 border-indigo-100">
                        {item.issues.map((issue, idx) => (
                          <div key={idx} className="text-[11px] leading-relaxed">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <span className={issue.severity === "high" ? "text-rose-500" : "text-amber-500"}>&bull;</span>
                              {issue.text}
                            </span>
                            <span className="block text-slate-400 italic text-[10px] mt-0.2">
                              Fix recommendation: {issue.recommendation}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action trigger to inspect the row directly */}
                      {onSelectInvoiceForView && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              onSelectInvoiceForView(item.invoice);
                              onClose();
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Inspect & Verify Row</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Action Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold font-mono">Generated dynamic ledger diagnostics</span>
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
            >
              Close Co-Pilot Report
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
