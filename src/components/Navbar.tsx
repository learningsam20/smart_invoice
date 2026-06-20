import { LogOut, Database, Cpu, Receipt, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";
import { User, AppConfig } from "../types";

interface NavbarProps {
  user: User | null;
  config: AppConfig | null;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Navbar({ user, config, onLogout, theme, onToggleTheme }: NavbarProps) {
  // Get neat initials from user email for avatar
  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "US";
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand matching LedgeAI sleek look */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/10">
              S
            </div>
            <div>
              <div className="flex items-center space-x-1.5 font-sans">
                <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">Smart Receipt Ledger</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-medium font-sans">AI OCR</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Automated Ledger Assistant
              </p>
            </div>
          </div>

          {/* Indicators & User Action */}
          <div className="flex items-center space-x-4">
            {/* Supabase Status Indicator */}
            {config && (
              <div
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
                  config.supabaseConfigured
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40"
                    : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                }`}
                title={
                  config.supabaseConfigured
                    ? `Connected to Supabase at ${config.supabaseUrl}`
                    : "Running in Offline fallbacks with memory database"
                }
              >
                <div className={`w-1.5 h-1.5 rounded-full ${config.supabaseConfigured ? "bg-emerald-500" : "bg-amber-500"}`}></div>
                <span>{config.supabaseConfigured ? "Supabase Connected" : "Sandbox Mode"}</span>
              </div>
            )}

            {/* Gemini Status Indicator */}
            {config && (
              <div
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
                  config.geminiConfigured
                    ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40"
                    : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                }`}
                title={
                  config.geminiConfigured
                    ? "Gemini 3.5 Flash Active"
                    : "Gemini Key Missing (Using template fallback OCR)"
                }
              >
                <div className={`w-1.5 h-1.5 rounded-full ${config.geminiConfigured ? "bg-indigo-500" : "bg-amber-500"}`}></div>
                <span>{config.geminiConfigured ? "Gemini OCR" : "Gemini Off"}</span>
              </div>
            )}

            {/* Theme Toggle Button (Supports any user status) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleTheme}
              className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 duration-150 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center"
              title={`Switch to ${theme === "light" ? "Dark Mode" : "Light Mode"}`}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </motion.button>

            {user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Finance Team</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[130px] truncate leading-tight">
                    {user.email}
                  </p>
                </div>
                {/* Visual Avatar from Design layout */}
                <div className="w-10 h-10 rounded-full bg-indigo-150 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-850 flex items-center justify-center text-indigo-700 dark:text-indigo-350 font-semibold text-sm">
                  {getInitials(user.email)}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onLogout}
                  className="bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 duration-150 p-2 rounded-xl border border-slate-200 dark:border-slate-750 cursor-pointer"
                  title="Sign out of Ledger"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

