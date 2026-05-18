import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { MerchantForm } from "./components/MerchantForm";
import { MerchantTable } from "./components/MerchantTable";
import { StatsStrip } from "./components/StatsStrip";
import { getMerchantBySlug, listMerchants, logScan } from "./lib/api";
import { isSupabaseReady, type MerchantWithStats } from "./lib/supabase";
import { addTrackingParams, detectDevice } from "./lib/url";
import "./styles.css";

function Dashboard() {
  const [merchants, setMerchants] = useState<MerchantWithStats[]>([]);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">QR referral engine</span>
          <h1>Merchant QR dashboard</h1>
          <p>Create merchant QR codes, track scans, and redirect every customer to the right AppsFlyer link.</p>
        </div>
        <button className="refresh-button" type="button" onClick={loadMerchants}>
          <RefreshCw size={18} />
          Refresh
        </button>
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
            <h2>Create merchant QR</h2>
            <p>Paste the company AppsFlyer OneLink. This app adds merchant tracking automatically.</p>
          </div>
        </div>
        <MerchantForm onCreated={loadMerchants} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Merchant QR codes</h2>
            <p>Each QR logs a scan first, then forwards to AppsFlyer.</p>
          </div>
          {isLoading && <span className="loading">Loading</span>}
        </div>
        <MerchantTable merchants={merchants} />
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

      const finalUrl = addTrackingParams(merchant.appsflyer_url, merchant.campaign, merchant.slug);
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
  const slug = useMemo(() => {
    const match = window.location.pathname.match(/^\/m\/([^/]+)/);
    return match?.[1] ?? null;
  }, []);

  if (slug) {
    return <RedirectPage slug={slug} />;
  }

  return <Dashboard />;
}

export default App;
