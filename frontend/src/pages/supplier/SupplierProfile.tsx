import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchSupplierProfile, updateSupplierProfile } from "@/services/auth";
import { getErrorMessage } from "@/services/api";
import type { SupplierProfile } from "@/types";
import { Spinner } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SupplierProfile() {
  const { t } = useTranslation(["supplier", "common"]);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    fetchSupplierProfile()
      .then((p) => {
        setProfile(p);
        setCompanyName(p.companyName ?? "");
        setLocation(p.location ?? "");
        setBusinessType(p.businessType ?? "");
        setBio(p.bio ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSupplierProfile({
        companyName: companyName || undefined,
        location: location || undefined,
        businessType: businessType || undefined,
        bio: bio || undefined,
      });
      toast.success(t("profile.profileUpdated", { defaultValue: "Profile updated" }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={t("profile.title", { defaultValue: "Supplier Profile" })}
        description={t("profile.description", {
          defaultValue: "Tell farmers and customers about your business.",
        })}
      />
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">{t("profile.companyName", { defaultValue: "Company name" })}</label>
          <input
            className="input"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t("profile.companyPlaceholder", { defaultValue: "GreenMart Wholesale" })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("profile.location", { defaultValue: "Location" })}</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("profile.businessType", { defaultValue: "Business type" })}</label>
            <select className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              <option value="">{t("profile.selectType", { defaultValue: "Select..." })}</option>
              <option value="Wholesaler">
                {t("profile.types.wholesaler", { defaultValue: "Wholesaler" })}
              </option>
              <option value="Aggregator">
                {t("profile.types.aggregator", { defaultValue: "Aggregator" })}
              </option>
              <option value="Processor">
                {t("profile.types.processor", { defaultValue: "Processor" })}
              </option>
              <option value="Exporter">
                {t("profile.types.exporter", { defaultValue: "Exporter" })}
              </option>
              <option value="Retail chain">
                {t("profile.types.retailChain", { defaultValue: "Retail chain" })}
              </option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t("profile.about", { defaultValue: "About" })}</label>
          <textarea className="input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving
            ? t("common:actions.saving", { defaultValue: "Saving..." })
            : t("profile.saveProfile", { defaultValue: "Save profile" })}
        </button>
      </form>
    </div>
  );
}
