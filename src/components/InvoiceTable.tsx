import { useState, useMemo, useEffect } from "react";
import { 
  Search, ArrowUpDown, Filter, Eye, Trash2, Calendar, Tags, DollarSign, 
  ShieldAlert, ShieldCheck, X, FileText, CheckCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Invoice } from "../types";

interface InvoiceTableProps {
  invoices: Invoice[];
  onDeleteInvoice: (id: string) => void;
}

type SortField = "date" | "amount" | "vendor" | "confidence";
type SortOrder = "asc" | "desc";

export default function InvoiceTable({ invoices, onDeleteInvoice }: InvoiceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedConfidenceRange, setSelectedConfidenceRange] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activePreviewInvoice, setActivePreviewInvoice] = useState<Invoice | null>(null);

  // Close preview with Escape key when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePreviewInvoice(null);
      }
    };

    if (activePreviewInvoice) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePreviewInvoice]);

  // Get distinct categories in invoices list for filter options
  const categories = useMemo(() => {
    const list = invoices.map(inv => inv.category);
    return ["all", ...Array.from(new Set(list))];
  }, [invoices]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Perform search, filter, and sorting
  const processedInvoices = useMemo(() => {
    let result = [...invoices];

    // 1. Search Query filter (matches vendor, file_name, date, category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        inv =>
          inv.vendor.toLowerCase().includes(query) ||
          inv.category.toLowerCase().includes(query) ||
          inv.file_name.toLowerCase().includes(query) ||
          inv.date.includes(query)
      );
    }

    // 2. Category Filter
    if (selectedCategory !== "all") {
      result = result.filter(inv => inv.category === selectedCategory);
    }

    // 3. Confidence range filter
    if (selectedConfidenceRange !== "all") {
      if (selectedConfidenceRange === "high") {
        result = result.filter(inv => inv.confidence_score >= 90);
      } else if (selectedConfidenceRange === "mid") {
        result = result.filter(inv => inv.confidence_score >= 70 && inv.confidence_score < 90);
      } else if (selectedConfidenceRange === "low") {
        result = result.filter(inv => inv.confidence_score < 70);
      }
    }

    // 4. Sort Order
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      } else if (sortField === "vendor") {
        comparison = a.vendor.localeCompare(b.vendor);
      } else if (sortField === "confidence") {
        comparison = a.confidence_score - b.confidence_score;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [invoices, searchQuery, selectedCategory, selectedConfidenceRange, sortField, sortOrder]);

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      });
    } catch {
      return dateStr;
    }
  };

  // Helper for parsing datetime displaying
  const formatParseDatetime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Title and Filters - Styled to match Sleek design */}
      <div className="p-5 border-b border-slate-150 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3.5 md:space-y-0">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">
              Recent Ledger Transactions
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify extracted records, dates, categories, and totals below.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Search bar matching design markup */}
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor, file..."
                className="w-full sm:w-56 pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400 pointer-events-none">
                <Filter className="w-3.5 h-3.5" />
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Category: All</option>
                {categories.filter(c => c !== "all").map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Confidence Filter */}
            <select
              value={selectedConfidenceRange}
              onChange={(e) => setSelectedConfidenceRange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Confidence: All</option>
              <option value="high">High (&ge;90%)</option>
              <option value="mid">Mid (70% - 89%)</option>
              <option value="low">Low (&lt;70%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto">
        {processedInvoices.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white">
            <div className="bg-slate-100 text-slate-400 p-3 rounded-full inline-block mb-3 border border-slate-200">
              <FileText className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-xs font-semibold text-slate-700">No matching records found</h3>
            <p className="text-[11px] text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {invoices.length === 0 
                ? "This ledger is empty. Upload or drop invoice attachments or paste transaction message headers above!" 
                : "Try adjusting your query keywords or specific list filter configuration."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                <th className="py-3 px-6 cursor-pointer hover:text-slate-800" onClick={() => handleSort("vendor")}>
                  <div className="flex items-center space-x-1">
                    <span>Vendor & Source</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort("date")}>
                  <div className="flex items-center space-x-1">
                    <span>Invoice Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleSort("amount")}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-6 cursor-pointer hover:text-slate-800" onClick={() => handleSort("confidence")}>
                  <div className="flex items-center space-x-1 justify-center">
                    <span>Confidence</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Receipt Source</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
              {processedInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition duration-150">
                  {/* Vendor column */}
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900 leading-normal">{inv.vendor}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] truncate" title={inv.file_name}>
                      📄 {inv.file_name}
                    </div>
                  </td>
                  {/* Date column */}
                  <td className="py-4 px-4">
                    <div className="text-slate-700 font-medium">{formatDate(inv.date)}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Uploaded {formatParseDatetime(inv.parsed_datetime)}
                    </div>
                  </td>
                  {/* Category column with styled badge */}
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-semibold">
                      {inv.category}
                    </span>
                  </td>
                  {/* Amount column */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {/* Sleek Progress-bar Confidence of Receipt theme */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                        <div 
                          className={`h-full rounded-full ${
                            inv.confidence_score >= 90 
                              ? "bg-emerald-500" 
                              : inv.confidence_score >= 75 
                              ? "bg-indigo-500" 
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${inv.confidence_score}%` }}
                        ></div>
                      </div>
                      <span className={`text-[10px] font-bold shrink-0 ${
                        inv.confidence_score >= 90 
                          ? "text-emerald-600" 
                          : inv.confidence_score >= 75 
                          ? "text-indigo-600" 
                          : "text-amber-600"
                      }`}>
                        {inv.confidence_score}%
                      </span>
                    </div>
                  </td>
                  {/* Preview cell */}
                  <td className="py-4 px-4 text-center">
                    {inv.invoice_preview ? (
                      <button
                        onClick={() => setActivePreviewInvoice(inv)}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono italic">Pasted Text</span>
                    )}
                  </td>
                  {/* Action cell */}
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onDeleteInvoice(inv.id)}
                      className="text-slate-400 hover:text-rose-600 duration-150 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Prune this invoice row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over or Modal Preview Box with Sleek theme */}
      <AnimatePresence>
        {activePreviewInvoice && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-widest font-sans">
                    Invoice Audit View
                  </span>
                </div>
                <button
                  onClick={() => setActivePreviewInvoice(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Merchant Vendor</span>
                    <span className="text-sm font-bold text-slate-900">{activePreviewInvoice.vendor}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Charged</span>
                    <span className="text-sm font-mono font-bold text-indigo-600">${activePreviewInvoice.amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">OCR Trust</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{activePreviewInvoice.confidence_score}%</span>
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Ledger Category</span>
                    <span className="inline-block bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded text-[10px] mt-0.5">
                      {activePreviewInvoice.category}
                    </span>
                  </div>
                </div>

                {/* Actual Visual Preview */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Physical receipt screenshot</span>
                  <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-2 flex items-center justify-center max-h-64 overflow-y-auto">
                    {activePreviewInvoice.invoice_preview?.startsWith("data:image/svg+xml") ? (
                      // Display dynamic visual vector mockup
                      <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(activePreviewInvoice.invoice_preview.split(",")[1] || "") }} className="w-32 h-32" />
                    ) : activePreviewInvoice.invoice_preview?.startsWith("data:application/pdf") ? (
                      <div className="text-center py-8">
                        <FileText className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                        <span className="text-xs text-slate-600">Attached PDF Invoice loaded</span>
                      </div>
                    ) : activePreviewInvoice.invoice_preview ? (
                      // Display uploaded base64 receipt
                      <img
                        src={activePreviewInvoice.invoice_preview}
                        alt="Receipt Scan"
                        className="max-w-full rounded-lg object-contain border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center py-6 text-slate-400 italic text-xs">
                        No image visual present (Pasted raw text)
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-150">
                  <p>📁 Original filename: <span className="font-mono text-slate-550">{activePreviewInvoice.file_name}</span></p>
                  <p>👤 Unique user token: <span className="font-mono text-slate-550">{activePreviewInvoice.user_id}</span></p>
                  <p>📅 Ledger entry datetime: <span className="font-mono text-slate-550">{new Date(activePreviewInvoice.parsed_datetime).toLocaleString()}</span></p>
                </div>
              </div>

              {/* Modal Action Footer matching the Sleek layout */}
              <div className="bg-slate-50 px-5 py-4 border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setActivePreviewInvoice(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
                >
                  Close & Approve Row
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
