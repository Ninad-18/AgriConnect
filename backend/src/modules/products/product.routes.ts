import { Router } from "express";
import { Prisma } from "@prisma/client";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { z } from "zod";
import { prisma } from "../../config/database";
import { uploadImages } from "../../middleware/upload";
import { uploadImage } from "../../config/cloudinary";
import { AppError } from "../../middleware/errorHandler";
import {
  isListingVisible,
  normalizeCropName,
  ownsResource,
} from "../../utils/helpers";

const router = Router();

const gradeSchema = z.enum(["A", "B", "C"]);

const listingSchema = z.object({
  body: z
    .object({
      inventoryId: z.string().trim().min(1).optional(),
      cropName: z.string().trim().min(1).max(100).optional(),
      grade: gradeSchema.optional(),
      quantityKg: z.coerce.number().finite().positive().optional(),
      title: z.string().trim().min(1).max(150),
      description: z.string().max(2000).optional(),
      pricePerKg: z.coerce.number().finite().positive(),
    })
    .superRefine((body, ctx) => {
      if (body.inventoryId) return;
      if (!body.cropName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cropName"], message: "cropName is required when no inventoryId is supplied" });
      }
      if (!body.grade) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["grade"], message: "grade is required when no inventoryId is supplied" });
      }
      if (!body.quantityKg) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantityKg"], message: "quantityKg is required when no inventoryId is supplied" });
      }
    }),
});

const updateListingSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(150).optional(),
      description: z.string().max(2000).nullable().optional(),
      pricePerKg: z.coerce.number().finite().positive().optional(),
      quantityKg: z.coerce.number().finite().nonnegative().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: "No fields supplied" }),
});

type SellerSummary = {
  id: string;
  name: string;
  role: string;
  location: string | null;
};

async function attachSellers<T extends { supplierId: string }>(listings: T[]) {
  const sellerIds = [...new Set(listings.map((listing) => listing.supplierId))];
  if (sellerIds.length === 0) return listings as (T & { seller: SellerSummary | null })[];
  const sellers = await prisma.user.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, name: true, role: true, location: true },
  });
  const byId = new Map(sellers.map((seller) => [seller.id, seller]));
  return listings.map((listing) => ({
    ...listing,
    seller: byId.get(listing.supplierId) ?? null,
  }));
}

async function findOrCreateProduct(
  tx: Prisma.TransactionClient,
  cropName: string
) {
  const normalized = normalizeCropName(cropName);
  const existing = await tx.product.findFirst({
    where: {
      OR: [
        { name: { equals: normalized, mode: "insensitive" } },
        { cropName: { equals: normalized, mode: "insensitive" } },
      ],
    },
  });
  if (existing) return existing;
  return tx.product.create({
    data: { name: normalized, cropName: normalized, isActive: true },
  });
}

function isVisible(listing: {
  isActive: boolean;
  inventory: { quantityKg: number; reservedKg: number };
}) {
  return isListingVisible(listing);
}

