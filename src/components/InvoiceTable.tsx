import { useState, useMemo, useEffect } from "react";
import { 
  Search, ArrowUpDown, Filter, Eye, Trash2, Calendar, Tags, DollarSign, 
  ShieldAlert, ShieldCheck, X, FileText, CheckCircle, Pencil, MessageSquare, Check, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Invoice } from "../types";

interface InvoiceTableProps {
  invoices: Invoice[];
  onDeleteInvoice: (id: string) => void;
  onToggleValidateInvoice: (id: string, validated: boolean) => void;
  onUpdateInvoice: (id: string, updatedFields: Partial<Invoice>) => void;
  activePreviewInvoiceId?: string | null;
  onSetActivePreviewInvoiceId?: (id: string | null) => void;
}

type SortField = "date" | "amount" | "vendor" | "confidence";
type SortOrder = "asc" | "desc";

export default function InvoiceTable({ 
  invoices, 
  onDeleteInvoice, 
  onToggleValidateInvoice, 
  onUpdateInvoice,
  activePreviewInvoiceId,
  onSetActivePreviewInvoiceId
}: InvoiceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedConfidenceRange, setSelectedConfidenceRange] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Shared preview state
  const activePreviewInvoice = useMemo(() => {
    if (!activePreviewInvoiceId) return null;
    return invoices.find(inv => inv.id === activePreviewInvoiceId) || null;
  }, [activePreviewInvoiceId, invoices]);

  const setActivePreviewInvoice = (inv: Invoice | null) => {
    if (onSetActivePreviewInvoiceId) {
      onSetActivePreviewInvoiceId(inv ? inv.id : null);
    }
  };

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // States for user corrections & notes
  const [isEditing, setIsEditing] = useState(false);
  const [editVendor, setEditVendor] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFeedback, setEditFeedback] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination on query or configurations adjustments
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedConfidenceRange, sortField, sortOrder, pageSize]);

  // Pre-populate input states when modal is toggled active
  useEffect(() => {
    if (activePreviewInvoice) {
      setEditVendor(activePreviewInvoice.vendor || "");
      setEditAmount(activePreviewInvoice.amount || 0);
      setEditCategory(activePreviewInvoice.category || "");
      setEditDate(activePreviewInvoice.date || "");
      setEditFeedback(activePreviewInvoice.user_feedback || "");
      setIsEditing(false);
    }
  }, [activePreviewInvoice]);

  useEffect(() => {
    if (activePreviewInvoice && activePreviewInvoice.invoice_preview?.startsWith("data:application/pdf")) {
      try {
        const parts = activePreviewInvoice.invoice_preview.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "application/pdf";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        setPdfUrl(blobUrl);

        return () => {
          URL.revokeObjectURL(blobUrl);
          setPdfUrl(null);
        };
      } catch (err) {
        console.error("Failed to generate PDF Blob Object URL:", err);
        setPdfUrl(activePreviewInvoice.invoice_preview);
      }
    } else {
      setPdfUrl(null);
    }
  }, [activePreviewInvoice]);

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

  // Save modified invoice details & user feedback text
  const handleSaveEdits = () => {
    if (!activePreviewInvoice) return;
    
    const parsedAmount = parseFloat(editAmount as any);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const isModified = 
      editVendor !== activePreviewInvoice.vendor ||
      parsedAmount !== activePreviewInvoice.amount ||
      editCategory !== activePreviewInvoice.category ||
      editDate !== activePreviewInvoice.date ||
      editFeedback !== (activePreviewInvoice.user_feedback || "");

    const fields: Partial<Invoice> = {
      vendor: editVendor,
      amount: parsedAmount,
      category: editCategory,
      date: editDate,
      user_feedback: editFeedback,
      validated_by_user: true,
      validated_at: new Date().toISOString(),
      status: isModified ? "user_modified" : "validated"
    };

    onUpdateInvoice(activePreviewInvoice.id, fields);
    
    // Optimistic state sync for current visual modal view
    const updatedInvoice = { ...activePreviewInvoice, ...fields };
    setActivePreviewInvoice(updatedInvoice);
    setIsEditing(false);
  };

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

  // Derived settings and boundaries for pagination
  const totalPages = Math.max(1, Math.ceil(processedInvoices.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedInvoices = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return processedInvoices.slice(startIndex, startIndex + pageSize);
  }, [processedInvoices, safeCurrentPage, pageSize]);

  const startIndex = (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, processedInvoices.length);

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
                <th className="py-3 px-4 text-center">Verified</th>
                <th className="py-3 px-4 text-center">Receipt Source</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
              {paginatedInvoices.map((inv) => (
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
                  {/* Verified Checkbox cell */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <label className="relative flex items-center justify-center p-0.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={!!inv.validated_by_user}
                          onChange={(e) => onToggleValidateInvoice(inv.id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </label>
                      {inv.validated_by_user ? (
                        <div className="text-[9px] text-emerald-600 font-semibold flex flex-col items-center leading-tight">
                          <span>Verified</span>
                          {inv.validated_at && (
                            <span className="text-[8px] text-slate-400 font-normal font-mono scale-90 whitespace-nowrap">
                              {new Date(inv.validated_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-mono italic">Pending</span>
                      )}
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

      {/* Pagination Footer Controls */}
      {processedInvoices.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-150 bg-slate-50/50 gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800 font-mono">{startIndex}-{endIndex}</span> of <span className="font-bold text-slate-800 font-mono">{processedInvoices.length}</span> records
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Rows per page selector */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 font-medium">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-205 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition cursor-pointer"
                title="First Page"
              >
                &laquo;
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-205 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition cursor-pointer"
              >
                Prev
              </button>

              {/* Individual page index display or indicators */}
              <div className="flex items-center px-2 text-xs font-semibold text-slate-700">
                Page <span className="mx-1 text-slate-900 font-bold font-mono">{safeCurrentPage}</span> of <span className="mx-1 text-indigo-600 font-bold font-mono">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-205 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition cursor-pointer"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-205 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition cursor-pointer"
                title="Last Page"
              >
                &raquo;
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {isEditing ? (
                  /* EDIT/CORRECTION PANEL */
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0 animate-pulse" />
                      <div>
                        <p className="font-bold">Manual Correction Mode</p>
                        <p>Correct parsed merchant details below. This will transition the record to <span className="font-semibold underline">User Modified</span>.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Merchant Vendor</label>
                        <input
                          type="text"
                          className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-indigo-600 focus:outline transition"
                          value={editVendor}
                          onChange={(e) => setEditVendor(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Total Charged</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full pl-6 text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-indigo-600 focus:outline transition"
                            value={editAmount}
                            onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Document Date</label>
                        <input
                          type="date"
                          className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-indigo-600 focus:outline transition"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Ledger Category</label>
                        <select
                          className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2 py-2 bg-slate-50 focus:bg-white focus:outline-indigo-600 focus:outline transition"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                        >
                          <option value="Meals & Entertainment">Meals & Entertainment</option>
                          <option value="Office Supplies & Software">Office Supplies & Software</option>
                          <option value="Travel & Lodging">Travel & Lodging</option>
                          <option value="Utilities & Rent">Utilities & Rent</option>
                          <option value="Professional Services">Professional Services</option>
                          <option value="Other Business Expense">Other Business Expense</option>
                        </select>
                      </div>
                    </div>

                    {/* Correction Feedback Area */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Audit Note / User Feedback</span>
                      </label>
                      <textarea
                        className="w-full h-16 text-xs text-slate-700 placeholder-slate-400 border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-indigo-600 focus:outline transition resize-none"
                        placeholder="E.g., Adjusted amount because tax tip was missing"
                        value={editFeedback}
                        onChange={(e) => setEditFeedback(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  /* STANDARD READ ONLY AUDIT PANEL */
                  <div className="space-y-4">
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
                      <div className="col-span-2">
                        <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Document Date</span>
                        <span className="text-xs font-semibold text-slate-700">{formatDate(activePreviewInvoice.date)}</span>
                      </div>

                      {activePreviewInvoice.user_feedback && (
                        <div className="col-span-2 bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                          <p className="font-bold flex items-center gap-1.2 text-[9px] uppercase tracking-wider text-indigo-700">
                            <MessageSquare className="w-3 h-3 text-indigo-600" />
                            <span>User Correction Note</span>
                          </p>
                          <p className="italic text-slate-700">"{activePreviewInvoice.user_feedback}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Status:</span>
                        {activePreviewInvoice.status === "user_modified" ? (
                          <span className="text-[9px] bg-amber-55 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full">✏️ User Modified</span>
                        ) : activePreviewInvoice.validated_by_user ? (
                          <span className="text-[9px] bg-emerald-55 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">❇️ Validated</span>
                        ) : (
                          <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 font-semibold px-2 py-0.5 rounded-full">Pending</span>
                        )}
                      </div>

                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Correct details</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Actual Visual Preview */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Physical receipt screenshot</span>
                  <div className={`border border-slate-200 rounded-xl bg-slate-50/50 p-2 flex flex-col items-center justify-center ${
                    activePreviewInvoice.invoice_preview?.startsWith("data:application/pdf") ? "w-full h-[380px]" : "max-h-64 overflow-y-auto"
                  }`}>
                    {activePreviewInvoice.invoice_preview?.startsWith("data:image/svg+xml") ? (
                      // Display dynamic visual vector mockup
                      <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(activePreviewInvoice.invoice_preview.split(",")[1] || "") }} className="w-32 h-32" />
                    ) : activePreviewInvoice.invoice_preview?.startsWith("data:application/pdf") ? (
                      <div className="w-full h-full flex flex-col justify-between">
                        {pdfUrl ? (
                          <iframe
                            src={pdfUrl}
                            className="w-full h-[330px] rounded-lg border border-slate-200"
                            title="PDF Preview"
                          />
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <span className="text-xs text-slate-500">Loading document preview...</span>
                          </div>
                        )}
                        <div className="text-center pt-1">
                          <a
                            href={pdfUrl || activePreviewInvoice.invoice_preview}
                            download={activePreviewInvoice.file_name || "invoice.pdf"}
                            className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
                          >
                            <span>Download Original PDF File</span>
                          </a>
                        </div>
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
              <div className="bg-slate-50 px-5 py-4 border-t border-slate-150 flex justify-between items-center">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="border border-slate-250 hover:bg-slate-100 text-slate-600 font-semibold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      Cancel Corrections
                    </button>
                    <button
                      onClick={handleSaveEdits}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save & Approve Ledger</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] text-slate-400 italic">
                      Press ESC to dismiss
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setActivePreviewInvoice(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Close View
                      </button>
                      {!activePreviewInvoice.validated_by_user && (
                        <button
                          onClick={() => {
                            onToggleValidateInvoice(activePreviewInvoice.id, true);
                            setActivePreviewInvoice(null);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Quick Approve Row</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
