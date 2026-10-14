import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../middleware";
import { prisma } from "../../config/database";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  })
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ success: true, data: { count } });
  })
);

router.post(
  "/read",
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id },
      data: { read: true },
    });
    res.json({ success: true });
  })
);

router.post(
  "/read/:notificationId",
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.notificationId, userId: req.user!.id },
      data: { read: true },
    });
    res.json({ success: true });
  })
);

export default router;