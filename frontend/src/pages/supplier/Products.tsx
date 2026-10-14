import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchInventory } from "@/services/inventory";
import { fetchListings, createListing, updateListing, deactivateListing } from "@/services/products";
import { isUploadable, getErrorMessage } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { InventoryItem, ProductListing } from "@/types";
import { fmtINR, fmtKg } from "@/lib/format";
import { Spinner, EmptyState, Badge } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Products() {
  const { user } = useAuth();
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // create-form state
  const [invId, setInvId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const load = () =>
    Promise.all([
      fetchListings(user ? { supplierId: user.id } : undefined),
      fetchInventory(),
    ])
      .then(([l, i]) => {
        setListings(l);
        setInventory(i);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onFiles = (fl: FileList | null) => {
    if (!fl) return;
    setFiles(Array.from(fl).filter((f) => isUploadable(f)).slice(0, 5));
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invId || Number(price) <= 0) return toast.error("Select inventory and enter a valid price");
    setSubmitting(true);
    try {
      const res = await createListing({
        inventoryId: invId,
        title,
        description: description || undefined,
        pricePerKg: Number(price),
        images: files,
      });
      toast.success("Listing created");
      setModal(false);
      resetForm();
      setListings((prev) => [res, ...prev]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setInvId("");
    setTitle("");
    setDescription("");
    setPrice("");
    setFiles([]);
  };

  const onToggle = async (l: ProductListing) => {
    try {
      await updateListing(l.id, { isActive: !l.isActive });
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, isActive: !l.isActive } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDelete = async (l: ProductListing) => {
    try {
      if (!confirm(`Deactivate "${l.title}"?`)) return;
      await deactivateListing(l.id);
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, isActive: false } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  const sellableInventory = inventory.filter((i) => i.quantityKg - i.reservedKg > 0 && !i.listing);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Product Listings"
        description="Publish inventory as customer-facing listings."
        actions={<button className="btn-primary" onClick={() => setModal(true)}>+ New listing</button>}
      />

      {listings.length === 0 ? (
        <EmptyState title="No listings yet" hint="Create listings from your verified inventory." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
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
                <h3 className="font-semibold text-forest">{l.title}</h3>
                <Badge status={l.isActive ? "AVAILABLE" : "DRAFT"} />
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {fmtINR(l.pricePerKg)}/kg · {l.inventory ? fmtKg(l.inventory.quantityKg - l.inventory.reservedKg) : "?"} available · Grade {l.inventory?.grade}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-stone-400">{l.description}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary !py-1.5 flex-1" onClick={() => onToggle(l)}>
                  {l.isActive ? "Deactivate" : "Activate"}
                </button>
                <button className="btn-secondary !py-1.5 text-red-600" onClick={() => onDelete(l)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <form className="card w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={onCreate}>
            <h3 className="text-lg font-semibold text-forest">Create listing</h3>
            {sellableInventory.length === 0 ? (
              <p className="text-sm text-stone-500">
                No unreserved inventory available. Verify & accept deliveries to build stock.
              </p>
            ) : (
              <>
                <div>
                  <label className="label">Inventory item</label>
                  <select className="input" value={invId} onChange={(e) => setInvId(e.target.value)}>
                    <option value="">Select...</option>
                    {sellableInventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.cropName} (grade {i.grade}) · {fmtKg(i.quantityKg - i.reservedKg)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Organic Nashik Tomatoes" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="label">Price (₹/kg)</label>
                  <input className="input" type="number" min="0.01" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="label">Photos</label>
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
                  <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                  <button className="btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Publish"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}