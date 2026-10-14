import { z } from "zod";

export const upsertCustomerProfileSchema = z.object({
  body: z.object({
    defaultAddress: z.string().optional(),
  }),
});

export const addressSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(3).max(10),
    phone: z.string().optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const cartItemSchema = z.object({
  body: z.object({
    listingId: z.string().min(1),
    quantityKg: z.number().positive(),
  }),
});

export type UpsertCustomerProfileBody = z.infer<typeof upsertCustomerProfileSchema>["body"];
