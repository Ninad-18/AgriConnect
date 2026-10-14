export const Role = {
  FARMER: "FARMER",
  SUPPLIER: "SUPPLIER",
  CUSTOMER: "CUSTOMER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Grade = {
  A: "A",
  B: "B",
  C: "C",
} as const;
export type Grade = (typeof Grade)[keyof typeof Grade];

// Higher = better grade. Used to compare minimum-grade requirements.
export const GRADE_RANK: Record<Grade, number> = { A: 3, B: 2, C: 1 };

// Default smart-allocation weights (configurable per request)
export const DEFAULT_ALLOCATION_WEIGHTS = {
  price: 0.3,
  quality: 0.25,
  quantity: 0.15,
  delivery: 0.1,
  distance: 0.1,
  reliability: 0.1,
};

export const PROCUREMENT_STATUS = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  BIDDING_CLOSED: "BIDDING_CLOSED",
  UNDER_SELECTION: "UNDER_SELECTION",
  PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
  FULLY_ALLOCATED: "FULLY_ALLOCATED",
  IN_DELIVERY: "IN_DELIVERY",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type ProcurementStatus = (typeof PROCUREMENT_STATUS)[keyof typeof PROCUREMENT_STATUS];

export const ALLOCATION_MODE = {
  MANUAL: "MANUAL",
  SMART: "SMART",
} as const;
export type AllocationMode = (typeof ALLOCATION_MODE)[keyof typeof ALLOCATION_MODE];

export const TRANSPORT_MODE = {
  SUPPLIER: "SUPPLIER",
  FARMER: "FARMER",
} as const;
export type TransportMode = (typeof TRANSPORT_MODE)[keyof typeof TRANSPORT_MODE];

export const VERIFICATION_OUTCOME = {
  ACCEPTED: "ACCEPTED",
  ADJUSTED: "ADJUSTED",
  REJECTED: "REJECTED",
  DISPUTED: "DISPUTED",
  PENDING: "PENDING",
} as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOME)[keyof typeof VERIFICATION_OUTCOME];

export const PAYMENT_STATUS = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export function meetsMinGrade(grade: Grade, minGrade: Grade): boolean {
  return GRADE_RANK[grade] >= GRADE_RANK[minGrade];
}

export function gradeRank(grade: Grade): number {
  return GRADE_RANK[grade] ?? 0;
}

export const BID_STATUS = {
  SUBMITTED: "SUBMITTED",
  ACTIVE: "ACTIVE",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
  EXPIRED: "EXPIRED",
} as const;
export type BidStatus = (typeof BID_STATUS)[keyof typeof BID_STATUS];

export const CONTRACT_STATUS = {
  CREATED: "CREATED",
  ACCEPTED: "ACCEPTED",
  IN_DELIVERY: "IN_DELIVERY",
  RECEIVED: "RECEIVED",
  QUALITY_VERIFIED: "QUALITY_VERIFIED",
  COMPLETED: "COMPLETED",
  LATE: "LATE",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

export const ORDER_STATUS = {
  CREATED: "CREATED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
