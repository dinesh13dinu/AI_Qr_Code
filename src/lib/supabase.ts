import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export type Merchant = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  appsflyer_url: string;
  campaign: string;
  notes: string | null;
  created_at: string;
};

export type ScanEvent = {
  id: string;
  merchant_id: string;
  device_type: "ios" | "android" | "desktop" | "unknown";
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
};

export type MerchantWithStats = Merchant & {
  scans: number;
  last_scan_at: string | null;
};
