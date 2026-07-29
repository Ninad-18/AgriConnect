from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import jwt
import bcrypt
import asyncio
from datetime import datetime, timezone, timedelta

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

app = FastAPI(title="AgriBid API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agribid")


# ---------------- Helpers ----------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean(user)


def require_role(*roles):
    async def checker(request: Request):
        user = await get_current_user(request)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Access denied for your role")
        return user
    return checker


# ---------------- Models ----------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # farmer | supplier | customer
    phone: Optional[str] = ""
    location: Optional[str] = ""


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class FarmProfileInput(BaseModel):
    farm_name: str
    location: str
    crops: List[str] = []
    farm_size_acres: Optional[float] = 0
    distance_km: Optional[float] = 25
    bio: Optional[str] = ""


class ProcurementInput(BaseModel):
    product: str
    quantity_kg: float
    min_grade: str  # A|B|C
    delivery_date: str
    transport: str  # supplier|farmer
    allow_partial: bool = True
    selection_method: str  # manual|smart
    target_price: Optional[float] = None
    notes: Optional[str] = ""


class BidInput(BaseModel):
    request_id: str
    quantity_kg: float
    price_per_kg: float
    grade: str
    delivery_date: str
    images: List[str] = []
    note: Optional[str] = ""


class AcceptBidsInput(BaseModel):
    request_id: str
    bid_ids: List[str]


class RatingInput(BaseModel):
    order_id: str
    ratee_id: str
    stars: float
    comment: Optional[str] = ""
    dimensions: Optional[dict] = {}


class PurchaseInput(BaseModel):
    product_id: str
    quantity: float


class PriceRecInput(BaseModel):
    crop: str
    grade: str
    location: Optional[str] = ""


class ChatInput(BaseModel):
    message: str
    language: Optional[str] = "en"
    session_id: Optional[str] = None


GRADE_ORDER = {"A": 3, "B": 2, "C": 1}


