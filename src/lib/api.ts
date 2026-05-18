import { supabase } from "./supabase";
import type { Merchant, MerchantWithStats } from "./supabase";

type CreateMerchantInput = {
  name: string;
  slug: string;
  location: string;
  appsflyerUrl: string;
  campaign: string;
  notes: string;
};

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
      appsflyer_url: input.appsflyerUrl,
      campaign: input.campaign,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Merchant;
}

export async function getMerchantBySlug(slug: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("slug", slug)
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
