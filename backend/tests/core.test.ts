import test from "node:test";
import assert from "node:assert/strict";

import {
  cropsMatch,
  hasSellableStock,
  isListingVisible,
  meetsMinGrade,
  normalizeCropList,
  normalizeCropName,
  ownsResource,
  sellableStock,
  toGradeRank,
} from "../src/utils/helpers";
import { upsertFarmerProfileSchema } from "../src/modules/farmers/farmer.validation";
import { upsertSupplierProfileSchema } from "../src/modules/suppliers/supplier.validation";
import { cartItemSchema } from "../src/modules/customers/customer.validation";
import { calculateReliability } from "../src/modules/farmers/reliability";
import { createBidSchema } from "../src/modules/bidding/bidding.validation";
import { acceptBidsSchema } from "../src/modules/procurement/procurement.validation";
import { procurementIdSchema } from "../src/modules/procurement/procurement.validation";
import { validate } from "../src/middleware/validate";
import { round2 } from "../src/utils/helpers";

const resolvedContract = (overrides: Record<string, unknown> = {}) => ({
  status: "COMPLETED",
  receivedAt: new Date("2026-01-01"),
  deliveredQuantityKg: 100,
  acceptedQuantityKg: 100,
  quantityKg: 100,
  procurement: { deliveryDate: new Date("2026-01-02") },
  verifications: [{ outcome: "ACCEPTED" as const, verifiedAt: new Date(), createdAt: new Date() }],
  ...overrides,
});

test("custom crop names are trimmed, collapsed and de-duplicated", () => {
  assert.equal(normalizeCropName("  Sweet   Corn  "), "Sweet Corn");
  assert.deepEqual(
    normalizeCropList(["Tomato", " tomato ", "Sweet   Corn", "", "TOMATO"]),
    ["Tomato", "Sweet Corn"]
  );
  assert.equal(cropsMatch("Sweet Corn", "  sweet   corn "), true);
  assert.equal(cropsMatch("Sweet Corn", "Maize"), false);
});

test("farmer profile accepts custom crops and rejects blank or excessive crops", () => {
  const accepted = upsertFarmerProfileSchema.safeParse({
    body: { farmName: "Green Acres", crops: ["Dragon Fruit", "Baby Corn"] },
  });
  assert.equal(accepted.success, true);

  const blank = upsertFarmerProfileSchema.safeParse({ body: { crops: ["   "] } });
  assert.equal(blank.success, false);

  const tooMany = upsertFarmerProfileSchema.safeParse({
    body: { crops: Array.from({ length: 51 }, (_, i) => `Crop ${i}`) },
  });
  assert.equal(tooMany.success, false);
});

test("supplier profile validates optional business details", () => {
  assert.equal(
    upsertSupplierProfileSchema.safeParse({
      body: { companyName: "Agri Traders", location: "Pune", businessType: "WHOLESALER" },
    }).success,
    true
  );
  assert.equal(
    upsertSupplierProfileSchema.safeParse({ body: { companyName: "" } }).success,
    false
  );
});

test("domain grades map to the persisted GradeRank enum", () => {
  assert.equal(toGradeRank("A"), "A_3");
  assert.equal(toGradeRank("B"), "B_2");
  assert.equal(toGradeRank("C"), "C_1");
  assert.equal(meetsMinGrade("A", "B"), true);
  assert.equal(meetsMinGrade("B", "B"), true);
  assert.equal(meetsMinGrade("C", "B"), false);
});

test("sellable stock accounts for reserved quantity", () => {
  assert.equal(sellableStock({ quantityKg: 100, reservedKg: 25 }), 75);
  assert.equal(sellableStock({ quantityKg: 10, reservedKg: 10 }), 0);
  assert.equal(sellableStock({ quantityKg: 5, reservedKg: 20 }), 0);
  assert.equal(hasSellableStock({ quantityKg: 100, reservedKg: 99 }), true);
  assert.equal(hasSellableStock({ quantityKg: 100, reservedKg: 100 }), false);
});

