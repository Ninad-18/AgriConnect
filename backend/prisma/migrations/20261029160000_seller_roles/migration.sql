-- Additive migration: listings and inventory can now be owned by farmers as well
-- as suppliers. Existing rows keep their current supplier ownership.
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "sellerRole" "Role" NOT NULL DEFAULT 'SUPPLIER';

ALTER TABLE "ProductListing"
  ADD COLUMN IF NOT EXISTS "sellerRole" "Role" NOT NULL DEFAULT 'SUPPLIER';

CREATE INDEX IF NOT EXISTS "ProductListing_sellerRole_idx"
  ON "ProductListing"("sellerRole");

CREATE INDEX IF NOT EXISTS "InventoryItem_sellerRole_idx"
  ON "InventoryItem"("sellerRole");
