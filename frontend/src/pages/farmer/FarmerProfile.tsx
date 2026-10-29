import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchFarmerProfile, updateFarmerProfile } from "@/services/auth";
import { getErrorMessage } from "@/services/api";
import type { FarmerProfile } from "@/types";
import { Spinner } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

const ALL_CROPS = [
  "Wheat", "Paddy", "Rice", "Maize", "Bajra", "Jowar", "Soybean", "Groundnut",
  "Cotton", "Sugarcane", "Tomato", "Onion", "Potato", "Chilli", "Ladyfinger",
  "Brinjal", "Cabbage", "Cauliflower", "Mango", "Banana", "Grapes", "Orange",
  "Guava", "Apple", "Turmeric", "Ginger", "Mustard",
];

export default function FarmerProfile() {
  const { t } = useTranslation(["farmer", "common"]);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [farmSizeAcres, setFarmSizeAcres] = useState("");
  const [bio, setBio] = useState("");
  const [crops, setCrops] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState("25");

  useEffect(() => {
    fetchFarmerProfile()
      .then((p) => {
        setProfile(p);
        setFarmName(p.farmName ?? "");
        setLocation(p.location ?? "");
        setFarmSizeAcres(p.farmSizeAcres ? String(p.farmSizeAcres) : "");
        setBio(p.bio ?? "");
        setCrops(p.crops ?? []);
        setDistanceKm(p.distanceKm ? String(p.distanceKm) : "25");
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleCrop = (c: string) => {
    setCrops((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateFarmerProfile({
        farmName: farmName || undefined,
        location: location || undefined,
        farmSizeAcres: farmSizeAcres ? Number(farmSizeAcres) : undefined,
        bio: bio || undefined,
        crops,
        distanceKm: Number(distanceKm) || 25,
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
        title={t("profile.title", { defaultValue: "Farmer Profile" })}
        description={t("profile.description", {
          defaultValue: "Your profile powers smart allocation ranking and matching.",
        })}
      />
      <div className="card mb-6 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-stone-400">
            {t("profile.reliabilityScore", { defaultValue: "Reliability score" })}
          </p>
          <p className="text-lg font-bold text-forest">{Math.round((profile?.reliability ?? 0) * 100)}%</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">
            {t("profile.defaultDistance", { defaultValue: "Default distance (km)" })}
          </p>
          <p className="text-lg font-bold text-forest">{profile?.distanceKm ?? 25} km</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">
            {t("profile.interestedCrops", { defaultValue: "Interested crops" })}
          </p>
          <p className="text-lg font-bold text-forest">{crops.length}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("profile.farmName", { defaultValue: "Farm name" })}</label>
            <input className="input" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("profile.location", { defaultValue: "Location" })}</label>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("profile.locationPlaceholder", { defaultValue: "Nashik, Maharashtra" })}
            />
          </div>
          <div>
            <label className="label">{t("profile.farmSize", { defaultValue: "Farm size (acres)" })}</label>
            <input
              className="input"
              type="number"
              min="0"
              value={farmSizeAcres}
              onChange={(e) => setFarmSizeAcres(e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              {t("profile.distanceToMarket", { defaultValue: "Distance to market (km)" })}
            </label>
            <input
              className="input"
              type="number"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">{t("profile.cropsIGrow", { defaultValue: "Crops I grow" })}</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CROPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCrop(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  crops.includes(c)
                    ? "border-forest bg-forest text-white"
                    : "border-stone-300 bg-white text-stone-600"
                }`}
              >
                {getLocalizedProductName(c)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">{t("profile.aboutFarm", { defaultValue: "About my farm" })}</label>
          <textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
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
