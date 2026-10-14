import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authLimiter } from "../../middleware/rateLimiter";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../middleware";
import * as authController from "./auth.controller";
import { registerSchema, loginSchema } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login));

router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
