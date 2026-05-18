import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Edit, ExternalLink, QrCode, Trash2 } from "lucide-react";
import type { Merchant, MerchantWithStats } from "../lib/supabase";
import { deleteMerchant } from "../lib/api";
import { getMerchantDestination, getQrUrl } from "../lib/url";

type MerchantTableProps = {
  merchants: MerchantWithStats[];
  onEdit: (merchant: Merchant) => void;
  onChanged: () => void;
};

export function MerchantTable({ merchants, onEdit, onChanged }: MerchantTableProps) {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState("");

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

  async function handleDelete(merchant: Merchant) {
    const confirmed = window.confirm(`Delete ${merchant.name}? This also removes its scan history.`);
    if (!confirmed) return;

    setDeletingId(merchant.id);
    try {
      await deleteMerchant(merchant.id);
      onChanged();
    } finally {
      setDeletingId("");
    }
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
        const finalUrl = getMerchantDestination(merchant, "desktop");

        return (
          <article className="merchant-row" key={merchant.id}>
            <img className="qr-image" src={qrImages[merchant.id]} alt={`${merchant.name} QR code`} />

            <div className="merchant-main">
              <div className="merchant-heading">
                <h3>{merchant.name}</h3>
                <span>{merchant.location || "No location"}</span>
                <span className={merchant.is_active ? "status-pill active" : "status-pill"}>
                  {merchant.is_active ? "Active" : "Paused"}
                </span>
              </div>
              <div className="merchant-meta">
                <span>{merchant.destination_type === "appsflyer" ? "AppsFlyer" : "Normal link"}</span>
                <span>{merchant.app_name || "No app name"}</span>
                <span>Campaign: {merchant.campaign}</span>
                <span>
                  Payout:{" "}
                  {merchant.payout_amount && merchant.payout_currency
                    ? `${merchant.payout_currency} ${merchant.payout_amount} / download`
                    : "Not set"}
                </span>
              </div>
              <p>{qrUrl}</p>
              <div className="merchant-actions">
                <button type="button" onClick={() => copy(qrUrl)}>
                  <Copy size={16} />
                  Copy QR link
                </button>
                <button type="button" onClick={() => downloadQr(merchant.name, qrImages[merchant.id])}>
                  <Download size={16} />
                  Download QR
                </button>
                <button type="button" onClick={() => onEdit(merchant)}>
                  <Edit size={16} />
                  Edit
                </button>
                <a href={qrUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Test scan
                </a>
                {finalUrl && (
                  <a href={finalUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Destination
                  </a>
                )}
                <button
                  className="danger-button"
                  type="button"
                  disabled={deletingId === merchant.id}
                  onClick={() => handleDelete(merchant)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
              {merchant.notes && <p className="merchant-note">{merchant.notes}</p>}
              {merchant.destination_type === "appsflyer" && (
                <p className="merchant-note">
                  AppsFlyer params: pid={merchant.appsflyer_pid || "from link"} c={merchant.campaign} af_sub1=
                  {merchant.slug}
                </p>
              )}
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
