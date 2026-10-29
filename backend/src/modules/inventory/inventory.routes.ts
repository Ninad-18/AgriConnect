import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware";
import { prisma } from "../../config/database";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("FARMER", "SUPPLIER"),
  asyncHandler(async (req, res) => {
    const items = await prisma.inventoryItem.findMany({
      where: { supplierId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      include: { listing: true },
    });
    res.json({ success: true, data: items });
  })
);

export default router;
