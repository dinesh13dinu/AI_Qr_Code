import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { createMerchant, updateMerchant } from "../lib/api";
import type { Merchant } from "../lib/supabase";
import { toSlug } from "../lib/url";

type MerchantFormProps = {
  editingMerchant: Merchant | null;
  onCancelEdit: () => void;
  onSaved: (merchant: Merchant) => void;
};

type DestinationType = "direct" | "appsflyer";

const emptyForm = {
  name: "",
  location: "",
  appName: "",
  destinationType: "direct" as DestinationType,
  iosUrl: "",
  androidUrl: "",
  fallbackUrl: "",
  appsflyerUrl: "",
  appsflyerPid: "",
  campaign: "",
  payoutAmount: "",
  payoutCurrency: "AED" as "AED" | "USD",
  isActive: true,
  notes: "",
};

export function MerchantForm({ editingMerchant, onCancelEdit, onSaved }: MerchantFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const slug = useMemo(() => toSlug(form.name), [form.name]);
  const campaign = form.campaign.trim() || slug;
  const isEditing = Boolean(editingMerchant);

  useEffect(() => {
    if (!editingMerchant) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: editingMerchant.name,
      location: editingMerchant.location ?? "",
      appName: editingMerchant.app_name ?? "",
      destinationType: editingMerchant.destination_type,
      iosUrl: editingMerchant.ios_url ?? "",
      androidUrl: editingMerchant.android_url ?? "",
      fallbackUrl: editingMerchant.fallback_url ?? "",
      appsflyerUrl: editingMerchant.appsflyer_url ?? "",
      appsflyerPid: editingMerchant.appsflyer_pid ?? "",
      campaign: editingMerchant.campaign,
      payoutAmount: editingMerchant.payout_amount ? String(editingMerchant.payout_amount) : "",
      payoutCurrency: editingMerchant.payout_currency ?? "AED",
      isActive: editingMerchant.is_active,
      notes: editingMerchant.notes ?? "",
    });
  }, [editingMerchant]);

  function updateField<Field extends keyof typeof form>(field: Field, value: (typeof form)[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const hasDirectUrl = form.iosUrl.trim() || form.androidUrl.trim() || form.fallbackUrl.trim();
    const hasAppsFlyer = form.appsflyerUrl.trim();

    if (!form.name.trim() || !slug) {
      setError("Merchant name is required.");
      return;
    }

    if (form.destinationType === "direct" && !hasDirectUrl) {
      setError("Add at least one iOS, Android, or fallback URL.");
      return;
    }

    if (form.destinationType === "appsflyer" && !hasAppsFlyer) {
      setError("Branch attribution link is required for tracking mode.");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: form.name.trim(),
        slug,
        location: form.location.trim(),
        appName: form.appName.trim(),
        destinationType: form.destinationType,
        iosUrl: form.iosUrl.trim(),
        androidUrl: form.androidUrl.trim(),
        fallbackUrl: form.fallbackUrl.trim(),
        appsflyerUrl: form.appsflyerUrl.trim(),
        appsflyerPid: form.appsflyerPid.trim(),
        campaign,
        payoutAmount: form.payoutAmount.trim(),
        payoutCurrency: form.payoutCurrency,
        isActive: form.isActive,
        notes: form.notes.trim(),
      };

      const savedMerchant = editingMerchant
        ? await updateMerchant({ ...payload, id: editingMerchant.id })
        : await createMerchant(payload);

      setForm(emptyForm);
      onSaved(savedMerchant);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save merchant.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="merchant-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="merchant-name">Merchant / affiliate name</label>
        <input
          id="merchant-name"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="merchant-location">Location</label>
        <input
          id="merchant-location"
          value={form.location}
          onChange={(event) => updateField("location", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="app-name">App / campaign name</label>
        <input
          id="app-name"
          value={form.appName}
          onChange={(event) => updateField("appName", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="campaign">Tracking campaign</label>
        <input
          id="campaign"
          value={form.campaign}
          onChange={(event) => updateField("campaign", event.target.value)}
        />
      </div>

      <div className="wide">
        <label>Destination type</label>
        <div className="segmented-control">
          <button
            type="button"
            className={form.destinationType === "direct" ? "selected" : ""}
            onClick={() => updateField("destinationType", "direct")}
          >
            Normal app/link
          </button>
          <button
            type="button"
            className={form.destinationType === "appsflyer" ? "selected" : ""}
            onClick={() => updateField("destinationType", "appsflyer")}
          >
            Branch link
          </button>
        </div>
      </div>

      {form.destinationType === "direct" ? (
        <>
          <div>
            <label htmlFor="ios-url">iOS App Store URL</label>
            <input
              id="ios-url"
              value={form.iosUrl}
              onChange={(event) => updateField("iosUrl", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="android-url">Android Play Store URL</label>
            <input
              id="android-url"
              value={form.androidUrl}
              onChange={(event) => updateField("androidUrl", event.target.value)}
            />
          </div>
          <div className="wide">
            <label htmlFor="fallback-url">Fallback / website URL</label>
            <input
              id="fallback-url"
              value={form.fallbackUrl}
              onChange={(event) => updateField("fallbackUrl", event.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="wide">
            <label htmlFor="appsflyer-url">Branch attribution link</label>
            <input
              id="appsflyer-url"
              value={form.appsflyerUrl}
              onChange={(event) => updateField("appsflyerUrl", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="appsflyer-pid">Branch channel/source</label>
            <input
              id="appsflyer-pid"
              value={form.appsflyerPid}
              onChange={(event) => updateField("appsflyerPid", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="appsflyer-fallback">Fallback URL</label>
            <input
              id="appsflyer-fallback"
              value={form.fallbackUrl}
              onChange={(event) => updateField("fallbackUrl", event.target.value)}
            />
          </div>
        </>
      )}

      <div className="wide">
        <label>Payout per confirmed download</label>
        <div className="payout-row">
          <input
            id="payout-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.payoutAmount}
            onChange={(event) => updateField("payoutAmount", event.target.value)}
          />
          <select
            aria-label="Payout currency"
            value={form.payoutCurrency}
            onChange={(event) => updateField("payoutCurrency", event.target.value as "AED" | "USD")}
          >
            <option value="AED">AED</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="wide">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </div>

      <label className="checkbox-row wide">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => updateField("isActive", event.target.checked)}
        />
        QR link is active
      </label>

      <div className="form-footer wide">
        <span className="slug-preview">QR path: /m/{slug || "merchant-name"}</span>
        <div className="button-row">
          {isEditing && (
            <button className="secondary-button" type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={isSaving}>
            {isEditing ? <Check size={18} /> : <Plus size={18} />}
            {isSaving ? "Saving" : isEditing ? "Save changes" : "Generate QR"}
          </button>
        </div>
      </div>

      {error && <p className="form-error wide">{error}</p>}
    </form>
  );
}
