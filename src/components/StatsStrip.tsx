import type { MerchantWithStats } from "../lib/supabase";

type StatsStripProps = {
  merchants: MerchantWithStats[];
};

export function StatsStrip({ merchants }: StatsStripProps) {
  const totalScans = merchants.reduce((total, merchant) => total + merchant.scans, 0);
  const activeMerchants = merchants.filter((merchant) => merchant.scans > 0).length;

  return (
    <section className="stats-strip">
      <div>
        <span>Total merchants</span>
        <strong>{merchants.length}</strong>
      </div>
      <div>
        <span>QR scans</span>
        <strong>{totalScans}</strong>
      </div>
      <div>
        <span>Active merchants</span>
        <strong>{activeMerchants}</strong>
      </div>
      <div>
        <span>Install tracking</span>
        <strong>AppsFlyer</strong>
      </div>
    </section>
  );
}