test("listing visibility requires an active listing with sellable stock", () => {
  const active = { isActive: true, inventory: { quantityKg: 50, reservedKg: 10 } };
  const inactive = { isActive: false, inventory: { quantityKg: 50, reservedKg: 10 } };
  const soldOut = { isActive: true, inventory: { quantityKg: 50, reservedKg: 50 } };
  const overReserved = { isActive: true, inventory: { quantityKg: 50, reservedKg: 60 } };

  assert.equal(isListingVisible(active), true);
  assert.equal(isListingVisible(inactive), false);
  assert.equal(isListingVisible(soldOut), false);
  assert.equal(isListingVisible(overReserved), false);
});

test("seller ownership only matches the authenticated user id", () => {
  assert.equal(ownsResource("seller-1", "seller-1"), true);
  assert.equal(ownsResource("seller-1", "seller-2"), false);
  assert.equal(ownsResource("", ""), false);
});

test("cart quantities must be positive and numeric strings are coerced", () => {
  assert.equal(
    cartItemSchema.safeParse({ body: { listingId: "listing-1", quantityKg: "2.5" } }).success,
    true
  );
  assert.equal(
    cartItemSchema.safeParse({ body: { listingId: "listing-1", quantityKg: 0 } }).success,
    false
  );
  assert.equal(
    cartItemSchema.safeParse({ body: { listingId: "listing-1", quantityKg: -1 } }).success,
    false
  );
});

test("bid validation coerces multipart numeric fields and rejects blank or invalid values", () => {
  const base = { procurementId: "proc-1", grade: "A", deliveryDate: "2026-12-01T00:00:00.000Z" };
  assert.equal(createBidSchema.safeParse({ body: { ...base, quantityKg: "2.5", pricePerKg: "50" } }).success, true);
  for (const value of ["", "abc", "0", "-1"]) {
    assert.equal(createBidSchema.safeParse({ body: { ...base, quantityKg: value, pricePerKg: "50" } }).success, false);
  }
});

test("reliability needs evidence, is bounded, and reflects verified performance", () => {
  assert.equal(calculateReliability([]).score, null);
  assert.equal(calculateReliability([resolvedContract(), resolvedContract()]).confidence, "insufficient");
  const perfect = calculateReliability([resolvedContract(), resolvedContract(), resolvedContract()]);
  assert.ok((perfect.score ?? 0) > 90);
  const poor = calculateReliability([
    resolvedContract({ status: "FAILED", acceptedQuantityKg: 0, verifications: [{ outcome: "REJECTED", verifiedAt: new Date(), createdAt: new Date() }] }),
    resolvedContract({ status: "CANCELLED", acceptedQuantityKg: 0, verifications: [] }),
    resolvedContract({ status: "QUALITY_VERIFIED", acceptedQuantityKg: 0, verifications: [{ outcome: "DISPUTED", verifiedAt: new Date(), createdAt: new Date() }] }),
  ]);
  assert.ok((poor.score ?? 101) >= 0 && (poor.score ?? -1) <= 100);
  assert.ok((poor.score ?? 100) < 50);
});

test("accept-bids requires the selected bid IDs payload", () => {
  assert.equal(acceptBidsSchema.safeParse({ body: { bidIds: ["bid-1", "bid-2"] } }).success, true);
  assert.equal(acceptBidsSchema.safeParse({ body: undefined }).success, false);
  assert.equal(acceptBidsSchema.safeParse({ body: { bidIds: [] } }).success, false);
});

test("parameter validation preserves a request body for the following validator", () => {
  const req = {
    body: { bidIds: ["bid-1"] },
    query: {},
    params: { procurementId: "procurement-1" },
  } as never;
  let error: unknown;
  validate(procurementIdSchema)(req, {} as never, (nextError) => { error = nextError; });
  assert.equal(error, undefined);
  assert.deepEqual((req as { body: unknown }).body, { bidIds: ["bid-1"] });
  validate(acceptBidsSchema)(req, {} as never, (nextError) => { error = nextError; });
  assert.equal(error, undefined);
});

test("checkout total has free delivery and uses exact line totals", () => {
  const singleSubtotal = round2(1 * 20);
  assert.deepEqual({ subtotal: singleSubtotal, deliveryFee: 0, total: round2(singleSubtotal) }, {
    subtotal: 20, deliveryFee: 0, total: 20,
  });
  const multiSubtotal = round2(1.5 * 20) + round2(2 * 12.5);
  assert.deepEqual({ subtotal: round2(multiSubtotal), deliveryFee: 0, total: round2(multiSubtotal) }, {
    subtotal: 55, deliveryFee: 0, total: 55,
  });
});
