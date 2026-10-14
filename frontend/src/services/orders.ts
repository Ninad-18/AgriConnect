import { api } from "@/services/api";
import type { CustomerOrder } from "@/types";

export async function checkout(addressId: string): Promise<{
  order: CustomerOrder;
  razorpayOrderId: string;
  amount: number;
}> {
  const { data } = await api.post("/orders", { addressId });
  return data.data;
}

export async function fetchOrders(): Promise<CustomerOrder[]> {
  const { data } = await api.get("/orders");
  return data.data ?? [];
}

export async function fetchOrder(id: string): Promise<CustomerOrder> {
  const { data } = await api.get(`/orders/${id}`);
  return data.data as CustomerOrder;
}

export async function createPaymentOrder(orderId: string): Promise<{
  razorpayOrderId: string;
  amountPaisa: number;
  currency: string;
  keyId?: string;
  orderId: string;
}> {
  const { data } = await api.post("/payments/create-order", { orderId });
  return data.data;
}

export async function verifyPayment(orderId: string): Promise<{ status: string }> {
  const { data } = await api.post("/payments/verify", { orderId });
  return data.data;
}