// Public: browse listings. Only active listings with real sellable stock are
// visible, regardless of whether the seller is a farmer or a supplier.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const crop = typeof req.query.crop === "string" ? req.query.crop.trim() : "";
    const grade = typeof req.query.grade === "string" ? req.query.grade.toUpperCase() : "";
    const sellerId =
      typeof req.query.sellerId === "string"
        ? req.query.sellerId
        : typeof req.query.supplierId === "string"
          ? req.query.supplierId
          : "";
    const sellerRole = typeof req.query.sellerRole === "string" ? req.query.sellerRole.toUpperCase() : "";
    const maxPriceRaw = typeof req.query.maxPrice === "string" ? Number(req.query.maxPrice) : NaN;
    const minPriceRaw = typeof req.query.minPrice === "string" ? Number(req.query.minPrice) : NaN;
    const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";

    if (grade && !["A", "B", "C"].includes(grade)) {
      throw new AppError(400, "Grade must be A, B or C");
    }
    if (sellerRole && !["FARMER", "SUPPLIER"].includes(sellerRole)) {
      throw new AppError(400, "sellerRole must be FARMER or SUPPLIER");
    }

    const where: Prisma.ProductListingWhereInput = { isActive: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { inventory: { cropName: { contains: search, mode: "insensitive" } } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (crop) where.inventory = { cropName: { equals: crop, mode: "insensitive" } };
    if (grade) {
      where.inventory = { ...(where.inventory as object), grade: grade as "A" | "B" | "C" };
    }
    if (sellerId) where.supplierId = sellerId;
    if (sellerRole) where.sellerRole = sellerRole as "FARMER" | "SUPPLIER";
    const priceFilter: Prisma.FloatFilter = {};
    if (Number.isFinite(maxPriceRaw) && maxPriceRaw >= 0) priceFilter.lte = maxPriceRaw;
    if (Number.isFinite(minPriceRaw) && minPriceRaw >= 0) priceFilter.gte = minPriceRaw;
    if (Object.keys(priceFilter).length > 0) where.pricePerKg = priceFilter;

    const orderBy: Prisma.ProductListingOrderByWithRelationInput =
      sort === "price_asc"
        ? { pricePerKg: "asc" }
        : sort === "price_desc"
          ? { pricePerKg: "desc" }
          : sort === "oldest"
            ? { createdAt: "asc" }
            : { createdAt: "desc" };

    const listings = await prisma.productListing.findMany({
      where,
      orderBy,
      include: {
        product: { select: { id: true, name: true, cropName: true } },
        inventory: {
          select: {
            id: true,
            quantityKg: true,
            reservedKg: true,
            grade: true,
            cropName: true,
            status: true,
          },
        },
      },
    });

    const visible = listings.filter((listing) => isVisible(listing));
    res.json({ success: true, data: await attachSellers(visible) });
  })
);

// Seller: own listings, including inactive and out-of-stock ones.
router.get(
  "/mine",
  authenticate,
  authorize("FARMER", "SUPPLIER"),
  asyncHandler(async (req, res) => {
    const listings = await prisma.productListing.findMany({
      where: { supplierId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, cropName: true } },
        inventory: true,
      },
    });
    res.json({ success: true, data: await attachSellers(listings) });
  })
);

// Used by procurement custom-crop suggestions (only on authenticated clients).
router.get(
  "/meta/crops",
  authenticate,
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { cropName: true },
      orderBy: { cropName: "asc" },
    });
    const profiles = await prisma.farmerProfile.findMany({ select: { crops: true } });
    const crops = new Map<string, string>();
    for (const product of products) crops.set(product.cropName.toLowerCase(), product.cropName);
    for (const profile of profiles) {
      for (const crop of profile.crops) {
        if (crop.trim()) crops.set(crop.trim().toLowerCase(), crop.trim());
      }
    }
    res.json({ success: true, data: [...crops.values()].sort((a, b) => a.localeCompare(b)) });
  })
);

// Public: listing detail. Inactive or sold-out listings are not purchasable.
router.get(
  "/:listingId",
  asyncHandler(async (req, res) => {
    const listing = await prisma.productListing.findUnique({
      where: { id: req.params.listingId },
      include: {
        product: { select: { id: true, name: true, cropName: true } },
        inventory: true,
      },
    });
    if (!listing || !isVisible(listing)) {
      throw new AppError(404, "Listing not found or currently unavailable");
    }
    const [withSeller] = await attachSellers([listing]);
    res.json({ success: true, data: withSeller });
  })
);

