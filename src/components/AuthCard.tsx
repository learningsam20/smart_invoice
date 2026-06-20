import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import { AppConfig } from "../types";

interface AuthCardProps {
  onAuthSuccess: (user: { id: string; email: string }) => void;
  config: AppConfig | null;
}

export default function AuthCard({ onAuthSuccess, config }: AuthCardProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.message) {
        setInfoMessage(data.message);
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setEmail("neha@company.com");
    setPassword("password123");
    setIsLogin(true);
    setError(null);
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Top Banner styled with our gorgeous deep indigo color palette */}
      <div className="bg-indigo-900 px-6 py-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-800 rounded-full translate-x-12 -translate-y-12 opacity-40 blur-md"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-950 rounded-full opacity-30 blur-sm"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md mb-3 border border-white/10">
            <Sparkles className="w-6 h-6 text-indigo-200" />
          </div>
          <h2 className="font-sans font-bold tracking-tight text-2xl">LedgeAI Workspace</h2>
          <p className="text-indigo-200 text-xs mt-1.5 max-w-xs leading-relaxed">
            Let AI automatically extract details, assign categories, and update your ledgers.
          </p>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="p-6 sm:p-8 bg-white">
        {/* Tab Selection */}
        <div className="flex bg-slate-50 p-1 rounded-xl mb-6 border border-slate-200">
          <button
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg duration-150 flex items-center justify-center space-x-1.5 cursor-pointer ${
              isLogin ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Workspace</span>
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg duration-150 flex items-center justify-center space-x-1.5 cursor-pointer ${
              !isLogin ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Account</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start space-x-2 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-5 flex items-start space-x-2 bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-xs">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="neha@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Secret Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 disabled:bg-slate-400 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Verify Credentials</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create New Account</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Quick Demo Helper */}
        <div className="mt-6 border-t border-slate-150 pt-5 text-center">
          <p className="text-[11px] text-slate-500 mb-2.5">💡 Need a quick trial account?</p>
          <button
            onClick={handleQuickLogin}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Launch with Demo Access</span>
          </button>
        </div>

        {/* Connection Notice */}
        {config && (
          <div className="mt-5 text-[10px] text-center text-slate-400 border-t border-slate-100 pt-4 px-2 leading-relaxed">
            {config.supabaseConfigured ? (
              <span className="text-emerald-600 font-bold">🛡️ Secure Supabase Server Active</span>
            ) : (
              <span>
                🔧 No Keys setup yet. App running in Sandbox Mode. You can paste secrets into
                AI Studio Settings to persist to your own databases!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
