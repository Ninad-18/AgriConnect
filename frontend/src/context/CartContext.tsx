import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/services/api";
import type { Cart } from "@/types";

const STORAGE_KEY = "agriconnect_cart";

export interface CartContextValue {
  cart: Cart | null;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (listingId: string, quantityKg: number) => Promise<void>;
  update: (itemId: string, quantityKg: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  ensureGuestCart: (userId?: string) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

let _cartSet = false;

function readGuestCart(): Cart | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cart) : null;
  } catch {
    return null;
  }
}

function writeGuestCart(cart: Cart | null) {
  if (cart) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  else localStorage.removeItem(STORAGE_KEY);
}

export function CartProvider({ children, userId, isCustomer }: { children: ReactNode; userId?: string; isCustomer: boolean }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!userId || !isCustomer) {
      setCart(readGuestCart());
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/customers/cart");
      setCart((res.data.data ?? null) as Cart | null);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isCustomer]);

  const add = async (listingId: string, quantityKg: number) => {
    if (!userId || !isCustomer) {
      const current = readGuestCart();
      const merged: Cart = {
        id: "guest",
        items: [
          ...(current?.items ?? []).filter((i) => i.listingId !== listingId),
          { id: `g-${listingId}`, listingId, quantityKg, unitPrice: 0, listing: {} as never },
        ],
      };
      _cartSet = true;
      writeGuestCart(merged);
      setCart(merged);
      return;
    }
    const res = await api.post("/customers/cart/items", { listingId, quantityKg });
    setCart((res.data.data ?? null) as Cart | null);
  };

  const update = async (itemId: string, quantityKg: number) => {
    if (!userId || !isCustomer) {
      const current = readGuestCart();
      const items = (current?.items ?? []).map((i) =>
        i.id === itemId || i.listingId === itemId ? { ...i, quantityKg } : i
      );
      const merged = { id: "guest", items };
      writeGuestCart(merged);
      setCart(merged);
      return;
    }
    const res = await api.put(`/customers/cart/items/${itemId}`, { quantityKg });
    setCart((res.data.data ?? null) as Cart | null);
  };

  const remove = async (itemId: string) => {
    if (!userId || !isCustomer) {
      const current = readGuestCart();
      const merged = {
        id: "guest",
        items: (current?.items ?? []).filter((i) => i.id !== itemId && i.listingId !== itemId),
      };
      writeGuestCart(merged);
      setCart(merged);
      return;
    }
    const res = await api.delete(`/customers/cart/items/${itemId}`);
    setCart((res.data.data ?? null) as Cart | null);
  };

  const clear = async () => {
    writeGuestCart(null);
    setCart(null);
  };

  const ensureGuestCart = (uId?: string) => {
    if (uId && _cartSet) {
      _cartSet = false;
      void refresh();
    }
  };

  const count = (cart?.items ?? []).reduce((acc, i) => acc + i.quantityKg, 0);

  return (
    <CartContext.Provider
      value={{ cart, count, loading, refresh, add, update, remove, clear, ensureGuestCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
