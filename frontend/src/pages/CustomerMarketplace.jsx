import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MapPin, ShoppingCart, Truck, Star, Leaf } from "lucide-react";
import api, { formatError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";

const TRACK = ["confirmed", "picked_up", "in_transit", "delivered"];

function BuyDialog({ product, onDone }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(5);
  const buy = async () => {
    try {
      await api.post("/products/purchase", { product_id: product.id, quantity: Number(qty) });
      toast.success("Purchase confirmed!"); setOpen(false); onDone();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-forest hover:bg-forest-light text-white w-full gap-2" data-testid={`buy-${product.id}`}><ShoppingCart className="w-4 h-4" /> Buy</Button></DialogTrigger>
      <DialogContent className="bg-white max-w-sm">
        <DialogHeader><DialogTitle className="font-head text-forest">Buy {product.name}</DialogTitle></DialogHeader>
        <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded-lg" />
        <div className="text-sm text-gray-700 flex items-center gap-1"><MapPin className="w-4 h-4" /> Origin: <b>{product.origin}</b></div>
        <div><label className="text-sm text-forest font-semibold">Quantity (kg)</label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} data-testid="buy-qty" className="mt-1" /></div>
        <div className="font-head font-bold text-forest text-lg">Total: ₹{(qty * product.price).toFixed(2)}</div>
        <Button onClick={buy} className="bg-terracotta hover:bg-terracotta/90 text-white" data-testid="buy-confirm">Confirm Purchase</Button>
      </DialogContent>
    </Dialog>
  );
}

function RateSupplier({ order, onDone }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const submit = async () => { await api.post("/ratings", { order_id: order.id, ratee_id: order.supplier_id, stars }); toast.success("Thanks for rating!"); setOpen(false); onDone(); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="border-ochre text-ochre hover:bg-ochre/10" data-testid={`rate-sup-${order.id}`}>Rate Supplier</Button></DialogTrigger>
      <DialogContent className="bg-white max-w-sm">
        <DialogHeader><DialogTitle className="font-head text-forest">Rate {order.supplier_name}</DialogTitle></DialogHeader>
        <div className="flex gap-1 justify-center py-4">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setStars(n)}><Star className={`w-8 h-8 ${n <= stars ? "text-ochre fill-ochre" : "text-gray-300"}`} /></button>)}
        </div>
        <Button onClick={submit} className="bg-forest hover:bg-forest-light text-white">Submit</Button>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerMarketplace() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const load = () => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/orders").then((r) => setOrders(r.data));
  };
  useEffect(load, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-head font-black text-3xl text-forest flex items-center gap-2"><Leaf className="w-7 h-7 text-terracotta" /> Marketplace</h1>
        <p className="text-muted-foreground">Verified produce with full origin traceability.</p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="browse" data-testid="tab-browse">Browse</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-my-orders">My Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="overflow-hidden border-border h-full flex flex-col lift-hover" data-testid="product-card">
                  <img src={p.image} alt={p.name} className="w-full h-44 object-cover" />
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <h3 className="font-head font-bold text-lg text-forest">{p.name}</h3>
                      <Badge className="bg-forest text-white">Grade {p.grade}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {p.origin}</div>
                    <div className="font-head font-black text-2xl text-terracotta mt-2">₹{p.price}<span className="text-sm font-normal text-muted-foreground">/kg</span></div>
                    <div className="mt-auto pt-4"><BuyDialog product={p} onDone={load} /></div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 && <p className="text-muted-foreground py-12 text-center">No orders yet.</p>}
          <div className="space-y-4">
            {orders.map((o) => (
              <Card key={o.id} className="p-5 border-border" data-testid="customer-order-card">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-head font-bold text-lg text-forest">{o.product} · {o.quantity_kg}kg</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Origin: {o.origin} · ₹{o.amount}</div>
                  </div>
                  <Badge className="bg-sky text-white capitalize"><Truck className="w-3 h-3 mr-1" />{o.status.replace("_", " ")}</Badge>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {TRACK.map((s, i) => <div key={s} className={`flex-1 h-1.5 rounded-full ${TRACK.indexOf(o.status) >= i ? "bg-terracotta" : "bg-secondary"}`} />)}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-3 capitalize">{TRACK.map((s) => <span key={s}>{s.replace("_", " ")}</span>)}</div>
                <RateSupplier order={o} onDone={load} />
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
