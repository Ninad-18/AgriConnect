import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Package, ClipboardList, Truck, Sparkles, Star, Check, IndianRupee, Image as ImageIcon } from "lucide-react";
import api, { formatError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const statusColor = { open: "bg-forest", partial: "bg-ochre", fulfilled: "bg-sky" };
const TRACK = ["confirmed", "picked_up", "in_transit", "delivered"];

function CreateRequest({ onDone }) {
  const [open, setOpen] = useState(false);
  const today = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const [f, setF] = useState({ product: "", quantity_kg: "", min_grade: "B", delivery_date: today, transport: "supplier", allow_partial: true, selection_method: "manual", target_price: "", notes: "" });
  const submit = async () => {
    try {
      await api.post("/procurements", { ...f, quantity_kg: Number(f.quantity_kg), target_price: f.target_price ? Number(f.target_price) : null });
      toast.success("Request posted — farmers notified!");
      setOpen(false); onDone();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-terracotta hover:bg-terracotta/90 text-white gap-2" data-testid="create-request-btn"><Plus className="w-4 h-4" /> New Request</Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-head text-forest">Create Procurement Request</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label className="text-forest">Product</Label><Input value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} placeholder="Onion" data-testid="req-product" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-forest">Quantity (kg)</Label><Input type="number" value={f.quantity_kg} onChange={(e) => setF({ ...f, quantity_kg: e.target.value })} data-testid="req-qty" className="mt-1" /></div>
            <div><Label className="text-forest">Min grade</Label>
              <Select value={f.min_grade} onValueChange={(v) => setF({ ...f, min_grade: v })}>
                <SelectTrigger className="mt-1" data-testid="req-grade"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">{["A", "B", "C"].map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-forest">Delivery date</Label><Input type="date" value={f.delivery_date} onChange={(e) => setF({ ...f, delivery_date: e.target.value })} data-testid="req-date" className="mt-1" /></div>
            <div><Label className="text-forest">Target price/kg (₹)</Label><Input type="number" value={f.target_price} onChange={(e) => setF({ ...f, target_price: e.target.value })} data-testid="req-target" className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-forest">Transport by</Label>
              <Select value={f.transport} onValueChange={(v) => setF({ ...f, transport: v })}>
                <SelectTrigger className="mt-1" data-testid="req-transport"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white"><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="farmer">Farmer</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-forest">Selection</Label>
              <Select value={f.selection_method} onValueChange={(v) => setF({ ...f, selection_method: v })}>
                <SelectTrigger className="mt-1" data-testid="req-method"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white"><SelectItem value="manual">Manual</SelectItem><SelectItem value="smart">Smart Auto Allocation</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-forest font-semibold cursor-pointer">
            <Checkbox checked={f.allow_partial} onCheckedChange={(v) => setF({ ...f, allow_partial: !!v })} data-testid="req-partial" /> Allow partial fulfillment (multiple farmers)
          </label>
          <Textarea placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} data-testid="req-notes" />
          <Button onClick={submit} className="w-full bg-forest hover:bg-forest-light text-white" data-testid="req-submit">Post Request</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BidsView({ request, onDone }) {
  const [open, setOpen] = useState(false);
  const [bids, setBids] = useState([]);
  const [selected, setSelected] = useState([]);
  const [smart, setSmart] = useState(null);

  const load = () => {
    api.get(`/procurements/${request.id}/bids`).then((r) => setBids(r.data));
    setSmart(null); setSelected([]);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const runSmart = async () => {
    const res = await api.get(`/procurements/${request.id}/smart-allocation`);
    setSmart(res.data);
    setSelected(res.data.recommended_bids.map((b) => b.id));
    toast.success(`Smart Allocation: ${res.data.recommended_bids.length} bids · ${res.data.coverage}% coverage`);
  };

  const accept = async () => {
    if (selected.length === 0) return toast.error("Select at least one bid");
    try {
      await api.post("/bids/accept", { request_id: request.id, bid_ids: selected });
      toast.success("Bids accepted · orders created!");
      setOpen(false); onDone();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  const recIds = smart ? smart.recommended_bids.map((b) => b.id) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-forest text-forest hover:bg-forest hover:text-white w-full" data-testid={`view-bids-${request.id}`}>
          Compare Bids ({request.bid_count})
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-head text-forest">Bids for {request.product} · needs {request.quantity_kg}kg</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-sm text-muted-foreground">Selected: <b>{selected.length}</b> bids · {selected.reduce((sum, id) => { const b = bids.find((x) => x.id === id); return sum + (b?.quantity_kg || 0); }, 0)}kg</div>
          <div className="flex gap-2">
            <Button size="sm" onClick={runSmart} className="bg-ochre hover:bg-ochre/90 text-forest gap-1" data-testid="smart-alloc-btn"><Sparkles className="w-4 h-4" /> Smart Auto Allocation</Button>
            <Button size="sm" onClick={accept} className="bg-forest hover:bg-forest-light text-white gap-1" data-testid="accept-bids-btn"><Check className="w-4 h-4" /> Accept Selected</Button>
          </div>
        </div>
        {smart && (
          <div className="bg-ochre/15 border border-ochre/40 rounded-lg p-3 mb-3 text-sm text-forest" data-testid="smart-summary">
            <b>Recommended combination:</b> {smart.recommended_bids.length} farmers · {smart.total_kg}kg · avg ₹{smart.avg_price}/kg · est ₹{smart.total_cost} · {smart.coverage}% coverage
          </div>
        )}
        {bids.length === 0 && <p className="text-muted-foreground py-8 text-center">No bids yet.</p>}
        {bids.length > 0 && (
          <div className="overflow-x-auto border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Farmer</TableHead><TableHead>Qty</TableHead><TableHead>₹/kg</TableHead>
                  <TableHead>Grade</TableHead><TableHead>Rating</TableHead><TableHead>Dist</TableHead>
                  <TableHead>Delivery</TableHead><TableHead>Photos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((b) => {
                  const rec = recIds.includes(b.id);
                  return (
                    <TableRow key={b.id} className={rec ? "bg-ochre/10" : ""} data-testid="bid-compare-row">
                      <TableCell><Checkbox checked={selected.includes(b.id)} onCheckedChange={() => toggle(b.id)} data-testid={`select-bid-${b.id}`} /></TableCell>
                      <TableCell className="font-semibold text-forest">{b.farmer_name}{rec && <Badge className="ml-2 bg-ochre text-forest text-[10px]">★ pick</Badge>}</TableCell>
                      <TableCell>{b.quantity_kg}kg</TableCell>
                      <TableCell className="font-bold text-terracotta">₹{b.price_per_kg}</TableCell>
                      <TableCell><Badge className="bg-forest text-white">{b.grade}</Badge></TableCell>
                      <TableCell className="flex items-center gap-1"><Star className="w-3 h-3 text-ochre fill-ochre" />{b.farmer_rating || "—"}</TableCell>
                      <TableCell>{b.distance_km}km</TableCell>
                      <TableCell className="text-xs">{b.delivery_date}</TableCell>
                      <TableCell>
                        {b.images?.length ? (
                          <div className="flex gap-1">{b.images.slice(0, 2).map((s, i) => <img key={i} src={s} alt="" className="w-8 h-8 rounded object-cover border" />)}</div>
                        ) : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RateDialog({ order, onDone }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const submit = async () => {
    await api.post("/ratings", { order_id: order.id, ratee_id: order.farmer_id, stars, dimensions: {} });
    toast.success("Farmer rated"); setOpen(false); onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="border-ochre text-ochre hover:bg-ochre/10" data-testid={`rate-${order.id}`}>Rate Farmer</Button></DialogTrigger>
      <DialogContent className="bg-white max-w-sm">
        <DialogHeader><DialogTitle className="font-head text-forest">Rate {order.farmer_name}</DialogTitle></DialogHeader>
        <div className="flex gap-1 justify-center py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} data-testid={`star-${n}`}>
              <Star className={`w-8 h-8 ${n <= stars ? "text-ochre fill-ochre" : "text-gray-300"}`} />
            </button>
          ))}
        </div>
        <Button onClick={submit} className="bg-forest hover:bg-forest-light text-white" data-testid="rate-submit">Submit Rating</Button>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);

  const load = () => {
    api.get("/procurements", { params: { mine: true } }).then((r) => setRequests(r.data));
    api.get("/orders").then((r) => setOrders(r.data));
  };
  useEffect(load, []);

  const advance = async (id) => { const r = await api.post(`/orders/${id}/advance`); toast.success(`Status: ${r.data.status.replace("_", " ")}`); load(); };
  const pay = async (id) => { await api.post(`/orders/${id}/pay`); toast.success("Payment sent to farmer"); load(); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-head font-black text-3xl text-forest">Supplier Console</h1>
          <p className="text-muted-foreground">{user.name} · manage procurement transparently</p>
        </div>
        <CreateRequest onDone={load} />
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="requests" data-testid="tab-my-requests"><ClipboardList className="w-4 h-4 mr-2" />My Requests</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-shipments"><Truck className="w-4 h-4 mr-2" />Orders & Shipments</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {requests.length === 0 && <p className="text-muted-foreground py-12 text-center">No requests yet. Create your first procurement request.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-5 border-border h-full flex flex-col" data-testid="my-request-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-head font-bold text-xl text-forest">{r.product}</h3>
                    <Badge className={`${statusColor[r.status]} text-white capitalize`}>{r.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1 flex-1">
                    <div>Need <b>{r.quantity_kg}kg</b> · fulfilled <b>{r.fulfilled_kg || 0}kg</b></div>
                    <div>Grade <b>{r.min_grade}+</b> · {r.selection_method === "smart" ? "Smart" : "Manual"}</div>
                    <div>Transport: <b>{r.transport}</b> · Partial: <b>{r.allow_partial ? "Yes" : "No"}</b></div>
                    <div className="w-full bg-secondary rounded-full h-2 mt-2">
                      <div className="bg-terracotta h-2 rounded-full" style={{ width: `${Math.min(100, ((r.fulfilled_kg || 0) / r.quantity_kg) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="mt-4"><BidsView request={r} onDone={load} /></div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 && <p className="text-muted-foreground py-12 text-center">No orders yet.</p>}
          <div className="space-y-4">
            {orders.map((o) => (
              <Card key={o.id} className="p-5 border-border" data-testid="supplier-order-card">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-head font-bold text-lg text-forest">{o.product} · {o.quantity_kg}kg</div>
                    <div className="text-sm text-gray-600">Farmer: {o.farmer_name} · ₹{o.price_per_kg}/kg · ₹{o.amount} total</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={o.payment_status === "paid" ? "bg-forest text-white" : "bg-ochre text-white"}><IndianRupee className="w-3 h-3 mr-1" />{o.payment_status}</Badge>
                    <Badge className="bg-sky text-white capitalize">{o.status.replace("_", " ")}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {TRACK.map((s, i) => <div key={s} className={`flex-1 h-1.5 rounded-full ${TRACK.indexOf(o.status) >= i ? "bg-terracotta" : "bg-secondary"}`} />)}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-3 capitalize">{TRACK.map((s) => <span key={s}>{s.replace("_", " ")}</span>)}</div>
                <div className="flex flex-wrap gap-2">
                  {o.status !== "delivered" && <Button size="sm" onClick={() => advance(o.id)} className="bg-forest hover:bg-forest-light text-white" data-testid={`advance-${o.id}`}>Advance Shipment</Button>}
                  {o.payment_status !== "paid" && o.status === "delivered" && <Button size="sm" onClick={() => pay(o.id)} className="bg-terracotta hover:bg-terracotta/90 text-white" data-testid={`pay-${o.id}`}>Pay Now ₹{o.amount}</Button>}
                  {o.status === "delivered" && !o.rated_by_supplier && <RateDialog order={o} onDone={load} />}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
