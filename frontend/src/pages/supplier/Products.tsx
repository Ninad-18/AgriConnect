import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fetchInventory } from "@/services/inventory";
import {
  createListing,
  fetchMyListings,
  updateListing,
  deactivateListing,
} from "@/services/products";
import { isUploadable, getErrorMessage, getUploadValidationMessage } from "@/services/api";
import type { Grade, InventoryItem, ProductListing } from "@/types";
import { fmtINR, fmtKg } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocalizedProductName } from "@/lib/products";

type CreateMode = "inventory" | "direct";

export default function Products() {
  const { t } = useTranslation(["supplier", "common"]);
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ProductListing | null>(null);

  // create-form state
  const [mode, setMode] = useState<CreateMode>("inventory");
  const [invId, setInvId] = useState("");
  const [cropName, setCropName] = useState("");
  const [grade, setGrade] = useState<Grade>("A");
  const [quantityKg, setQuantityKg] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // edit-form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = () =>
    Promise.all([fetchMyListings(), fetchInventory()])
      .then(([l, i]) => {
        setListings(l);
        setInventory(i);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sellableInventory = useMemo(
    () =>
      inventory.filter(
        (i) => i.quantityKg - i.reservedKg > 0 && !i.listing
      ),
    [inventory]
  );

  const onFiles = (fl: FileList | null) => {
    if (!fl) return;
    const candidates = Array.from(fl);
    const rejected = candidates.find((file) => !isUploadable(file));
    if (rejected) toast.error(getUploadValidationMessage(rejected));
    setFiles(candidates.filter((f) => isUploadable(f)).slice(0, 5));
  };

  const resetForm = () => {
    setMode("inventory");
    setInvId("");
    setCropName("");
    setGrade("A");
    setQuantityKg("");
    setTitle("");
    setDescription("");
    setPrice("");
    setFiles([]);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || Number(price) <= 0) {
      return toast.error(
        t("products.validationInventoryPrice", {
          defaultValue: "Enter a title and a valid price",
        })
      );
    }
    if (mode === "inventory" && !invId) {
      return toast.error(
        t("products.validationInventoryPrice", {
          defaultValue: "Select inventory and enter a valid price",
        })
      );
    }
    if (mode === "direct") {
      if (!cropName.trim()) {
        return toast.error(t("products.validationCrop", { defaultValue: "Enter a crop name" }));
      }
      if (!Number(quantityKg) || Number(quantityKg) <= 0) {
        return toast.error(
          t("products.validationQuantity", { defaultValue: "Enter a valid quantity" })
        );
      }
    }

    setSubmitting(true);
    try {
      const base = {
        title: title.trim(),
        description: description || undefined,
        pricePerKg: Number(price),
        images: files,
      };
      const res =
        mode === "inventory"
          ? await createListing({ ...base, inventoryId: invId })
          : await createListing({
              ...base,
              cropName: cropName.trim(),
              grade,
              quantityKg: Number(quantityKg),
            });
      toast.success(t("products.listingCreatedSuccess", { defaultValue: "Listing created" }));
      setModal(false);
      resetForm();
      setListings((prev) => [res, ...prev]);
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (listing: ProductListing) => {
    setEditing(listing);
    setEditTitle(listing.title);
    setEditDescription(listing.description ?? "");
    setEditPrice(String(listing.pricePerKg));
    setEditQuantity(String(listing.inventory?.quantityKg ?? ""));
  };

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editTitle.trim() || Number(editPrice) <= 0) {
      return toast.error(
        t("products.validationInventoryPrice", {
          defaultValue: "Enter a title and a valid price",
        })
      );
    }
    setEditSaving(true);
    try {
      const updated = await updateListing(editing.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        pricePerKg: Number(editPrice),
        ...(editQuantity !== "" ? { quantityKg: Number(editQuantity) } : {}),
      });
      setListings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(t("products.listingUpdatedSuccess", { defaultValue: "Listing updated" }));
      setEditing(null);
      void load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const onToggle = async (l: ProductListing) => {
    try {
      const updated = await updateListing(l.id, { isActive: !l.isActive });
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, ...updated } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDelete = async (l: ProductListing) => {
    try {
      if (
        !confirm(
          t("products.confirmDeactivate", {
            title: l.title,
            defaultValue: `Deactivate "${l.title}"?`,
          })
        )
      )
        return;
      await deactivateListing(l.id);
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, isActive: false } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={t("products.title", { defaultValue: "Product Listings" })}
        description={t("products.description", {
          defaultValue: "Publish produce as customer-facing listings.",
        })}
        actions={
          <button className="btn-primary" onClick={() => setModal(true)}>
            {t("products.newListingBtn", { defaultValue: "+ New listing" })}
          </button>
        }
      />

      {listings.length === 0 ? (
        <EmptyState
          title={t("products.emptyTitle", { defaultValue: "No listings yet" })}
          hint={t("products.emptyHint", {
            defaultValue: "Create a listing from your inventory or directly from a harvest.",
          })}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const sellable = Math.max(
              0,
              (l.inventory?.quantityKg ?? 0) - (l.inventory?.reservedKg ?? 0)
            );
            const crop = l.inventory?.cropName ?? l.product?.cropName;
            return (
              <div key={l.id} className="card">
                {l.images && l.images.length > 0 && Array.isArray(l.images) ? (
                  <img
                    src={l.images[0]}
                    alt={l.title}
                    className="h-40 w-full rounded-lg object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-sand text-3xl">🌿</div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <h3 className="font-semibold text-forest">
                    {getLocalizedProductName(l.title, crop)}
                  </h3>
                  <Badge status={l.isActive ? "AVAILABLE" : "DRAFT"} />
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {fmtINR(l.pricePerKg)}
                  {t("common:units.perKg", { defaultValue: "/kg" })} ·{" "}
                  {t("customer:marketplace.available", {
                    qty: fmtKg(sellable),
                    defaultValue: `${fmtKg(sellable)} available`,
                  })}{" "}
                  ·{" "}
                  {t("common:grades.gradeLabel", {
                    grade: l.inventory?.grade,
                    defaultValue: `Grade ${l.inventory?.grade}`,
                  })}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-stone-400">{l.description}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-secondary !py-1.5 flex-1" onClick={() => startEdit(l)}>
                    {t("common:actions.edit", { defaultValue: "Edit" })}
                  </button>
                  <button className="btn-secondary !py-1.5 flex-1" onClick={() => onToggle(l)}>
                    {l.isActive
                      ? t("products.deactivate", { defaultValue: "Deactivate" })
                      : t("products.activate", { defaultValue: "Activate" })}
                  </button>
                  <button className="btn-secondary !py-1.5 text-red-600" onClick={() => onDelete(l)}>
                    {t("products.delete", { defaultValue: "Delete" })}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <form className="card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()} onSubmit={onCreate}>
            <h3 className="text-lg font-semibold text-forest">
              {t("products.createModalTitle", { defaultValue: "Create listing" })}
            </h3>

            <div className="flex gap-2">
              {(["inventory", "direct"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    mode === m ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {m === "inventory"
                    ? t("products.fromInventory", { defaultValue: "From inventory" })
                    : t("products.directSale", { defaultValue: "Direct sale" })}
                </button>
              ))}
            </div>

            {mode === "inventory" ? (
              sellableInventory.length === 0 ? (
                <p className="text-sm text-stone-500">
                  {t("products.noInventoryWarning", {
                    defaultValue:
                      "No unreserved inventory available. Use direct sale or verify deliveries to build stock.",
                  })}
                </p>
              ) : (
                <div>
                  <label className="label">
                    {t("products.inventoryItemLabel", { defaultValue: "Inventory item" })}
                  </label>
                  <select className="input" value={invId} onChange={(e) => setInvId(e.target.value)}>
                    <option value="">{t("profile.selectType", { defaultValue: "Select..." })}</option>
                    {sellableInventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {getLocalizedProductName(i.cropName)} (
                        {t("common:grades.gradeLabel", { grade: i.grade, defaultValue: `grade ${i.grade}` })}) ·{" "}
                        {fmtKg(i.quantityKg - i.reservedKg)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">{t("products.cropLabel", { defaultValue: "Crop" })}</label>
                  <input
                    className="input"
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    placeholder={t("products.cropPlaceholder", { defaultValue: "e.g. Tomato, Finger millet" })}
                  />
                </div>
                <div>
                  <label className="label">{t("products.gradeLabel", { defaultValue: "Grade" })}</label>
                  <div className="flex gap-2">
                    {(["A", "B", "C"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                          grade === g ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-600"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">{t("products.quantityLabel", { defaultValue: "Quantity (kg)" })}</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="0.1"
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">{t("products.titleLabel", { defaultValue: "Title" })}</label>
              <input
                className="input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("products.titlePlaceholder", { defaultValue: "Organic Nashik Tomatoes" })}
              />
            </div>
            <div>
              <label className="label">{t("products.descriptionLabel", { defaultValue: "Description" })}</label>
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("products.priceLabel", { defaultValue: "Price (₹/kg)" })}</label>
              <input className="input" type="number" min="0.01" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("products.photosLabel", { defaultValue: "Photos" })}</label>
              <input className="input" type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={i} className="badge bg-green-100 text-green-700">{f.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>
                {t("common:actions.cancel", { defaultValue: "Cancel" })}
              </button>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting
                  ? t("products.creating", { defaultValue: "Creating..." })
                  : t("products.publishBtn", { defaultValue: "Publish" })}
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <form className="card w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={onEdit}>
            <h3 className="text-lg font-semibold text-forest">
              {t("products.editModalTitle", { defaultValue: "Edit listing" })}
            </h3>
            <div>
              <label className="label">{t("products.titleLabel", { defaultValue: "Title" })}</label>
              <input className="input" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("products.descriptionLabel", { defaultValue: "Description" })}</label>
              <textarea className="input" rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("products.priceLabel", { defaultValue: "Price (₹/kg)" })}</label>
              <input className="input" type="number" min="0.01" step="0.01" required value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("products.quantityLabel", { defaultValue: "Quantity (kg)" })}</label>
              <input className="input" type="number" min="0" step="0.1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                {t("common:actions.cancel", { defaultValue: "Cancel" })}
              </button>
              <button className="btn-primary" type="submit" disabled={editSaving}>
                {editSaving
                  ? t("common:actions.saving", { defaultValue: "Saving..." })
                  : t("common:actions.save", { defaultValue: "Save" })}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
