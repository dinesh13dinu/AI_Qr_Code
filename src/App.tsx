import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, ChevronDown, Download, LogOut, QrCode, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { AccessPanel } from "./components/AccessPanel";
import { LoginScreen } from "./components/LoginScreen";
import { MerchantForm } from "./components/MerchantForm";
import { MerchantTable } from "./components/MerchantTable";
import { StatsStrip } from "./components/StatsStrip";
import { getMerchantBySlug, listMerchants, logScan, logoutAccessUser } from "./lib/api";
import { isSupabaseReady, type AccessUser, type Merchant, type MerchantWithStats } from "./lib/supabase";
import { detectDevice, getMerchantDestination } from "./lib/url";
import referlyLogo from "./assets/referly-logo.png";
import "./styles.css";

function Dashboard() {
  const [merchants, setMerchants] = useState<MerchantWithStats[]>([]);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [generatedMerchant, setGeneratedMerchant] = useState<MerchantWithStats | null>(null);
  const [activePage, setActivePage] = useState<"qr" | "reporting" | "access">("qr");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMerchants() {
    setError("");
    setIsLoading(true);

    try {
      setMerchants(await listMerchants());
    } catch (caught) {
      const message = getErrorMessage(caught, "Could not load merchants.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMerchants();
  }, []);

  async function logout() {
    await logoutAccessUser();
    window.localStorage.removeItem("ai_qr_admin_session");
    window.location.reload();
  }

  function showGeneratedMerchant(merchant: Merchant) {
    const currentStats = merchants.find((item) => item.id === merchant.id);
    setGeneratedMerchant({
      ...merchant,
      scans: currentStats?.scans ?? 0,
      last_scan_at: currentStats?.last_scan_at ?? null,
    });
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
        "Payout",
        "Last Scan",
        "Active",
      ],
      ...merchants.map((merchant) => [
        merchant.name,
        merchant.location || "",
        merchant.app_name || "",
        merchant.destination_type === "appsflyer" ? "Branch link" : "Normal link",
        merchant.campaign,
        `${window.location.origin}/m/${merchant.slug}`,
        String(merchant.scans),
        merchant.payout_amount && merchant.payout_currency
          ? `${merchant.payout_currency} ${merchant.payout_amount} per download`
          : "",
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

  const currentUser = getStoredUser();
  const pageTitle = activePage === "qr" ? "QR codes" : activePage === "reporting" ? "Reporting" : "Access";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={referlyLogo} alt="Referly" />
          <span className="mobile-brand-word">Referly</span>
        </div>

        <button className="workspace-switcher" type="button">
          <span>Referly</span>
          <ChevronDown size={18} />
        </button>

        <nav className="page-tabs" aria-label="Dashboard pages">
          <button className={activePage === "qr" ? "selected" : ""} type="button" onClick={() => setActivePage("qr")}>
            <QrCode size={20} />
            QR Codes
          </button>
          <button
            className={activePage === "reporting" ? "selected" : ""}
            type="button"
            onClick={() => setActivePage("reporting")}
          >
            <BarChart3 size={20} />
            Reporting
          </button>
          {currentUser?.is_admin && (
            <button
              className={activePage === "access" ? "selected" : ""}
              type="button"
              onClick={() => setActivePage("access")}
            >
              <UsersRound size={20} />
              Access
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          {currentUser && <span className="user-pill">{currentUser.name}</span>}
          <button className="logout-icon-button" type="button" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span>Dashboard</span>
            <h1>{pageTitle}</h1>
          </div>
        </header>

        {!isSupabaseReady && (
          <div className="notice">
            Supabase is not connected locally. Add Vercel variables and redeploy, or create a local `.env`.
          </div>
        )}

        {error && <div className="notice error">{error}</div>}

        {activePage === "qr" ? (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{editingMerchant ? "Edit merchant QR" : "Create merchant QR"}</h2>
                  <p>Add a direct link today, or switch to a Branch attribution link when the client provides one.</p>
                </div>
              </div>
              <MerchantForm
                editingMerchant={editingMerchant}
                onCancelEdit={() => setEditingMerchant(null)}
                onSaved={(merchant) => {
                  setEditingMerchant(null);
                  showGeneratedMerchant(merchant);
                  loadMerchants();
                }}
              />
            </section>

            {generatedMerchant && (
              <section className="panel generated-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Generated QR code</h2>
                    <p>This QR is shown for this session. Refreshing the page clears it from here.</p>
                  </div>
                </div>
                <MerchantTable
                  merchants={[generatedMerchant]}
                  onEdit={setEditingMerchant}
                  onChanged={() => {
                    setGeneratedMerchant(null);
                    loadMerchants();
                  }}
                />
              </section>
            )}
          </>
        ) : activePage === "reporting" ? (
          <ReportingPage
            merchants={merchants}
            isLoading={isLoading}
            onRefresh={loadMerchants}
            onExport={exportCsv}
            onEdit={(merchant) => {
              setEditingMerchant(merchant);
              setActivePage("qr");
            }}
          />
        ) : (
          <AccessPanel />
        )}
      </div>
    </main>
  );
}

type ReportingPageProps = {
  merchants: MerchantWithStats[];
  isLoading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onEdit: (merchant: Merchant) => void;
};

function ReportingPage({ merchants, isLoading, onRefresh, onExport, onEdit }: ReportingPageProps) {
  const [reportView, setReportView] = useState<"campaign" | "qr">("campaign");

  return (
    <>
      <StatsStrip merchants={merchants} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Campaign reporting</h2>
            <p>Review scans, last activity, payout setup, and campaign routing in one place.</p>
          </div>
          <div className="panel-actions">
            <button className="refresh-button data-refresh" type="button" onClick={onRefresh}>
              <RefreshCw size={18} />
              Refresh
            </button>
            <button className="refresh-button" type="button" onClick={onExport}>
              <Download size={18} />
              Export CSV
            </button>
            {isLoading && <span className="loading">Loading</span>}
          </div>
        </div>

        <div className="report-switch" aria-label="Reporting sections">
          <button
            className={reportView === "campaign" ? "selected" : ""}
            type="button"
            onClick={() => setReportView("campaign")}
          >
            <BarChart3 size={18} />
            Campaign reporting
          </button>
          <button
            className={reportView === "qr" ? "selected" : ""}
            type="button"
            onClick={() => setReportView("qr")}
          >
            <QrCode size={18} />
            Merchant QR codes
          </button>
        </div>

        {reportView === "campaign" ? (
          merchants.length === 0 ? (
            <div className="empty-state">
              <BarChart3 size={32} />
              <h2>No reporting data yet</h2>
              <p>Create a QR code and scan activity will appear here.</p>
            </div>
          ) : (
            <div className="report-table">
              <div className="report-row report-head">
                <span>Merchant</span>
                <span>Campaign</span>
                <span>Mode</span>
                <span>Scans</span>
                <span>Payout</span>
                <span>Last scan</span>
              </div>
              {merchants.map((merchant) => (
                <div className="report-row" key={merchant.id}>
                  <strong data-label="Merchant">{merchant.name}</strong>
                  <span data-label="Campaign">{merchant.campaign}</span>
                  <span data-label="Mode">
                    {merchant.destination_type === "appsflyer" ? "Branch link" : "Normal link"}
                  </span>
                  <strong data-label="Scans">{merchant.scans}</strong>
                  <span data-label="Payout">
                    {merchant.payout_amount && merchant.payout_currency
                      ? `${merchant.payout_currency} ${merchant.payout_amount} / download`
                      : "Not set"}
                  </span>
                  <span data-label="Last scan">
                    {merchant.last_scan_at
                      ? new Date(merchant.last_scan_at).toLocaleString()
                      : "No scans yet"}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="report-qr-panel">
            <MerchantTable merchants={merchants} onEdit={onEdit} onChanged={onRefresh} />
          </div>
        )}
      </section>
    </>
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
  const [currentUser, setCurrentUser] = useState<AccessUser | null>(() => getStoredUser());
  const slug = useMemo(() => {
    const match = window.location.pathname.match(/^\/m\/([^/]+)/);
    return match?.[1] ?? null;
  }, []);

  if (slug) {
    return <RedirectPage slug={slug} />;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return <Dashboard />;
}

function getStoredUser() {
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

function getErrorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === "object" && "message" in caught) {
    return String((caught as { message?: unknown }).message || fallback);
  }
  return fallback;
}

export default App;
