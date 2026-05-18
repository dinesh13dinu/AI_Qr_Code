import type { Merchant } from "./supabase";

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

export function getPublicBaseUrl() {
  return window.location.origin;
}

export function getQrUrl(slug: string) {
  return `${getPublicBaseUrl()}/m/${slug}`;
}

export function detectDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/macintosh|windows|linux/.test(ua)) return "desktop";

  return "unknown";
}

export function addTrackingParams(baseUrl: string, campaign: string, merchantSlug: string, pid?: string | null) {
  const url = new URL(baseUrl);

  if (pid && !url.searchParams.get("pid")) {
    url.searchParams.set("pid", pid);
  }

  if (!url.searchParams.get("c")) {
    url.searchParams.set("c", campaign);
  }

  if (!url.searchParams.get("af_sub1")) {
    url.searchParams.set("af_sub1", merchantSlug);
  }

  return url.toString();
}

export function getMerchantDestination(merchant: Merchant, deviceType: string) {
  if (merchant.destination_type === "appsflyer" && merchant.appsflyer_url) {
    return addTrackingParams(
      merchant.appsflyer_url,
      merchant.campaign,
      merchant.slug,
      merchant.appsflyer_pid,
    );
  }

  if (deviceType === "ios" && merchant.ios_url) return merchant.ios_url;
  if (deviceType === "android" && merchant.android_url) return merchant.android_url;

  return merchant.fallback_url || merchant.ios_url || merchant.android_url || merchant.appsflyer_url || "";
}
