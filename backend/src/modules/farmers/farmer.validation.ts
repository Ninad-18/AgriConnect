import { z } from "zod";

export const upsertFarmerProfileSchema = z.object({
  body: z.object({
    farmName: z.string().min(1).optional(),
    location: z.string().optional(),
    crops: z.array(z.string()).optional(),
    farmSizeAcres: z.number().optional(),
    distanceKm: z.number().positive().optional(),
    bio: z.string().max(1000).optional(),
  }),
});

export type UpsertFarmerProfileBody = z.infer<typeof upsertFarmerProfileSchema>["body"];
