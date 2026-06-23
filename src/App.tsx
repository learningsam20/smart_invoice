/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Receipt, Sparkles, FolderOpen, AlertTriangle, BookOpen, Clock, 
  RefreshCw, CheckCircle, Smartphone, Send, Database, HelpCircle 
} from "lucide-react";
import { User, Invoice, AppConfig } from "./types";
import Navbar from "./components/Navbar";
import AuthCard from "./components/AuthCard";
import InvoiceUpload from "./components/InvoiceUpload";
import InvoiceTable from "./components/InvoiceTable";
import DashboardStats from "./components/DashboardStats";
import AiInsightsModal from "./components/AiInsightsModal";
import { api } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [activePreviewInvoiceId, setActivePreviewInvoiceId] = useState<string | null>(null);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);

  // Dark/Light Theme configuration state
  const [theme, setTheme] = useState<"light" | "dark">((): "light" | "dark" => {
    const saved = localStorage.getItem("smart_ledger_theme");
    if (saved === "dark" || saved === "light") return saved;
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("smart_ledger_theme", theme);
  }, [theme]);

  // 1. Fetch backend configuration status
  const fetchConfig = async () => {
    try {
      const data = await api.fetchConfig();
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch server config:", err);
    }
  };

  // 2. Fetch invoice transaction history for authenticated user
  const fetchInvoices = async (userId: string) => {
    setRefreshing(true);
    try {
      const data = await api.fetchInvoices(userId);
      setInvoices(data);
    } catch (err) {
      console.error("Failed to load invoice history:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize app on mount
  useEffect(() => {
    const initApp = async () => {
      await fetchConfig();
      
      // Look for demo or saved user sessions in client state
      const savedUser = localStorage.getItem("smart_ledger_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          const data = await api.fetchInvoices(parsed.id);
          setInvoices(data);
        } catch {
          localStorage.removeItem("smart_ledger_user");
        }
      }
      setLoading(false);
    };

    initApp();
  }, []);

  // Handle Auth success callback
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem("smart_ledger_user", JSON.stringify(authenticatedUser));
    fetchInvoices(authenticatedUser.id);
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setInvoices([]);
    localStorage.removeItem("smart_ledger_user");
  };

  // Handle parsed invoice updates
  const handleInvoiceParsed = async (newInvoice: Invoice, replaceExistingId?: string | null) => {
    if (replaceExistingId && user) {
      // Optimistically remove duplicate from state list
      setInvoices(prev => prev.filter(inv => inv.id !== replaceExistingId));
      try {
        await api.deleteInvoice(replaceExistingId, user.id);
      } catch (err) {
        console.error("Error removing old duplicate ledger item:", err);
      }
    }
    setInvoices(prev => [newInvoice, ...prev]);
  };

  // Delete invoice handler
  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    
    // Optimistic state updates
    const origInvoices = [...invoices];
    setInvoices(prev => prev.filter(inv => inv.id !== id));

    try {
      await api.deleteInvoice(id, user.id);
    } catch (err) {
      console.error("Error deleting transaction row:", err);
      // Revert optimistic update
      setInvoices(origInvoices);
    }
  };

  // Toggle invoice validation status handler
  const handleToggleValidateInvoice = async (id: string, validated: boolean) => {
    if (!user) return;
    
    const validatedAt = validated ? new Date().toISOString() : null;
    const status = validated ? "validated" : "pending";
    
    // Optimistic state updates
    const origInvoices = [...invoices];
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, validated_by_user: validated, validated_at: validatedAt, status } : inv));

    try {
      await api.updateInvoiceValidation(id, user.id, validated, validatedAt);
    } catch (err) {
      console.error("Error updating transaction validation:", err);
      // Revert optimistic update
      setInvoices(origInvoices);
    }
  };

  // Update invoice (edits and user feedback) handler
  const handleUpdateInvoice = async (id: string, updatedFields: Partial<Invoice>) => {
    if (!user) return;

    // Optimistic state updates
    const origInvoices = [...invoices];
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updatedFields } : inv));

    try {
      await api.updateInvoice(id, user.id, updatedFields);
    } catch (err) {
      console.error("Error updating transaction:", err);
      // Revert optimistic update
      setInvoices(origInvoices);
    }
  };

  // Render generic startup loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl flex flex-col items-center space-y-4 max-w-xs text-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-100 rounded-full border-t-indigo-600 animate-spin"></div>
            <Receipt className="w-5 h-5 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Smart Receipt Ledger</h3>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">Booting secure bookkeeping workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-between transition-colors duration-200">
      {/* 1. Header Navigation */}
      <Navbar 
        user={user} 
        config={config} 
        onLogout={handleLogout} 
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === "light" ? "dark" : "light")}
      />

      {/* 2. Main Visual Canvas */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {!user ? (
            /* Unauthenticated state: Login view */
            <motion.div
              key="auth-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex items-center justify-center py-10"
            >
              <AuthCard onAuthSuccess={handleAuthSuccess} config={config} />
            </motion.div>
          ) : (
            /* Authenticated state: Multi-panel Dashboard */
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Sandbox Alert Notice if not yet persistent */}
              {config && !config.supabaseConfigured && (
                <div id="sandbox-alert" className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/45 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between text-xs space-y-3.5 md:space-y-0">
                  <div className="flex items-start space-x-3 text-amber-900 dark:text-amber-200 leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-950 dark:text-amber-100">Database Running in Temporary Sandbox Mode</p>
                      <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                        Extracted values are saved in temporary container memory. Connect Supabase inside AI Studio Secrets to persist ledger rows securely.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfigGuide(!showConfigGuide)}
                    className="self-start md:self-auto bg-amber-600 hover:bg-amber-700 duration-150 text-white font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer shadow-sm"
                  >
                    {showConfigGuide ? "Hide Setup Instructions" : "View SQL Setup Guide"}
                  </button>
                </div>
              )}

              {/* Table Missing Alert Notice (Supabase Connected but tableName 'invoices' not present in database schema) */}
              {config && config.supabaseConfigured && config.isTableMissing && (
                <div id="table-missing-alert" className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between text-xs space-y-3.5 md:space-y-0 shadow-xs">
                  <div className="flex items-start space-x-3 text-rose-950 dark:text-rose-200 leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-extrabold text-rose-700 dark:text-rose-300">⚠️ Supabase Connected but 'invoices' Table is Missing!</p>
                      <p className="text-rose-800/90 dark:text-rose-400 mt-1">
                        We detected that your Supabase credentials are valid, but the database schema doesn't have the <code className="font-mono bg-rose-100 dark:bg-rose-900 px-1 py-0.5 rounded text-rose-900 dark:text-rose-200 font-semibold">'invoices'</code> table yet. 
                        Please open your Supabase SQL Editor and execute the migration script below to resolve this error!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfigGuide(true)}
                    className="self-start md:self-auto bg-rose-600 hover:bg-rose-700 duration-150 text-white font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Show Migration Script
                  </button>
                </div>
              )}

              {/* Collapsible Supabase Setup Instructions */}
              <AnimatePresence>
                {showConfigGuide && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-bold text-[10px] text-slate-800 uppercase tracking-wider">
                          Official Supabase SQL Migration script
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        To activate real cloud persistence, log into your Supabase Console, open the SQL Editor of your project, and run the query below to create the required ledger schema. If you already created it and still see a "not found in schema cache" error, run the <code className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-semibold">NOTIFY</code> command at the bottom to refresh the cache instantly!
                      </p>
                      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] overflow-x-auto border border-slate-950 font-sans">
                        <pre className="font-mono">{`-- Create Invoices and Receipts History Ledger table (Full schema)
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parsed_datetime TIMESTAMPTZ DEFAULT now(),
  amount NUMERIC(12,2) NOT NULL,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  confidence_score INTEGER NOT NULL,
  invoice_preview TEXT,
  validated_by_user BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  user_feedback TEXT,
  status TEXT DEFAULT 'pending'
);

-- MIGRATION: If you already have the invoices table, run this instead to add columns:
-- ALTER TABLE invoices ADD COLUMN validated_by_user BOOLEAN DEFAULT false;
-- ALTER TABLE invoices ADD COLUMN validated_at TIMESTAMPTZ;
-- ALTER TABLE invoices ADD COLUMN user_feedback TEXT;
-- ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'pending';

-- Optional Row Level Security Configuration:
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full control" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public inserts" ON invoices
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- FORCE SCHEMA CACHE TO REFRESH IMMEDIATELY (Highly Recommended):
NOTIFY pgrst, 'reload schema';`}</pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Panel 1: Analytics counters */}
              <DashboardStats 
                invoices={invoices} 
                onOpenAiInsights={() => setIsAiInsightsOpen(true)} 
              />

              {/* Panel 2: Ledger and Actions Workspace Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Handlers side block */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Upload document card */}
                  <div className="h-full">
                    <InvoiceUpload 
                      userId={user.id} 
                      onInvoiceParsed={handleInvoiceParsed} 
                      existingInvoices={invoices} 
                    />
                  </div>

                  {/* Frequently Asked help widget */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm transition-colors duration-200">
                    <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                      <h4 className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Bookkeeping Instructions
                      </h4>
                    </div>
                    
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-3 list-inside list-disc leading-relaxed">
                      <li>
                        Upload regular digital receipt images or invoices. Gemini transcribes standard fields automatically.
                      </li>
                      <li>
                        For email receipt fragments, switch to the text tab and paste the raw payload.
                      </li>
                      <li>
                        Hover or click <span className="font-semibold text-indigo-600 dark:text-indigo-400">Preview</span> in the records table to double-check matched fields or inspect attachments.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Ledger table side block */}
                <div className="lg:col-span-8 h-full">
                  <div className="relative">
                    <InvoiceTable 
                      invoices={invoices} 
                      onDeleteInvoice={handleDeleteInvoice} 
                      onToggleValidateInvoice={handleToggleValidateInvoice} 
                      onUpdateInvoice={handleUpdateInvoice}
                      activePreviewInvoiceId={activePreviewInvoiceId}
                      onSetActivePreviewInvoiceId={setActivePreviewInvoiceId}
                    />
                    
                    {refreshing && (
                      <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-white/95 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                        <span className="text-[10px] font-bold text-slate-500">Refreshing records...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Co-Pilot insights and OCR corrections diagnostic modal */}
              <AiInsightsModal 
                isOpen={isAiInsightsOpen}
                onClose={() => setIsAiInsightsOpen(false)}
                invoices={invoices}
                onSelectInvoiceForView={(inv) => setActivePreviewInvoiceId(inv.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Footer Copyright Credits */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-850 py-6 mt-12 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-sans">
          <p>© 2026 Smart Receipt Ledger. Built with Gemini OCR and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}