# ---------------- Auth Routes ----------------
@api.post("/auth/register")
async def register(inp: RegisterInput):
    email = inp.email.lower()
    if inp.role not in ("farmer", "supplier", "customer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    doc = {
        "id": uid,
        "name": inp.name,
        "email": email,
        "password_hash": hash_password(inp.password),
        "role": inp.role,
        "phone": inp.phone,
        "location": inp.location,
        "rating_avg": 0,
        "rating_count": 0,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_token(uid, email, inp.role)
    return {"token": token, "user": clean(dict(doc))}


@api.post("/auth/login")
async def login(inp: LoginInput):
    email = inp.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(inp.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email, user["role"])
    return {"token": token, "user": clean(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------- Farmer Profile ----------------
@api.put("/farmer/profile")
async def upsert_farm(inp: FarmProfileInput, user: dict = Depends(require_role("farmer"))):
    doc = inp.model_dump()
    doc["farmer_id"] = user["id"]
    doc["updated_at"] = now_iso()
    await db.farms.update_one({"farmer_id": user["id"]}, {"$set": doc}, upsert=True)
    return {"ok": True, "farm": doc}


@api.get("/farmer/profile")
async def get_farm(user: dict = Depends(require_role("farmer"))):
    farm = await db.farms.find_one({"farmer_id": user["id"]})
    return clean(farm) if farm else None


# ---------------- Procurement Requests ----------------
@api.post("/procurements")
async def create_procurement(inp: ProcurementInput, user: dict = Depends(require_role("supplier"))):
    rid = new_id()
    doc = inp.model_dump()
    doc.update({
        "id": rid,
        "supplier_id": user["id"],
        "supplier_name": user["name"],
        "supplier_location": user.get("location", ""),
        "status": "open",
        "created_at": now_iso(),
        "accepted_bids": [],
        "fulfilled_kg": 0,
    })
    await db.procurements.insert_one(doc)
    # notify matching farmers
    farms = await db.farms.find({"crops": {"$regex": inp.product, "$options": "i"}}).to_list(500)
    for f in farms:
        await db.notifications.insert_one({
            "id": new_id(),
            "user_id": f["farmer_id"],
            "type": "new_request",
            "title": f"New request for {inp.product}",
            "body": f"{user['name']} needs {inp.quantity_kg}kg of {inp.product} (Grade {inp.min_grade}+)",
            "request_id": rid,
            "read": False,
            "created_at": now_iso(),
        })
    return clean(doc)


@api.get("/procurements")
async def list_procurements(request: Request, mine: bool = False, status: Optional[str] = None):
    user = await get_current_user(request)
    q = {}
    if user["role"] == "supplier" and mine:
        q["supplier_id"] = user["id"]
    if status:
        q["status"] = status
    docs = await db.procurements.find(q).sort("created_at", -1).to_list(500)
    result = []
    for d in docs:
        d = clean(d)
        d["bid_count"] = await db.bids.count_documents({"request_id": d["id"]})
        result.append(d)
    return result


@api.get("/procurements/{rid}")
async def get_procurement(rid: str, request: Request):
    await get_current_user(request)
    doc = await db.procurements.find_one({"id": rid})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    return clean(doc)


# ---------------- Bids ----------------
@api.post("/bids")
async def submit_bid(inp: BidInput, user: dict = Depends(require_role("farmer"))):
    req = await db.procurements.find_one({"id": inp.request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["status"] != "open":
        raise HTTPException(status_code=400, detail="This request is no longer open")
    farm = await db.farms.find_one({"farmer_id": user["id"]})
    bid_id = new_id()
    doc = inp.model_dump()
    doc.update({
        "id": bid_id,
        "farmer_id": user["id"],
        "farmer_name": user["name"],
        "farmer_rating": user.get("rating_avg", 0),
        "distance_km": (farm or {}).get("distance_km", 30),
        "farm_location": (farm or {}).get("location", user.get("location", "")),
        "supplier_id": req["supplier_id"],
        "status": "pending",
        "created_at": now_iso(),
    })
    await db.bids.insert_one(doc)
    await db.notifications.insert_one({
        "id": new_id(),
        "user_id": req["supplier_id"],
        "type": "new_bid",
        "title": f"New bid on {req['product']}",
        "body": f"{user['name']} bid ₹{inp.price_per_kg}/kg for {inp.quantity_kg}kg (Grade {inp.grade})",
        "request_id": inp.request_id,
        "read": False,
        "created_at": now_iso(),
    })
    return clean(doc)


@api.get("/bids/mine")
async def my_bids(user: dict = Depends(require_role("farmer"))):
    docs = await db.bids.find({"farmer_id": user["id"]}).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        d = clean(d)
        req = await db.procurements.find_one({"id": d["request_id"]})
        d["product"] = req["product"] if req else "-"
        d["request_status"] = req["status"] if req else "-"
        out.append(d)
    return out


@api.get("/procurements/{rid}/bids")
async def bids_for_request(rid: str, user: dict = Depends(require_role("supplier"))):
    req = await db.procurements.find_one({"id": rid})
    if not req or req["supplier_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your request")
    docs = await db.bids.find({"request_id": rid}).sort("price_per_kg", 1).to_list(500)
    return [clean(d) for d in docs]


def score_bid(bid, req, price_range):
    min_p, max_p = price_range
    price_norm = 0 if max_p == min_p else (bid["price_per_kg"] - min_p) / (max_p - min_p)
    rating_norm = (bid.get("farmer_rating", 0) or 0) / 5.0
    grade_ok = GRADE_ORDER.get(bid["grade"], 0) >= GRADE_ORDER.get(req["min_grade"], 0)
    grade_score = GRADE_ORDER.get(bid["grade"], 0) / 3.0
    dist = bid.get("distance_km", 30)
    dist_norm = min(dist, 200) / 200.0
    if not grade_ok:
        return -1
    return round(0.45 * (1 - price_norm) + 0.2 * rating_norm + 0.2 * grade_score + 0.15 * (1 - dist_norm), 4)


@api.get("/procurements/{rid}/smart-allocation")
async def smart_allocation(rid: str, user: dict = Depends(require_role("supplier"))):
    req = await db.procurements.find_one({"id": rid})
    if not req or req["supplier_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your request")
    bids = await db.bids.find({"request_id": rid, "status": "pending"}).to_list(500)
    bids = [clean(b) for b in bids]
    if not bids:
        return {"recommended_bids": [], "total_kg": 0, "total_cost": 0, "avg_price": 0, "coverage": 0, "scored": []}
    prices = [b["price_per_kg"] for b in bids]
    price_range = (min(prices), max(prices))
    for b in bids:
        b["score"] = score_bid(b, req, price_range)
    eligible = [b for b in bids if b["score"] >= 0]
    eligible.sort(key=lambda b: (-b["score"], b["price_per_kg"]))
    need = req["quantity_kg"]
    chosen = []
    filled = 0
    for b in eligible:
        if filled >= need:
            break
        take = b["quantity_kg"]
        if not req["allow_partial"] and (filled + take) > need:
            continue
        chosen.append(b)
        filled += take
        if not req["allow_partial"] and filled >= need:
            break
    total_cost = sum(min(b["quantity_kg"], need) * b["price_per_kg"] for b in chosen)
    total_kg = sum(b["quantity_kg"] for b in chosen)
    avg_price = round(sum(b["price_per_kg"] for b in chosen) / len(chosen), 2) if chosen else 0
    return {
        "recommended_bids": chosen,
        "total_kg": total_kg,
        "total_cost": round(total_cost, 2),
        "avg_price": avg_price,
        "coverage": round(min(filled / need, 1) * 100, 1) if need else 0,
        "scored": eligible,
    }


@api.post("/bids/accept")
async def accept_bids(inp: AcceptBidsInput, user: dict = Depends(require_role("supplier"))):
    req = await db.procurements.find_one({"id": inp.request_id})
    if not req or req["supplier_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your request")
    orders = []
    fulfilled = req.get("fulfilled_kg", 0)
    for bid_id in inp.bid_ids:
        bid = await db.bids.find_one({"id": bid_id, "request_id": inp.request_id})
        if not bid:
            continue
        await db.bids.update_one({"id": bid_id}, {"$set": {"status": "accepted"}})
        oid = new_id()
        order = {
            "id": oid,
            "request_id": inp.request_id,
            "bid_id": bid_id,
            "product": req["product"],
            "supplier_id": user["id"],
            "supplier_name": user["name"],
            "farmer_id": bid["farmer_id"],
            "farmer_name": bid["farmer_name"],
            "quantity_kg": bid["quantity_kg"],
            "price_per_kg": bid["price_per_kg"],
            "grade": bid["grade"],
            "amount": round(bid["quantity_kg"] * bid["price_per_kg"], 2),
            "transport": req["transport"],
            "status": "confirmed",
            "payment_status": "pending",
            "tracking": [{"stage": "confirmed", "at": now_iso()}],
            "rated_by_supplier": False,
            "created_at": now_iso(),
        }
        await db.orders.insert_one(order)
        orders.append(clean(order))
        fulfilled += bid["quantity_kg"]
        await db.notifications.insert_one({
            "id": new_id(), "user_id": bid["farmer_id"], "type": "bid_accepted",
            "title": f"Bid accepted for {req['product']}",
            "body": f"Your bid of ₹{bid['price_per_kg']}/kg was accepted. Order confirmed!",
            "request_id": inp.request_id, "read": False, "created_at": now_iso(),
        })
    new_status = "fulfilled" if fulfilled >= req["quantity_kg"] else "partial"
    await db.procurements.update_one(
        {"id": inp.request_id},
        {"$set": {"fulfilled_kg": fulfilled, "status": new_status,
                  "accepted_bids": req.get("accepted_bids", []) + inp.bid_ids}},
    )
    # reject non-selected if fully fulfilled
    if new_status == "fulfilled":
        await db.bids.update_many(
            {"request_id": inp.request_id, "status": "pending"}, {"$set": {"status": "rejected"}})
    return {"orders": orders, "fulfilled_kg": fulfilled, "status": new_status}


# ---------------- Orders / Tracking / Payment ----------------
TRACK_STAGES = ["confirmed", "picked_up", "in_transit", "delivered"]


@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    if user["role"] == "farmer":
        q = {"farmer_id": user["id"]}
    elif user["role"] == "supplier":
        q = {"supplier_id": user["id"]}
    else:
        q = {"customer_id": user["id"]}
    docs = await db.orders.find(q).sort("created_at", -1).to_list(500)
    return [clean(d) for d in docs]


@api.post("/orders/{oid}/advance")
async def advance_order(oid: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user["id"] not in (order.get("supplier_id"), order.get("farmer_id")):
        raise HTTPException(status_code=403, detail="Not allowed")
    cur = order["status"]
    if cur in TRACK_STAGES and cur != "delivered":
        nxt = TRACK_STAGES[TRACK_STAGES.index(cur) + 1]
        tracking = order.get("tracking", []) + [{"stage": nxt, "at": now_iso()}]
        await db.orders.update_one({"id": oid}, {"$set": {"status": nxt, "tracking": tracking}})
        return {"status": nxt}
    return {"status": cur}


@api.post("/orders/{oid}/pay")
async def pay_order(oid: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Mock digital payment
    await db.orders.update_one({"id": oid}, {"$set": {
        "payment_status": "paid",
        "payment_id": "pay_" + uuid.uuid4().hex[:16],
        "paid_at": now_iso(),
    }})
    await db.notifications.insert_one({
        "id": new_id(), "user_id": order["farmer_id"], "type": "payment",
        "title": "Payment received", "body": f"₹{order['amount']} received for {order['product']}",
        "read": False, "created_at": now_iso(),
    })
    return {"payment_status": "paid"}


# ---------------- Ratings ----------------
@api.post("/ratings")
async def rate(inp: RatingInput, user: dict = Depends(get_current_user)):
    await db.ratings.insert_one({
        "id": new_id(), "order_id": inp.order_id, "rater_id": user["id"],
        "ratee_id": inp.ratee_id, "stars": inp.stars, "comment": inp.comment,
        "dimensions": inp.dimensions, "created_at": now_iso(),
    })
    # recompute avg
    ratings = await db.ratings.find({"ratee_id": inp.ratee_id}).to_list(1000)
    avg = round(sum(r["stars"] for r in ratings) / len(ratings), 2)
    await db.users.update_one({"id": inp.ratee_id},
                              {"$set": {"rating_avg": avg, "rating_count": len(ratings)}})
    if user["role"] == "supplier":
        await db.orders.update_one({"id": inp.order_id}, {"$set": {"rated_by_supplier": True}})
    return {"rating_avg": avg, "rating_count": len(ratings)}


# ---------------- Market Prices ----------------
@api.get("/market/prices")
async def market_prices():
    docs = await db.market_prices.find().to_list(100)
    return [clean(d) for d in docs]


@api.get("/market/prices/{crop}")
async def market_price_detail(crop: str):
    doc = await db.market_prices.find_one({"crop": {"$regex": f"^{crop}$", "$options": "i"}})
    if not doc:
        raise HTTPException(status_code=404, detail="Crop not tracked")
    return clean(doc)


# ---------------- Customer Marketplace ----------------
@api.get("/products")
async def list_products():
    docs = await db.products.find().sort("created_at", -1).to_list(200)
    return [clean(d) for d in docs]


@api.post("/products/purchase")
async def purchase(inp: PurchaseInput, user: dict = Depends(require_role("customer"))):
    product = await db.products.find_one({"id": inp.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    oid = new_id()
    order = {
        "id": oid, "product": product["name"], "product_id": inp.product_id,
        "customer_id": user["id"], "supplier_id": product["supplier_id"],
        "supplier_name": product.get("supplier_name", ""), "origin": product.get("origin", ""),
        "quantity_kg": inp.quantity, "price_per_kg": product["price"],
        "amount": round(inp.quantity * product["price"], 2),
        "status": "confirmed", "payment_status": "paid",
        "tracking": [{"stage": "confirmed", "at": now_iso()}],
        "created_at": now_iso(),
    }
    await db.orders.insert_one(order)
    return clean(order)


# ---------------- Notifications ----------------
@api.get("/notifications")
async def notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [clean(d) for d in docs]


@api.post("/notifications/read")
async def mark_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- AI ----------------
def _llm_key():
    return os.environ["EMERGENT_LLM_KEY"]


@api.post("/ai/price-recommendation")
async def price_recommendation(inp: PriceRecInput, user: dict = Depends(get_current_user)):
    market = await db.market_prices.find_one({"crop": {"$regex": f"^{inp.crop}$", "$options": "i"}})
    market_price = market["current"] if market else None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=_llm_key(),
            session_id=f"pricerec-{user['id']}",
            system_message=(
                "You are an agricultural pricing advisor for Indian farmers. "
                "Given a crop, quality grade, current mandi/market price and location, "
                "recommend a fair competitive bid price per kg in INR. Grade A is premium (~market or above), "
                "B is average, C is below. Reply STRICTLY as JSON: "
                '{"recommended_price": <number>, "range_low": <number>, "range_high": <number>, "reasoning": "<one short sentence>"}'
            ),
        ).with_model("openai", "gpt-5.4")
        prompt = (f"Crop: {inp.crop}. Grade: {inp.grade}. Location: {inp.location or 'India'}. "
                  f"Current market price: {'₹'+str(market_price)+'/kg' if market_price else 'unknown'}.")
        resp = await chat.send_message(UserMessage(text=prompt))
        import json, re
        txt = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        data = json.loads(m.group(0)) if m else {"reasoning": txt}
        data["market_price"] = market_price
        return data
    except Exception as e:
        logger.error(f"AI price rec failed: {e}")
        base = market_price or 30
        mult = {"A": 1.0, "B": 0.85, "C": 0.7}.get(inp.grade, 0.85)
        rec = round(base * mult, 2)
        return {"recommended_price": rec, "range_low": round(rec * 0.92, 2),
                "range_high": round(rec * 1.08, 2), "market_price": market_price,
                "reasoning": "Estimated from current market price and grade (AI unavailable)."}


@api.post("/ai/chat")
async def ai_chat(inp: ChatInput, user: dict = Depends(get_current_user)):
    session_id = inp.session_id or f"chat-{user['id']}"
    lang = "Hindi" if inp.language == "hi" else "English"
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=_llm_key(),
            session_id=session_id,
            system_message=(
                f"You are AgriBid Assistant, helping Indian farmers, suppliers and customers on a "
                f"transparent agricultural procurement marketplace. Answer concisely and practically about "
                f"fair pricing, bidding, crop grades, logistics and using the platform. Reply in {lang}."
            ),
        ).with_model("openai", "gpt-5.4")
        resp = await chat.send_message(UserMessage(text=inp.message))
        reply = resp if isinstance(resp, str) else str(resp)
        await db.chat_history.insert_one({
            "id": new_id(), "session_id": session_id, "user_id": user["id"],
            "message": inp.message, "reply": reply, "created_at": now_iso(),
        })
        return {"reply": reply, "session_id": session_id}
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        return {"reply": "Sorry, the assistant is temporarily unavailable. Please try again shortly.",
                "session_id": session_id}


# ---------------- Seeding ----------------
async def seed():
    # indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
    except Exception:
        pass
    # admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@agribid.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": new_id(), "name": "Admin", "email": admin_email,
            "password_hash": hash_password(admin_pw), "role": "supplier",
            "phone": "", "location": "Pune", "rating_avg": 0, "rating_count": 0,
            "created_at": now_iso(),
        })

    # market prices with 30-day trend
    import random
    crops = [
        ("Onion", 35, "₹"), ("Tomato", 28, "₹"), ("Potato", 22, "₹"),
        ("Wheat", 26, "₹"), ("Rice", 42, "₹"), ("Green Chilli", 55, "₹"),
        ("Cauliflower", 30, "₹"), ("Sugarcane", 3.5, "₹"),
    ]
    if await db.market_prices.count_documents({}) == 0:
        for name, base, cur in crops:
            history = []
            p = base
            for i in range(29, -1, -1):
                p = max(round(p + random.uniform(-base * 0.05, base * 0.05), 2), base * 0.6)
                d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
                history.append({"date": d, "price": round(p, 2)})
            await db.market_prices.insert_one({
                "id": new_id(), "crop": name, "unit": "kg",
                "current": history[-1]["price"],
                "avg_30d": round(sum(h["price"] for h in history) / len(history), 2),
                "min_30d": min(h["price"] for h in history),
                "max_30d": max(h["price"] for h in history),
                "history": history, "updated_at": now_iso(),
            })

    # sample marketplace products
    if await db.products.count_documents({}) == 0:
        samples = [
            ("Fresh Onions", 32, "Nashik, Maharashtra", "A",
             "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80"),
            ("Vine Tomatoes", 30, "Kolar, Karnataka", "A",
             "https://images.unsplash.com/photo-1485637701894-09ad422f6de6?w=600&q=80"),
            ("Organic Potatoes", 24, "Agra, Uttar Pradesh", "B",
             "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80"),
            ("Mixed Vegetables", 40, "Pune, Maharashtra", "A",
             "https://images.unsplash.com/photo-1591586116988-62fe65164f8d?w=600&q=80"),
        ]
        for name, price, origin, grade, img in samples:
            await db.products.insert_one({
                "id": new_id(), "name": name, "price": price, "origin": origin,
                "grade": grade, "image": img, "supplier_id": "seed",
                "supplier_name": "AgriBid Verified", "created_at": now_iso(),
            })


@app.on_event("startup")
async def on_start():
    await seed()


@api.get("/")
async def root():
    return {"message": "AgriBid API running"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
