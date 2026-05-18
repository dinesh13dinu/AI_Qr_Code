import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { MerchantForm } from "./components/MerchantForm";
import { MerchantTable } from "./components/MerchantTable";
import { StatsStrip } from "./components/StatsStrip";
import { getMerchantBySlug, listMerchants, logScan } from "./lib/api";
import { isSupabaseReady, type Merchant, type MerchantWithStats } from "./lib/supabase";
import { detectDevice, getMerchantDestination } from "./lib/url";
import "./styles.css";

function Dashboard() {
  const [merchants, setMerchants] = useState<MerchantWithStats[]>([]);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMerchants() {
    setError("");
    setIsLoading(true);

    try {
      setMerchants(await listMerchants());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not load merchants.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMerchants();
  }, []);

  function logout() {
    window.localStorage.removeItem("ai_qr_admin_session");
    window.location.reload();
  }

  function exportCsv() {
    const rows = [
      [
        "Merchant",
        "Location",
        "App",
        "Destination Type",
        "Campaign",
        "QR Link",
        "Scans",
        "Last Scan",
        "Active",
      ],
      ...merchants.map((merchant) => [
        merchant.name,
        merchant.location || "",
        merchant.app_name || "",
        merchant.destination_type,
        merchant.campaign,
        `${window.location.origin}/m/${merchant.slug}`,
        String(merchant.scans),
        merchant.last_scan_at ? new Date(merchant.last_scan_at).toLocaleString() : "",
        merchant.is_active ? "yes" : "no",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "merchant-qr-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">QR referral engine</span>
          <h1>Merchant QR dashboard</h1>
          <p>Create merchant QR codes, track scans, and redirect each customer to a normal app link now or AppsFlyer later.</p>
        </div>
        <div className="topbar-actions">
          <button className="refresh-button" type="button" onClick={exportCsv}>
            <Download size={18} />
            Export CSV
          </button>
          <button className="refresh-button" type="button" onClick={loadMerchants}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="refresh-button secondary-button" type="button" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {!isSupabaseReady && (
        <div className="notice">
          Supabase is not connected locally. Add Vercel variables and redeploy, or create a local `.env`.
        </div>
      )}

      {error && <div className="notice error">{error}</div>}

      <StatsStrip merchants={merchants} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{editingMerchant ? "Edit merchant QR" : "Create merchant QR"}</h2>
            <p>Add normal app/store links today. Switch to AppsFlyer when the company gives you OneLink details.</p>
          </div>
        </div>
        <MerchantForm
          editingMerchant={editingMerchant}
          onCancelEdit={() => setEditingMerchant(null)}
          onSaved={() => {
            setEditingMerchant(null);
            loadMerchants();
          }}
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Merchant QR codes</h2>
            <p>Each QR logs a scan first, then forwards to the saved destination.</p>
          </div>
          {isLoading && <span className="loading">Loading</span>}
        </div>
        <MerchantTable merchants={merchants} onEdit={setEditingMerchant} onChanged={loadMerchants} />
      </section>
    </main>
  );
}

function RedirectPage({ slug }: { slug: string }) {
  const [status, setStatus] = useState("Preparing redirect");
  const [targetUrl, setTargetUrl] = useState("");

  useEffect(() => {
    async function redirect() {
      const merchant = await getMerchantBySlug(slug);

      if (!merchant) {
        setStatus("This QR link is not active.");
        return;
      }

      const deviceType = detectDevice(window.navigator.userAgent);
      await logScan(merchant.id, deviceType);

      const finalUrl = getMerchantDestination(merchant, deviceType);
      if (!finalUrl) {
        setStatus("This QR has no destination yet.");
        return;
      }

      setTargetUrl(finalUrl);
      setStatus(`Opening ${merchant.name}`);

      window.setTimeout(() => {
        window.location.href = finalUrl;
      }, 700);
    }

    redirect();
  }, [slug]);

  return (
    <main className="redirect-screen">
      <div className="redirect-card">
        <ShieldCheck size={36} />
        <h1>{status}</h1>
        <p>Your visit has been counted. You will be redirected to the app page now.</p>
        {targetUrl && (
          <a href={targetUrl}>
            Continue
            <ArrowRight size={16} />
          </a>
        )}
      </div>
    </main>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => window.localStorage.getItem("ai_qr_admin_session") === "active",
  );
  const slug = useMemo(() => {
    const match = window.location.pathname.match(/^\/m\/([^/]+)/);
    return match?.[1] ?? null;
  }, []);

  if (slug) {
    return <RedirectPage slug={slug} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return <Dashboard />;
}

export default App;