// Farmer or supplier: create a listing either from owned inventory or directly
// from crop/grade/quantity. Direct creation creates seller-owned inventory.
router.post(
  "/",
  authenticate,
  authorize("FARMER", "SUPPLIER"),
  uploadImages,
  validate(listingSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    const urls: string[] = [];
    for (const file of files) {
      const { url } = await uploadImage(file.buffer, {
        folder: "agriconnect/listings",
        mimeType: file.mimetype,
      });
      urls.push(url);
    }

    const body = req.body as z.infer<typeof listingSchema>["body"];

    const listing = await prisma.$transaction(async (tx) => {
      let inventory;
      let productId: string | null = null;

      if (body.inventoryId) {
        inventory = await tx.inventoryItem.findUnique({ where: { id: body.inventoryId } });
        if (!inventory) throw new AppError(404, "Inventory item not found");
        if (!ownsResource(inventory.supplierId, req.user!.id)) throw new AppError(403, "Not your inventory");
        if (inventory.quantityKg - inventory.reservedKg <= 0) {
          throw new AppError(400, "This inventory item has no sellable stock");
        }
        const existing = await tx.productListing.findUnique({ where: { inventoryId: inventory.id } });
        if (existing) throw new AppError(409, "This inventory item already has a listing");
        productId = inventory.productId;
      } else {
        const cropName = normalizeCropName(body.cropName!);
        const product = await findOrCreateProduct(tx, cropName);
        productId = product.id;
        inventory = await tx.inventoryItem.create({
          data: {
            supplierId: req.user!.id,
            sellerRole: req.user!.role,
            productId,
            cropName,
            grade: body.grade!,
            quantityKg: body.quantityKg!,
            status: "AVAILABLE",
          },
        });
      }

      const product = productId
        ? await tx.product.findUnique({ where: { id: productId }, select: { id: true, name: true, cropName: true } })
        : null;

      return tx.productListing.create({
        data: {
          supplierId: req.user!.id,
          sellerRole: req.user!.role,
          inventoryId: inventory.id,
          productId,
          title: body.title,
          description: body.description || null,
          pricePerKg: body.pricePerKg,
          images: urls as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
        include: { inventory: true, product: { select: { id: true, name: true, cropName: true } } },
      });
    });

    res.status(201).json({ success: true, data: listing });
  })
);

// Seller: update editable fields and stock. Ownership is always checked by the
// seller id, never from a client-supplied id.
router.put(
  "/:listingId",
  authenticate,
  authorize("FARMER", "SUPPLIER"),
  validate(updateListingSchema),
  asyncHandler(async (req, res) => {
    const listing = await prisma.productListing.findUnique({
      where: { id: req.params.listingId },
      include: { inventory: true },
    });
    if (!listing) throw new AppError(404, "Listing not found");
    if (!ownsResource(listing.supplierId, req.user!.id)) throw new AppError(403, "Not your listing");

    const body = req.body as z.infer<typeof updateListingSchema>["body"];

    const updated = await prisma.$transaction(async (tx) => {
      if (body.quantityKg !== undefined) {
        if (body.quantityKg < listing.inventory.reservedKg) {
          throw new AppError(
            400,
            `Quantity cannot be lower than the ${listing.inventory.reservedKg}kg already reserved`
          );
        }
        const sellable = body.quantityKg - listing.inventory.reservedKg;
        await tx.inventoryItem.update({
          where: { id: listing.inventoryId },
          data: {
            quantityKg: body.quantityKg,
            status: sellable <= 0 ? "SOLD_OUT" : listing.inventory.reservedKg > 0 ? "RESERVED" : "AVAILABLE",
          },
        });
      }

      return tx.productListing.update({
        where: { id: listing.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.pricePerKg !== undefined ? { pricePerKg: body.pricePerKg } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        include: { inventory: true, product: { select: { id: true, name: true, cropName: true } } },
      });
    });

    res.json({ success: true, data: updated });
  })
);

// Seller: soft-unpublish. Historical order items keep their listing reference.
router.delete(
  "/:listingId",
  authenticate,
  authorize("FARMER", "SUPPLIER"),
  asyncHandler(async (req, res) => {
    const listing = await prisma.productListing.findUnique({ where: { id: req.params.listingId } });
    if (!listing) throw new AppError(404, "Listing not found");
    if (!ownsResource(listing.supplierId, req.user!.id)) throw new AppError(403, "Not your listing");
    await prisma.productListing.update({
      where: { id: req.params.listingId },
      data: { isActive: false },
    });
    res.json({ success: true, data: { id: req.params.listingId, isActive: false } });
  })
);

export default router;
