export type Role = "FARMER" | "SUPPLIER" | "CUSTOMER";
export type Grade = "A" | "B" | "C";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  location?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface FarmerProfile {
  id: string;
  userId: string;
  farmName?: string;
  location?: string;
  crops: string[];
  farmSizeAcres?: number;
  distanceKm: number;
  bio?: string;
  reliability: number | null;
  reliabilitySummary?: {
    score: number | null;
    transactionCount: number;
    confidence: "insufficient" | "low" | "medium" | "high";
    explanation: string;
    components: Partial<Record<"fulfilment" | "onTime" | "quality" | "conduct" | "history", number>>;
  };
}

export interface SupplierProfile {
  id: string;
  userId: string;
  companyName?: string;
  location?: string;
  businessType?: string;
  bio?: string;
}

export interface ProcurementRequest {
  id: string;
  productId: string;
  product: { name: string; id: string };
  supplierId: string;
  quantityKg: number;
  minGrade: Grade;
  deliveryDate: string;
  bidDeadline: string;
  transport: "SUPPLIER" | "FARMER";
  allowPartial: boolean;
  allocationMode: "MANUAL" | "SMART";
  targetPrice?: number;
  notes?: string;
  status: string;
  awardedQuantityKg: number;
  requiredQuantityKg: number;
  createdAt: string;
  bids?: Bid[];
  _count?: { bids: number; contracts: number };
}

export interface BidImage {
  id: string;
  url: string;
}

export interface QualityAssessment {
  _id?: string;
  model?: string;
  output?: {
    capabilityStatus?: string;
    modelVersion?: string;
    classification?: { label?: string; confidence?: number } | null;
    defects?: Array<{ label: string; confidence: number; box?: number[] }>;
    gradeEstimate?: string | null;
    warnings?: string[];
    reason?: string;
  };
}

export interface Bid {
  id: string;
  procurementId: string;
  farmerId: string;
  quantityKg: number;
  pricePerKg: number;
  grade: Grade;
  deliveryDate: string;
  note?: string;
  status: string;
  distanceKm?: number;
  farmLocation?: string;
  createdAt: string;
  images: BidImage[];
  qualityAssessments?: QualityAssessment[];
  farmer?: { id: string; name: string };
  procurement?: ProcurementRequest;
  contracts?: FarmerContract[];
}

export interface FarmerContract {
  id: string;
  procurementId: string;
  bidId: string;
  farmerId: string;
  supplierId: string;
  quantityKg: number;
  pricePerKg: number;
  grade: Grade;
  amount: number;
  status: string;
  transport: "SUPPLIER" | "FARMER";
  deliveredQuantityKg: number;
  acceptedQuantityKg: number;
  receivedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  farmer?: { id: string; name: string };
  verifications?: QualityVerification[];
}

export interface QualityVerification {
  id: string;
  contractId: string;
  declaredGrade: Grade;
  actualGrade?: Grade;
  outcome: "PENDING" | "ACCEPTED" | "ADJUSTED" | "REJECTED" | "DISPUTED";
  adjustedPriceKg?: number;
  notes?: string;
  verifiedAt?: string;
}

export interface RecommendationBid {
  id: string;
  bidderId: string;
  quantityKg: number;
  pricePerKg: number;
  grade: Grade;
  deliveryDate: string;
  distanceKm?: number;
  reliability: number;
  score: number;
  breakdown?: Record<string, number>;
}

export interface AllocationResult {
  procurementId: string;
  weights: Record<string, number>;
  rankedBids: RecommendationBid[];
  recommendedBids: RecommendationBid[];
  totalKg: number;
  totalCost: number;
  avgPrice: number;
  coverage: number;
}

export interface Address {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  isDefault: boolean;
}

export interface ProductListing {
  id: string;
  supplierId: string;
  sellerRole?: Role;
  seller?: {
    id: string;
    name: string;
    role: Role;
    location?: string | null;
  } | null;
  inventoryId: string;
  productId?: string | null;
  product?: { id: string; name: string; cropName: string } | null;
  title: string;
  description?: string;
  pricePerKg: number;
  images: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  inventory?: {
    id?: string;
    quantityKg: number;
    reservedKg: number;
    grade: Grade;
    cropName: string;
    status?: "AVAILABLE" | "RESERVED" | "SOLD_OUT";
  };
}

export interface CartItem {
  id: string;
  listingId: string;
  quantityKg: number;
  unitPrice: number;
  listing: ProductListing;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  listingId?: string;
  title: string;
  quantityKg: number;
  unitPrice: number;
  amount: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  supplierId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

export interface MarketPrice {
  id: string;
  crop: string;
  unit: string;
  current: number;
  avg30d?: number;
  min30d?: number;
  max30d?: number;
  source: string;
  history: { date: string; price: number }[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  supplierId: string;
  sellerRole?: Role;
  cropName: string;
  grade: Grade;
  quantityKg: number;
  reservedKg: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD_OUT";
  listing?: ProductListing;
}
