import { z } from "zod";

const cropNameSchema = z.string().trim().min(1).max(80);

export const upsertFarmerProfileSchema = z.object({
  body: z.object({
    farmName: z.string().trim().min(1).max(150).optional(),
    location: z.string().trim().max(200).optional(),
    // Crops are user-defined so farmers are not limited to the built-in list.
    crops: z.array(cropNameSchema).max(50).optional(),
    farmSizeAcres: z.number().nonnegative().optional(),
    distanceKm: z.number().positive().optional(),
    bio: z.string().max(1000).optional(),
  }),
});

export type UpsertFarmerProfileBody = z.infer<typeof upsertFarmerProfileSchema>["body"];
