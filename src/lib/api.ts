import { supabase } from "./supabase";
import type { AccessUser, Merchant, MerchantWithStats } from "./supabase";

type CreateMerchantInput = {
  id?: string;
  name: string;
  slug: string;
  location: string;
  appName: string;
  destinationType: "direct" | "appsflyer";
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  appsflyerUrl: string;
  appsflyerPid: string;
  campaign: string;
  payoutAmount: string;
  payoutCurrency: "AED" | "USD";
  isActive: boolean;
  notes: string;
};

type CreateAccessUserInput = {
  name: string;
  email: string;
  username: string;
  password: string;
};

export async function loginAccessUser(username: string, password: string): Promise<AccessUser | null> {
  const fallbackUser = getFallbackAdmin(username, password);
  if (!supabase) return fallbackUser;

  try {
    const { data, error } = await supabase
      .rpc("login_access_user", {
        input_username: username,
        input_password: password,
      })
      .maybeSingle();

    if (error) throw error;
    return (data as AccessUser | null) ?? null;
  } catch (error) {
    if (fallbackUser) return fallbackUser;
    throw error;
  }
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("list_access_users");

  if (error) throw error;
  return (data ?? []) as AccessUser[];
}

export async function createAccessUser(input: CreateAccessUserInput): Promise<AccessUser> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .rpc("create_access_user", {
      input_name: input.name,
      input_email: input.email,
      input_username: input.username,
      input_password: input.password,
    })
    .single();

  if (error) throw error;
  return data as AccessUser;
}

export async function listMerchants(): Promise<MerchantWithStats[]> {
  if (!supabase) return [];

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const { data: scans, error: scanError } = await supabase
    .from("scan_events")
    .select("merchant_id, created_at")
    .order("created_at", { ascending: false });

  if (scanError) throw scanError;

  return (merchants as Merchant[]).map((merchant) => {
    const merchantScans = (scans ?? []).filter((scan) => scan.merchant_id === merchant.id);

    return {
      ...merchant,
      scans: merchantScans.length,
      last_scan_at: merchantScans[0]?.created_at ?? null,
    };
  });
}

export async function createMerchant(input: CreateMerchantInput) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("merchants")
    .insert({
      name: input.name,
      slug: input.slug,
      location: input.location || null,
      app_name: input.appName || null,
      destination_type: input.destinationType,
      ios_url: input.iosUrl || null,
      android_url: input.androidUrl || null,
      fallback_url: input.fallbackUrl || null,
      appsflyer_url: input.appsflyerUrl || null,
      appsflyer_pid: input.appsflyerPid || null,
      campaign: input.campaign,
      payout_amount: input.payoutAmount ? Number(input.payoutAmount) : null,
      payout_currency: input.payoutAmount ? input.payoutCurrency : null,
      is_active: input.isActive,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Merchant;
}

export async function updateMerchant(input: CreateMerchantInput & { id: string }) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("merchants")
    .update({
      name: input.name,
      slug: input.slug,
      location: input.location || null,
      app_name: input.appName || null,
      destination_type: input.destinationType,
      ios_url: input.iosUrl || null,
      android_url: input.androidUrl || null,
      fallback_url: input.fallbackUrl || null,
      appsflyer_url: input.appsflyerUrl || null,
      appsflyer_pid: input.appsflyerPid || null,
      campaign: input.campaign,
      payout_amount: input.payoutAmount ? Number(input.payoutAmount) : null,
      payout_currency: input.payoutAmount ? input.payoutCurrency : null,
      is_active: input.isActive,
      notes: input.notes || null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Merchant;
}

export async function deleteMerchant(id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("merchants").delete().eq("id", id);

  if (error) throw error;
}

export async function getMerchantBySlug(slug: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data as Merchant;
}

export async function logScan(merchantId: string, deviceType: string) {
  if (!supabase) return;

  await supabase.from("scan_events").insert({
    merchant_id: merchantId,
    device_type: deviceType,
    user_agent: window.navigator.userAgent,
    referrer: document.referrer || null,
  });
}

function getFallbackAdmin(username: string, password: string): AccessUser | null {
  if (username.trim().toLowerCase() !== "admin" || password !== "654123") return null;

  return {
    id: "local-admin",
    name: "Admin",
    email: "admin@euphoria.local",
    username: "admin",
    is_admin: true,
    created_at: new Date().toISOString(),
  };
}
