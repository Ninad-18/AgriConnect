import { api } from "@/services/api";
import type { FarmerContract, QualityVerification } from "@/types";

export interface VerifyQualityInput {
  contractId: string;
  outcome: "ACCEPTED" | "ADJUSTED" | "REJECTED" | "DISPUTED";
  actualGrade?: "A" | "B" | "C";
  adjustedPriceKg?: number;
  notes?: string;
  acceptedQuantityKg?: number;
}

export async function receiveContract(
  contractId: string,
  receivedQuantityKg?: number
): Promise<FarmerContract> {
  const { data } = await api.post(`/quality/contracts/${contractId}/receive`, {
    receivedQuantityKg,
  });
  return data.data as FarmerContract;
}

export async function verifyQuality(input: VerifyQualityInput): Promise<QualityVerification> {
  const { data } = await api.post("/quality/verify", input);
  return data.data as QualityVerification;
}