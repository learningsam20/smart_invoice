export interface Invoice {
  id: string;
  user_id: string;
  file_name: string;
  parsed_datetime: string;
  amount: number;
  vendor: string;
  category: string;
  date: string;
  confidence_score: number;
  invoice_preview: string | null;
  validated_by_user?: boolean;
  validated_at?: string | null;
  user_feedback?: string | null;
  status?: string | null;
}

export interface User {
  id: string;
  email: string;
}

export interface AppConfig {
  supabaseConfigured: boolean;
  supabaseUrl: string;
  geminiConfigured: boolean;
  mode: "production" | "offline-fallback";
  isTableMissing?: boolean;
  tableErrorMessage?: string;
}
