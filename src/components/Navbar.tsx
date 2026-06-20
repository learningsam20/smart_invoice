import { LogOut, Database, Cpu, Receipt } from "lucide-react";
import { motion } from "motion/react";
import { User, AppConfig } from "../types";

interface NavbarProps {
  user: User | null;
  config: AppConfig | null;
  onLogout: () => void;
}

export default function Navbar({ user, config, onLogout }: NavbarProps) {
  // Get neat initials from user email for avatar
  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "US";
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand matching LedgeAI sleek look */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-800">LedgeAI</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">Smart Ledger</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                Neha&apos;s Bookkeeping Assistant
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
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
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
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
                title={
                  config.geminiConfigured
                    ? "Gemini 3.5 Flash Active"
                    : "Gemini Key Missing (Using template fallback OCR)"
                }
              >
                <div className={`w-1.5 h-1.5 rounded-full ${config.geminiConfigured ? "bg-indigo-500" : "bg-amber-500"}`}></div>
                <span>{config.geminiConfigured ? "Gemini GPT-OCR" : "Gemini Off"}</span>
              </div>
            )}

            {user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Neha's Team</p>
                  <p className="text-sm font-semibold text-slate-700 max-w-[130px] truncate leading-tight">
                    {user.email}
                  </p>
                </div>
                {/* Visual Avatar from Design layout */}
                <div className="w-10 h-10 rounded-full bg-indigo-150 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                  {getInitials(user.email)}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onLogout}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 duration-150 p-2 rounded-xl border border-slate-200 cursor-pointer"
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
