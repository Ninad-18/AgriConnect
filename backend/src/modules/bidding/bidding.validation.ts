import { z } from "zod";
import { Grade } from "../../utils/constants";

// Multipart form fields arrive as strings. Reject blank strings before Zod's
// coercion, then enforce finite positive numeric values on the server.
const requiredPositiveNumber = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().finite().positive()
);

export const createBidSchema = z.object({
  body: z.object({
    procurementId: z.string().min(1),
    quantityKg: requiredPositiveNumber,
    pricePerKg: requiredPositiveNumber,
    grade: z.enum([Grade.A, Grade.B, Grade.C]),
    deliveryDate: z.string().datetime(),
    note: z.string().max(1000).optional(),
  }),
});

export const updateBidSchema = z.object({
  body: z.object({
    quantityKg: requiredPositiveNumber.optional(),
    pricePerKg: requiredPositiveNumber.optional(),
    grade: z.enum([Grade.A, Grade.B, Grade.C]).optional(),
    deliveryDate: z.string().datetime().optional(),
    note: z.string().max(1000).optional(),
  }),
});

export const bidIdSchema = z.object({
  params: z.object({ bidId: z.string().min(1) }),
});

export type CreateBidBody = z.infer<typeof createBidSchema>["body"];
export type UpdateBidBody = z.infer<typeof updateBidSchema>["body"];
