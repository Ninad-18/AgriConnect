import { z } from "zod";

export const upsertSupplierProfileSchema = z.object({
  body: z.object({
    companyName: z.string().min(1).optional(),
    location: z.string().optional(),
    businessType: z.string().optional(),
    bio: z.string().max(1000).optional(),
  }),
});

export type UpsertSupplierProfileBody = z.infer<typeof upsertSupplierProfileSchema>["body"];
