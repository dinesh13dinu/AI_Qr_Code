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
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .rpc("login_access_user", {
      input_username: username,
      input_password: password,
    })
    .maybeSingle();

  if (error) throw error;
  return (data as AccessUser | null) ?? null;
}

export async function logoutAccessUser() {
  if (!supabase) return;

  try {
    await supabase.rpc("logout_access_user", {
      input_session_token: getSessionToken(),
    });
  } catch {
    // The local session is cleared by the caller even if the server session already expired.
  }
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("list_access_users", {
    input_session_token: getSessionToken(),
  });

  if (error) throw error;
  return (data ?? []) as AccessUser[];
}

export function getCurrentAccessUser(): AccessUser | null {
  const rawSession = window.localStorage.getItem("ai_qr_admin_session");
  if (!rawSession || rawSession === "active") return null;

  try {
    const session = JSON.parse(rawSession) as AccessUser;
    if (!session.session_token) return null;
    if (session.session_expires_at && new Date(session.session_expires_at).getTime() <= Date.now()) {
      window.localStorage.removeItem("ai_qr_admin_session");
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function createAccessUser(input: CreateAccessUserInput): Promise<AccessUser> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .rpc("create_access_user", {
      input_session_token: getSessionToken(),
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

  const { data, error } = await supabase.rpc("list_admin_merchants", {
    input_session_token: getSessionToken(),
  });

  if (error) throw error;
  return (data ?? []) as MerchantWithStats[];
}

export async function createMerchant(input: CreateMerchantInput) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .rpc("create_admin_merchant", {
      input_session_token: getSessionToken(),
      input_name: input.name,
      input_slug: input.slug,
      input_location: input.location || null,
      input_app_name: input.appName || null,
      input_destination_type: input.destinationType,
      input_ios_url: input.iosUrl || null,
      input_android_url: input.androidUrl || null,
      input_fallback_url: input.fallbackUrl || null,
      input_appsflyer_url: input.appsflyerUrl || null,
      input_appsflyer_pid: input.appsflyerPid || null,
      input_campaign: input.campaign,
      input_payout_amount: input.payoutAmount ? Number(input.payoutAmount) : null,
      input_payout_currency: input.payoutAmount ? input.payoutCurrency : null,
      input_is_active: input.isActive,
      input_notes: input.notes || null,
    })
    .single();

  if (error) throw error;
  return data as Merchant;
}

export async function updateMerchant(input: CreateMerchantInput & { id: string }) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .rpc("update_admin_merchant", {
      input_session_token: getSessionToken(),
      input_id: input.id,
      input_name: input.name,
      input_slug: input.slug,
      input_location: input.location || null,
      input_app_name: input.appName || null,
      input_destination_type: input.destinationType,
      input_ios_url: input.iosUrl || null,
      input_android_url: input.androidUrl || null,
      input_fallback_url: input.fallbackUrl || null,
      input_appsflyer_url: input.appsflyerUrl || null,
      input_appsflyer_pid: input.appsflyerPid || null,
      input_campaign: input.campaign,
      input_payout_amount: input.payoutAmount ? Number(input.payoutAmount) : null,
      input_payout_currency: input.payoutAmount ? input.payoutCurrency : null,
      input_is_active: input.isActive,
      input_notes: input.notes || null,
    })
    .single();

  if (error) throw error;
  return data as Merchant;
}

export async function deleteMerchant(id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.rpc("delete_admin_merchant", {
    input_session_token: getSessionToken(),
    input_id: id,
  });

  if (error) throw error;
}

export async function getMerchantBySlug(slug: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc("get_public_merchant_by_slug", {
      input_slug: slug,
    })
    .maybeSingle();

  if (error) return null;
  return data as Merchant;
}

export async function logScan(merchantId: string, deviceType: string) {
  if (!supabase) return;

  await supabase.rpc("log_public_scan", {
    input_merchant_id: merchantId,
    input_device_type: deviceType,
    input_user_agent: window.navigator.userAgent,
    input_referrer: document.referrer || null,
  });
}

function getSessionToken() {
  const rawSession = window.localStorage.getItem("ai_qr_admin_session");
  if (!rawSession) throw new Error("Please log out and log in again.");

  try {
    const session = JSON.parse(rawSession) as AccessUser;
    if (!session.session_token) {
      window.localStorage.removeItem("ai_qr_admin_session");
      window.location.reload();
      throw new Error("Please log in again.");
    }
    if (session.session_expires_at && new Date(session.session_expires_at).getTime() <= Date.now()) {
      window.localStorage.removeItem("ai_qr_admin_session");
      throw new Error("Session expired. Please log in again.");
    }
    return session.session_token;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Please log in again.");
  }
}
