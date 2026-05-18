import { FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createMerchant } from "../lib/api";
import { toSlug } from "../lib/url";

type MerchantFormProps = {
  onCreated: () => void;
};

export function MerchantForm({ onCreated }: MerchantFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [appsflyerUrl, setAppsflyerUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const slug = useMemo(() => toSlug(name), [name]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !slug || !appsflyerUrl.trim()) {
      setError("Merchant name and AppsFlyer link are required.");
      return;
    }

    try {
      setIsSaving(true);
      await createMerchant({
        name: name.trim(),
        slug,
        location: location.trim(),
        appsflyerUrl: appsflyerUrl.trim(),
        campaign: slug,
        notes: notes.trim(),
      });

      setName("");
      setLocation("");
      setAppsflyerUrl("");
      setNotes("");
      onCreated();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create merchant.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="merchant-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="merchant-name">Merchant name</label>
        <input
          id="merchant-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Dinesh QR Partner"
        />
      </div>

      <div>
        <label htmlFor="merchant-location">Location</label>
        <input
          id="merchant-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Dubai Mall"
        />
      </div>

      <div className="wide">
        <label htmlFor="appsflyer-url">AppsFlyer OneLink</label>
        <input
          id="appsflyer-url"
          value={appsflyerUrl}
          onChange={(event) => setAppsflyerUrl(event.target.value)}
          placeholder="https://company.onelink.me/abcd?pid=dinesh_qr"
        />
      </div>

      <div className="wide">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Contact person, payout details, placement notes"
        />
      </div>

      <div className="form-footer wide">
        <span className="slug-preview">QR path: /m/{slug || "merchant-name"}</span>
        <button type="submit" disabled={isSaving}>
          <Plus size={18} />
          {isSaving ? "Creating" : "Create QR"}
        </button>
      </div>

      {error && <p className="form-error wide">{error}</p>}
    </form>
  );
}
