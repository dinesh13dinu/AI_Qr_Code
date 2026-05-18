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

export function addTrackingParams(baseUrl: string, campaign: string, merchantSlug: string) {
  const url = new URL(baseUrl);

  if (!url.searchParams.get("c")) {
    url.searchParams.set("c", campaign);
  }

  if (!url.searchParams.get("af_sub1")) {
    url.searchParams.set("af_sub1", merchantSlug);
  }

  return url.toString();
}
