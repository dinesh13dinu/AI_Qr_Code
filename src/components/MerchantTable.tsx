import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import type { MerchantWithStats } from "../lib/supabase";
import { addTrackingParams, getQrUrl } from "../lib/url";

type MerchantTableProps = {
  merchants: MerchantWithStats[];
};

export function MerchantTable({ merchants }: MerchantTableProps) {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    async function renderQrCodes() {
      const entries = await Promise.all(
        merchants.map(async (merchant) => [
          merchant.id,
          await QRCode.toDataURL(getQrUrl(merchant.slug), { margin: 1, width: 144 }),
        ]),
      );

      if (mounted) {
        setQrImages(Object.fromEntries(entries));
      }
    }

    renderQrCodes();

    return () => {
      mounted = false;
    };
  }, [merchants]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  function downloadQr(name: string, imageUrl: string | undefined) {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
    link.click();
  }

  if (merchants.length === 0) {
    return (
      <div className="empty-state">
        <QrCode size={32} />
        <h2>No merchants yet</h2>
        <p>Create the first merchant QR and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="merchant-list">
      {merchants.map((merchant) => {
        const qrUrl = getQrUrl(merchant.slug);
        const finalUrl = addTrackingParams(merchant.appsflyer_url, merchant.campaign, merchant.slug);

        return (
          <article className="merchant-row" key={merchant.id}>
            <img className="qr-image" src={qrImages[merchant.id]} alt={`${merchant.name} QR code`} />

            <div className="merchant-main">
              <div className="merchant-heading">
                <h3>{merchant.name}</h3>
                <span>{merchant.location || "No location"}</span>
              </div>
              <p>{qrUrl}</p>
              <div className="merchant-actions">
                <button type="button" onClick={() => copy(qrUrl)}>
                  <Copy size={16} />
                  Copy QR link
                </button>
                <button type="button" onClick={() => downloadQr(merchant.name, qrImages[merchant.id])}>
                  <QrCode size={16} />
                  Download QR
                </button>
                <a href={qrUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Test scan
                </a>
                <a href={finalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  AppsFlyer URL
                </a>
              </div>
            </div>

            <div className="merchant-stats">
              <strong>{merchant.scans}</strong>
              <span>scans</span>
              <small>
                {merchant.last_scan_at
                  ? new Date(merchant.last_scan_at).toLocaleString()
                  : "No scans yet"}
              </small>
            </div>
          </article>
        );
      })}
    </div>
  );
}
