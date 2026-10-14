import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware";
import { z } from "zod";
import { prisma } from "../../config/database";
import { uploadImages } from "../../middleware/upload";
import { uploadImage } from "../../config/cloudinary";
import { AppError } from "../../middleware/errorHandler";

const router = Router();

const listingSchema = z.object({
  body: z.object({
    inventoryId: z.string().min(1),
    title: z.string().min(1).max(150),
    description: z.string().max(2000).optional(),
    pricePerKg: z.number().positive(),
  }),
});

// Public: browse listings (search/filter via query)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, grade, supplierId, maxPrice } = req.query;
    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.title = { contains: search as string, mode: "insensitive" };
    }
    if (grade) {
      where.inventory = { grade: grade as string };
    }
    if (supplierId) where.supplierId = supplierId as string;
    if (maxPrice) where.pricePerKg = { lte: Number(maxPrice) };

    const listings = await prisma.productListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        inventory: { select: { quantityKg: true, reservedKg: true, grade: true, cropName: true } },
      },
    });
    res.json({ success: true, data: listings });
  })
);

router.get(
  "/:listingId",
  asyncHandler(async (req, res) => {
    const listing = await prisma.productListing.findUnique({
      where: { id: req.params.listingId },
      include: {
        inventory: true,
      },
    });
    if (!listing) throw new AppError(404, "Listing not found");
    res.json({ success: true, data: listing });
  })
);

// Supplier: create listing from inventory
router.post(
  "/",
  authenticate,
  authorize("SUPPLIER"),
  uploadImages,
  validate(listingSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    const urls: string[] = [];
    for (const file of files) {
      const { url } = await uploadImage(file.buffer, { folder: "agriconnect/listings" });
      urls.push(url);
    }

    const inventory = await prisma.inventoryItem.findUnique({
      where: { id: req.body.inventoryId },
    });
    if (!inventory) throw new AppError(404, "Inventory item not found");
    if (inventory.supplierId !== req.user!.id) throw new AppError(403, "Not your inventory");

    const listing = await prisma.productListing.create({
      data: {
        supplierId: req.user!.id,
        inventoryId: inventory.id,
        title: req.body.title,
        description: req.body.description,
        pricePerKg: req.body.pricePerKg,
        images: urls as unknown as object,
      },
    });
    res.status(201).json({ success: true, data: listing });
  })
);

router.put(
  "/:listingId",
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(async (req, res) => {
    const listing = await prisma.productListing.findUnique({ where: { id: req.params.listingId } });
    if (!listing) throw new AppError(404, "Listing not found");
    if (listing.supplierId !== req.user!.id) throw new AppError(403, "Not your listing");
    const updated = await prisma.productListing.update({
      where: { id: req.params.listingId },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  })
);

router.delete(
  "/:listingId",
  authenticate,
  authorize("SUPPLIER"),
  asyncHandler(async (req, res) => {
    const listing = await prisma.productListing.findUnique({ where: { id: req.params.listingId } });
    if (!listing) throw new AppError(404, "Listing not found");
    if (listing.supplierId !== req.user!.id) throw new AppError(403, "Not your listing");
    await prisma.productListing.update({
      where: { id: req.params.listingId },
      data: { isActive: false },
    });
    res.json({ success: true, data: { id: req.params.listingId, isActive: false } });
  })
);

export default router;
