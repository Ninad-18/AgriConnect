import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchSupplierProfile, updateSupplierProfile } from "@/services/auth";
import { getErrorMessage } from "@/services/api";
import type { SupplierProfile } from "@/types";
import { Spinner } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SupplierProfile() {
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
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Supplier Profile" description="Tell farmers and customers about your business." />
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Company name</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="GreenMart Wholesale" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Location</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="label">Business type</label>
            <select className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              <option value="">Select...</option>
              <option>Wholesaler</option>
              <option>Aggregator</option>
              <option>Processor</option>
              <option>Exporter</option>
              <option>Retail chain</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">About</label>
          <textarea className="input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}