import { z } from "zod";
import { Grade, ALLOCATION_MODE, TRANSPORT_MODE } from "../../utils/constants";

export const createProcurementSchema = z.object({
  body: z.object({
    productId: z.string().uuid().optional(),
    productName: z.string().min(1).max(100),
    quantityKg: z.number().positive(),
    minGrade: z.enum([Grade.A, Grade.B, Grade.C]),
    deliveryDate: z.string().datetime(),
    bidDeadline: z.string().datetime(),
    transport: z.enum([TRANSPORT_MODE.SUPPLIER, TRANSPORT_MODE.FARMER]),
    allowPartial: z.boolean().default(true),
    allocationMode: z
      .enum([ALLOCATION_MODE.MANUAL, ALLOCATION_MODE.SMART])
      .default(ALLOCATION_MODE.SMART),
    targetPrice: z.number().positive().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const acceptBidsSchema = z.object({
  body: z.object({
    bidIds: z.array(z.string().min(1)).min(1),
  }),
});

export const procurementIdSchema = z.object({
  params: z.object({ procurementId: z.string().min(1) }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(["OPEN", "BIDDING_CLOSED", "CANCELLED"]),
  }),
});

export type CreateProcurementBody = z.infer<typeof createProcurementSchema>["body"];
export type AcceptBidsBody = z.infer<typeof acceptBidsSchema>["body"];