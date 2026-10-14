import { z } from "zod";
import { Grade } from "../../utils/constants";

export const createBidSchema = z.object({
  body: z.object({
    procurementId: z.string().min(1),
    quantityKg: z.number().positive(),
    pricePerKg: z.number().positive(),
    grade: z.enum([Grade.A, Grade.B, Grade.C]),
    deliveryDate: z.string().datetime(),
    note: z.string().max(1000).optional(),
  }),
});

export const updateBidSchema = z.object({
  body: z.object({
    quantityKg: z.number().positive().optional(),
    pricePerKg: z.number().positive().optional(),
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
