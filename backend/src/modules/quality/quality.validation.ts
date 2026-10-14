import { z } from "zod";
import { VERIFICATION_OUTCOME } from "../../utils/constants";

export const verifyQualitySchema = z.object({
  body: z.object({
    contractId: z.string().min(1),
    actualGrade: z.enum(["A", "B", "C"]).optional(),
    outcome: z.enum([
      VERIFICATION_OUTCOME.ACCEPTED,
      VERIFICATION_OUTCOME.ADJUSTED,
      VERIFICATION_OUTCOME.REJECTED,
      VERIFICATION_OUTCOME.DISPUTED,
    ]),
    adjustedPriceKg: z.number().positive().optional(),
    notes: z.string().max(1000).optional(),
    acceptedQuantityKg: z.number().positive().optional(),
  }),
});

export type VerifyQualityBody = z.infer<typeof verifyQualitySchema>["body"];