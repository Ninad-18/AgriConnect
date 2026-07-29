import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Upload, Package, Gavel, User, Star, IndianRupee, MapPin, TrendingUp } from "lucide-react";
import api, { formatError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const statusColor = { open: "bg-forest", partial: "bg-ochre", fulfilled: "bg-sky", pending: "bg-ochre", accepted: "bg-forest", rejected: "bg-terracotta" };
const TRACK = ["confirmed", "picked_up", "in_transit", "delivered"];

function BidDialog({ request, onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ quantity_kg: "", price_per_kg: "", grade: request.min_grade, delivery_date: request.delivery_date, note: "" });
  const [images, setImages] = useState([]);
  const [ai, setAi] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    Promise.all(files.map((f) => new Promise((res) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
    }))).then(setImages);
  };

  const getAi = async () => {
    setLoadingAi(true);
    try {
      const res = await api.post("/ai/price-recommendation", { crop: request.product, grade: form.grade, location: request.supplier_location });
      setAi(res.data);
      if (res.data.recommended_price) setForm((f) => ({ ...f, price_per_kg: res.data.recommended_price }));
    } catch { toast.error("AI unavailable"); } finally { setLoadingAi(false); }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/bids", {
        request_id: request.id, quantity_kg: Number(form.quantity_kg), price_per_kg: Number(form.price_per_kg),
        grade: form.grade, delivery_date: form.delivery_date, images, note: form.note,
      });
      toast.success("Bid submitted!");
      setOpen(false); onDone();
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-terracotta hover:bg-terracotta/90 text-white w-full" data-testid={`bid-open-${request.id}`}>
          <Gavel className="w-4 h-4 mr-2" /> Place Bid
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-head text-forest">Bid on {request.product}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-sand rounded-lg p-3 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-1">
            <span>Needs: <b>{request.quantity_kg}kg</b></span>
            <span>Min grade: <b>{request.min_grade}</b></span>
            <span>Transport: <b>{request.transport}</b></span>
            <span>Partial: <b>{request.allow_partial ? "Yes" : "No"}</b></span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-forest">Quantity (kg)</Label>
              <Input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} data-testid="bid-qty" className="mt-1" />
            </div>
            <div>
              <Label className="text-forest">Grade</Label>
              <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                <SelectTrigger className="mt-1" data-testid="bid-grade"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  {["A", "B", "C"].map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-forest">Price per kg (₹)</Label>
              <Button type="button" size="sm" variant="outline" onClick={getAi} disabled={loadingAi}
                className="border-terracotta text-terracotta hover:bg-terracotta/10 h-7 gap-1" data-testid="ai-price-btn">
                <Sparkles className="w-3.5 h-3.5" /> {loadingAi ? "…" : "AI Fair Price"}
              </Button>
            </div>
            <Input type="number" value={form.price_per_kg} onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })} data-testid="bid-price" />
            {ai && (
              <div className="mt-2 bg-terracotta/10 border border-terracotta/30 rounded-lg p-3 text-sm" data-testid="ai-result">
                <div className="font-semibold text-forest">Suggested ₹{ai.recommended_price}/kg (₹{ai.range_low}–₹{ai.range_high})</div>
                <div className="text-gray-600 text-xs mt-0.5">{ai.reasoning}</div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-forest">Delivery date</Label>
            <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} data-testid="bid-date" className="mt-1" />
          </div>

          <div>
            <Label className="text-forest">Produce photos (up to 3)</Label>
            <label className="mt-1 flex items-center gap-2 border border-dashed border-input rounded-lg p-3 cursor-pointer hover:bg-sand/50 text-sm text-muted-foreground" data-testid="bid-images-label">
              <Upload className="w-4 h-4" /> Upload images
              <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" data-testid="bid-images" />
            </label>
            {images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {images.map((src, i) => <img key={i} src={src} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />)}
              </div>
            )}
          </div>

          <Textarea placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="bid-note" />
          <Button onClick={submit} disabled={submitting} className="w-full bg-forest hover:bg-forest-light text-white" data-testid="bid-submit">
            {submitting ? "Submitting…" : "Submit Bid"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FarmerDashboard() {
  const { user, setUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [bids, setBids] = useState([]);
  const [orders, setOrders] = useState([]);
  const [farm, setFarm] = useState({ farm_name: "", location: user.location || "", crops: "", farm_size_acres: "", distance_km: 25, bio: "" });

  const load = () => {
    api.get("/procurements", { params: { status: "open" } }).then((r) => setRequests(r.data));
    api.get("/bids/mine").then((r) => setBids(r.data));
    api.get("/orders").then((r) => setOrders(r.data));
    api.get("/farmer/profile").then((r) => { if (r.data) setFarm({ ...r.data, crops: (r.data.crops || []).join(", ") }); });
  };
  useEffect(load, []);

  const saveFarm = async () => {
    try {
      await api.put("/farmer/profile", {
        farm_name: farm.farm_name, location: farm.location,
        crops: farm.crops.split(",").map((s) => s.trim()).filter(Boolean),
        farm_size_acres: Number(farm.farm_size_acres) || 0, distance_km: Number(farm.distance_km) || 25, bio: farm.bio,
      });
      toast.success("Profile saved");
    } catch (e) { toast.error(formatError(e.response?.data?.detail)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-head font-black text-3xl text-forest">Namaste, {user.name} 🌾</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Star className="w-4 h-4 text-ochre fill-ochre" /> Rating {user.rating_avg || "New"} · {user.rating_count || 0} reviews
        </p>
      </motion.div>

      <Tabs defaultValue="requests">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto">
          <TabsTrigger value="requests" data-testid="tab-requests"><Package className="w-4 h-4 mr-2" />Open Requests</TabsTrigger>
          <TabsTrigger value="bids" data-testid="tab-bids"><Gavel className="w-4 h-4 mr-2" />My Bids</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders"><TrendingUp className="w-4 h-4 mr-2" />Orders</TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile"><User className="w-4 h-4 mr-2" />Farm Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {requests.length === 0 && <p className="text-muted-foreground py-12 text-center">No open procurement requests right now.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-5 border-border h-full flex flex-col" data-testid="request-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-head font-bold text-xl text-forest">{r.product}</h3>
                    <Badge className={`${statusColor[r.status]} text-white capitalize`}>{r.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1 flex-1">
                    <div>Needs <b>{r.quantity_kg}kg</b> · Grade <b>{r.min_grade}+</b></div>
                    <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.supplier_name} · {r.supplier_location || "—"}</div>
                    <div>Delivery by <b>{r.delivery_date}</b></div>
                    <div>Transport: <b>{r.transport}</b> · Partial: <b>{r.allow_partial ? "Yes" : "No"}</b></div>
                    <div className="text-xs text-terracotta font-semibold">{r.bid_count} bids so far · {r.selection_method === "smart" ? "Smart Allocation" : "Manual"}</div>
                  </div>
                  <div className="mt-4"><BidDialog request={r} onDone={load} /></div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bids">
          {bids.length === 0 && <p className="text-muted-foreground py-12 text-center">You haven't placed any bids yet.</p>}
          <div className="space-y-3">
            {bids.map((b) => (
              <Card key={b.id} className="p-4 border-border flex flex-wrap items-center justify-between gap-3" data-testid="bid-row">
                <div>
                  <div className="font-head font-bold text-forest">{b.product}</div>
                  <div className="text-sm text-gray-600">{b.quantity_kg}kg · ₹{b.price_per_kg}/kg · Grade {b.grade}</div>
                </div>
                <Badge className={`${statusColor[b.status]} text-white capitalize`}>{b.status}</Badge>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 && <p className="text-muted-foreground py-12 text-center">No accepted orders yet.</p>}
          <div className="space-y-4">
            {orders.map((o) => (
              <Card key={o.id} className="p-5 border-border" data-testid="order-card">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-head font-bold text-lg text-forest">{o.product} · {o.quantity_kg}kg</div>
                    <div className="text-sm text-gray-600">Buyer: {o.supplier_name} · ₹{o.amount} total</div>
                  </div>
                  <Badge className={o.payment_status === "paid" ? "bg-forest text-white" : "bg-ochre text-white"}>
                    <IndianRupee className="w-3 h-3 mr-1" />{o.payment_status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {TRACK.map((s, i) => {
                    const done = TRACK.indexOf(o.status) >= i;
                    return (
                      <React.Fragment key={s}>
                        <div className={`flex-1 h-1.5 rounded-full ${done ? "bg-terracotta" : "bg-secondary"}`} />
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1 capitalize">
                  {TRACK.map((s) => <span key={s}>{s.replace("_", " ")}</span>)}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="p-6 border-border max-w-2xl">
            <h3 className="font-head font-bold text-xl text-forest mb-4">Farm Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-forest">Farm name</Label><Input value={farm.farm_name} onChange={(e) => setFarm({ ...farm, farm_name: e.target.value })} data-testid="farm-name" className="mt-1" /></div>
              <div><Label className="text-forest">Location</Label><Input value={farm.location} onChange={(e) => setFarm({ ...farm, location: e.target.value })} data-testid="farm-location" className="mt-1" /></div>
              <div className="sm:col-span-2"><Label className="text-forest">Crops (comma separated)</Label><Input value={farm.crops} onChange={(e) => setFarm({ ...farm, crops: e.target.value })} placeholder="Onion, Tomato, Wheat" data-testid="farm-crops" className="mt-1" /></div>
              <div><Label className="text-forest">Farm size (acres)</Label><Input type="number" value={farm.farm_size_acres} onChange={(e) => setFarm({ ...farm, farm_size_acres: e.target.value })} data-testid="farm-size" className="mt-1" /></div>
              <div><Label className="text-forest">Distance to market (km)</Label><Input type="number" value={farm.distance_km} onChange={(e) => setFarm({ ...farm, distance_km: e.target.value })} data-testid="farm-distance" className="mt-1" /></div>
              <div className="sm:col-span-2"><Label className="text-forest">Bio</Label><Textarea value={farm.bio} onChange={(e) => setFarm({ ...farm, bio: e.target.value })} data-testid="farm-bio" className="mt-1" /></div>
            </div>
            <Button onClick={saveFarm} className="mt-4 bg-forest hover:bg-forest-light text-white" data-testid="farm-save">Save Profile</Button>
            <p className="text-xs text-muted-foreground mt-2">Tip: adding your crops lets you get notified about matching requests.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
