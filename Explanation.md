# AgriConnect — Complete Technical Explanation

This document explains how the **AgriConnect** project works: the file-by-file structure, the
external services & API keys you must provide, how data flows through the system, the core
workflows, what is already installed on your machine, and other technical details.

> Project root: `C:\Users\NINAD\OneDrive\Desktop\app`
> Tech stack: **Node.js + Express + TypeScript** (backend), **React + TypeScript + Vite + Tailwind** (frontend), **PostgreSQL + Prisma** (source of truth), **MongoDB** (flexible data), **Redis** (cache), **Razorpay** (payments).

---

## 1. Project Structure & What Each File Does

```
app/
├── README.md                          ← Project overview, roles, tech stack, state machines, quick start
├── docker-compose.yml                 ← Runs Postgres, MongoDB, Redis, backend & frontend together
├── Explanation.md                     ← This file
├── backend/                           ← API server (Express + TypeScript)
│   ├── package.json                   ← Backend dependencies + npm scripts (dev/build/start  prisma seed)
│   ├── package-lock.json              ← Lockfile (pinned versions)
│   ├── tsconfig.json                  ← TypeScript compiler config for the backend
│   ├── .env.example                   ← Template of every environment variable. Copy to .env
│   ├── .env                           ← YOUR actual secrets (git-ignored; created during setup)
│   ├── .gitignore
│   ├── Dockerfile                     ← Multi-stage build: compile TS, run Node production image
│   ├── prisma/
│   │   ├── schema.prisma              ← THE database schema (23 Postgres models + 13 enums)
│   │   └── seed.ts                    ← Seeds demo users, market-price history, product catalogue
│   └── src/
│       ├── server.ts                  ← Entry point: loads env, connects DBs, starts HTTP + Socket.IO
│       ├── app.ts                     ← Creates Express app: middleware, mounts ALL /api/v1 routes
│       ├── config/
│       │   ├── env.ts                 ← Reads & validates env vars, exports a typed `env` object
│       │   ├── database.ts            ← PrismaClient singleton (source-of-truth DB client)
│       │   ├── connect.ts             ← connectDatabases(): connects Postgres (Prisma), Mongo, Redis
│       │   ├── redis.ts               ← Redis client + cache-aside helpers (get/set cache)
│       │   ├── cloudinary.ts          ← Cloudinary config + uploadImage() / deleteImage()
│       │   ├── socket.ts              ← Socket.IO server: JWT auth, user/procurement rooms, emit helpers
│       │   └── mongodb.models.ts      ← Mongoose models for flexible data (AI results, activity, chat, snapshots)
│       ├── middleware/
│       │   ├── auth.ts                ← JWT verification + authorize(role) guards + signToken (used by auth)
│       │   ├── validate.ts            ← Zod body/query/params validation middleware
│       │   ├── rateLimiter.ts         ← Per-route rate limits (auth + general API)
│       │   ├── upload.ts              ← Multer middleware for image uploads (memory, 5MB, image-only)
│       │   ├── errorHandler.ts        ← AppError class + global error handler middleware
│       │   └── index.ts               ← Re-exports asyncHandler, notFoundHandler, errorMiddleware
│       ├── utils/
│       │   ├── constants.ts           ← ALL enums, role/grade lists, default allocation weights
│       │   ├── helpers.ts             ← gradeRank(), generateOrderNumber(), round2(), etc.
│       │   └── notification.service.ts← createNotification() + logActivity() (in-app + Mongo audit)
│       └── modules/                   ← One folder per feature (modular monolith)
│           ├── auth/                  ← Register / Login / Me (JWT + bcrypt)
│           │   ├── auth.routes.ts     ├── auth.validation.ts (Zod)
│           │   ├── auth.controller.ts └── auth.service.ts
│           ├── farmers/               ← Farmer profile get/update (reliability, crops, distance)
│           ├── suppliers/             ← Supplier profile get/update + contracts grouped by procurement
│           ├── customers/             ← Customer profile, addresses, shopping cart (get/add/update/remove item)
│           ├── procurement/           ← Supplier creates procurement, lists, gets, closes/cancels,
│           │                            and accepts bids → creates FarmerContracts (transactional)
│           ├── bidding/               ← Farmer creates/updates/withdraws bids (deadline rules),
│           │                            lists own bids, expires overdue bids
│           ├── allocation/            ← Smart ranking engine: scores bids (price/quality/quantity/
│           │                            delivery/distance/reliability) → recommendation only
│           ├── quality/               ← receiveProduce() + verifyQuality() + ownership-transfer to inventory
│           ├── inventory/             ← Supplier's stock list (from accepted verified produce)
│           ├── products/              ← B2C listings: browse, create (image upload), update, deactivate
│           ├── orders/                ← Checkout (atomic inventory reservation), list/get, advance status
│           ├── payments/              ← Razorpay create-order, verify, signed webhook (idempotent), farmer payout
│           ├── notifications/         ← In-app notification list, unread count, mark read/all
│           ├── market-prices/         ← Market price list/get/history with Redis caching
│           └── tracking/              ← Order tracking: get status + supplier advances status/events
└── frontend/                          ← Browser app (React + TypeScript + Vite)
    ├── package.json                   ← Frontend dependencies + scripts (dev/build/typecheck)
    ├── package-lock.json
    ├── tsconfig.json + tsconfig.node.json ← TS configs (app code + vite config)
    ├── vite.config.ts                 ← Vite dev server + proxy `/api` → localhost:5000 + @/* alias
    ├── index.html                     ← HTML shell that mounts #root
    ├── tailwind.config.js             ← Tailwind theme (brand colors, fonts)
    ├── postcss.config.js              ← Tailwind + autoprefixer pipeline
    ├── nginx.conf                     ← Serves built app + proxies /api & /socket.io to backend
    ├── Dockerfile                     ← Builds app → serves via nginx
    ├── .env / .env.example            ← VITE_API_BASE_URL, VITE_RAZORPAY_KEY_ID
    ├── .gitignore
    └── src/
        ├── main.tsx                   ← React entry: BrowserRouter + AuthProvider + Toaster
        ├── App.tsx                    ← Route table + role-gated protected routes
        ├── index.css                  ← Tailwind base/component classes + shared button/input/card styles
        ├── vite-env.d.ts              ← Vite env type declarations
        ├── types/index.ts             ← All TypeScript types (User, Bid, Contract, Order, etc.)
        ├── services/                  ← Axios API layer, one file per domain:
        │                               api.ts (client + auth interceptor), auth.ts, procurements.ts,
        │                               bids.ts, contracts.ts, quality.ts, inventory.ts, products.ts,
        │                               orders.ts, customers.ts, marketPrices.ts, notifications.ts
        ├── context/
        │   ├── AuthContext.tsx        ← Auth state: login/register/logout, JWT + user in localStorage
        │   └── CartContext.tsx        ← Cart state (guest localStorage fallback + server cart)
        ├── components/
        │   ├── ProtectedRoute.tsx     ← Redirects unauthenticated/wrong-role users
        │   ├── layout/Navbar.tsx      ← Top nav with role-specific links + cart badge
        │   └── ui/  (badges.tsx, PageHeader.tsx) ← StatCard, Badge, Spinner, EmptyState, headers
        ├── lib/format.ts              ← INR/date/kg formatting helpers
        └── pages/                     ← One page per route
            ├── auth/      Login.tsx, Register.tsx
            ├── shared/    Landing.tsx, MarketPrices.tsx, Notifications.tsx
            ├── farmer/    FarmerDashboard.tsx, FarmerProfile.tsx, ProcurementList.tsx,
            │              SubmitBid.tsx, MyBids.tsx, MyContracts.tsx
            ├── supplier/  SupplierDashboard.tsx, SupplierProfile.tsx, CreateProcurement.tsx,
            │              ManageProcurements.tsx, ProcurementDetail.tsx, Contracts.tsx,
            │              Inventory.tsx, Products.tsx, Deliveries.tsx
            └── customer/  Marketplace.tsx, ProductDetail.tsx, CartPage.tsx, Checkout.tsx, Orders.tsx
```

### Backend "module" pattern (all 15 modules follow it)

|     File         |                Responsibility                                   |
|------------------|-----------------------------------------------------------------|
| `*.routes.ts`    | URL paths + HTTP verbs, wires middleware & controller           |
| `*.controller.ts`| Thin HTTP layer — calls service, sends `{ success, data }` JSON |
| `*.service.ts`   | Business logic + database access (Prisma/Mongo)                 |
| `*.validation.ts`| Zod schemas that validate incoming request bodies               |

Every API response is wrapped as `{ success: true/false, data: ... }` (or an error message) so the
frontend unwraps consistently: `res.data.data`.

---

## 2. API Keys You Must Provide

These are **empty placeholders** right now. Without them the related features won't work
(they degrade gracefully — e.g. the checkout warns "payment not configured").

### Required to start at all (in `backend/.env`)
| Variable       | Value                  | Purpose                                        |
|----------------|------------------------|------------------------------------------------|
| `DATABASE_URL` | `postgresql://agriconnect:agriconnect@localhost:5432/agriconnect?schema=public`   | PostgreSQL connection (Prisma)                                          |
| `MONGO_URL`    | `mongodb://localhost:27017/agriconnect` | MongoDB connection (Mongoose) |
| `REDIS_URL`    | `redis://localhost:6379` | Redis cache connection                       |
| `JWT_SECRET`   | any long random string   | Signs login tokens — **change from the default** in production                                                                    |

### Required for specific features
| Variable                          | Where to set        | Feature it unlocks |
|-----------------------------------|---------------------|--------------------|
| `CLOUDINARY_CLOUD_NAME`           | `backend/.env`      | Uploading bid photos & product images to Cloudinary |
| `CLOUDINARY_API_KEY`              | `backend/.env`      | (same) |
| `CLOUDINARY_API_SECRET`           | `backend/.env`      | (same) |
| `RAZORPAY_KEY_ID`                 | `backend/.env` + `frontend/.env` (as `VITE_RAZORPAY_KEY_ID`) | Real customer payments |
| `RAZORPAY_KEY_SECRET` | `backend/.env` | Server-side order creation + verification |
| `RAZORPAY_WEBHOOK_SECRET` | `backend/.env` | Validates Razorpay webhook signatures |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `backend/.env` | Firebase Cloud Messaging (push notifications) |
| `GOOGLE_MAPS_API_KEY` | `backend/.env` | Distance/location features (currently optional; farmers store manual distance) |

### Notes on the API keys
- `RAZORPAY_WEBHOOK_SECRET` and `FIREBASE_SERVICE_ACCOUNT_PATH`
  are read via `verifyWebhookSignature`/FCM. If empty, the webhook endpoint returns
  `503 Webhook secret not configured` and push notifications are skipped (in-app notifications in
  Postgres still work).
- The frontend `.env` exposes **only** the Razorpay **Key ID** (`VITE_...` prefix) — it is safe to
  ship to the browser. The **Key Secret** must NEVER go into the frontend; it lives only in `backend/.env`.

---

## 3. Websites / Accounts You Need

| # | Site | Account needed for | What you get |
|---|------|--------------------|--------------|
| 1 | **Razorpay** — https://dashboard.razorpay.com | Payments | `Key ID`, `Key Secret`, and a `Webhook Secret` (set endpoint `POST https://YOUR-HOST/api/v1/payments/webhook`) |
| 2 | **Cloudinary** — https://cloudinary.com | Image upload/storage | `Cloud Name`, `API Key`, `API Secret` (free tier is fine) |
| 3 | **Firebase** — https://console.firebase.google.com | Push notifications (FCM) | A service-account JSON file; put its path in `FIREBASE_SERVICE_ACCOUNT_PATH` |
| 4 | **Google Cloud / Maps** — https://console.cloud.google.com | Location & distances (optional) | A Maps Platform API key for `GOOGLE_MAPS_API_KEY` |
| 5 | **Docker Hub** — https://hub.docker.com | `docker compose` convenience | A Docker Desktop + Docker account to pull postgres/mongo/redis images |
| 6 | **eNAM / AGMARKNET** — https://enam.gov.in (or via API/proxy) | Fake-less live market prices | Market data feed (the project ships a seed-stub; a real feed is a later integration) |

> You do **NOT** need a GitHub account to run this locally. Docker is optional — you can instead
> install PostgreSQL, MongoDB and Redis natively (see section 6).

---

## 4. How Data Flows in the Application

### 4.1 Polyglot persistence (three stores, different jobs)

```
Browser (React)
   │
   │  HTTPS/Axios  (Bearer JWT)
   ▼
Express API  (backend :5000)
   │
   ├──► PostgreSQL  ← SOURCE OF TRUTH for everything transactional
   │      users, profiles, procurements, bids, contracts,
   │      quality checks, inventory, listings, cart, orders, payments, deliveries, notifications
   │      (accessed through Prisma ORM / generated client)
   │
   ├──► MongoDB     ← FLEXIBLE / ANALYTICAL data
   │      AI analysis results, activity event log, chat history,
   │      allocation snapshots (audit of recommendations)
   │      (accessed through Mongoose models in mongodb.models.ts)
   │
   ├──► Redis       ← CACHE + ephemeral data
   │      market prices (cache-aside), rate-limit counters
   │
   └──► External SaaS
         Cloudinary (images) · Razorpay (payments) · FCM (push) · Google Maps · Socket.IO
```

### 4.2 Request lifecycle (example: farmer submits a bid)

1. **Frontend** (`SubmitBid.tsx`) → `services/bids.ts` → Axios `POST /api/v1/bids` with a
   `multipart/form-data` body (photos included).
2. **`middleware/auth.ts`** verifies the JWT in the `Authorization` header and attaches `req.user`.
3. **`middleware/upload.ts`** (Multer) captures the images into memory; route sends them to
   **Cloudinary** → returns public URLs.
4. **`middleware/validate.ts`** runs the Zod schema to reject bad payloads before business logic.
5. **`bidding.controller.ts`** → **`bidding.service.ts`**:
   - checks procurement status is `OPEN` and `bidDeadline` not passed,
   - checks farmer's declared `grade` meets the procurement `minGrade`,
   - writes the `Bid` (+ `BidImage` rows) to **PostgreSQL** via Prisma,
   - writes an activity event to **MongoDB** (`ActivityEvent`),
   - fires a **Socket.IO** notification to the supplier (`emitToUser`) so the UI updates live.
6. The response `{ success: true, data: bid }` returns to the browser; the farmer's `MyBids` list refreshes.

### 4.3 State data vs. cached data
- **Always authoritative (Postgres):** bids, contracts, orders, inventory, payments.
- **Cached (Redis):** market prices. On a price request, the API checks Redis; on a miss it queries
  Postgres and repopulates cache with a TTL.
- WebSocket (Socket.IO) events are **notifications only** — they never replace a DB write, so a
  refresh always shows consistent data.

---

## 5. Workflows (short)

### A. B2B procurement & bidding
```
Supplier creates procurement (OPEN) ──► farmers notified via Socket.IO + in-app notification
      │
      ▼
Farmers submit bids until bidDeadline (open bidding — everyone sees peer bids)
      │
      ▼
Supplier closes bidding → view "smart allocation" recommendations (ranked list)
      │
      ▼
Supplier accepts 1+ bids (transactional; can't oversell) ──► FarmerContracts created (1 per farmer)
      │
      ▼
Farmers deliver → supplier marks received → verifies quality (ACCEPTED/ADJUSTED/REJECTED/DISPUTED)
      │
      ├─ ACCEPTED/ADJUSTED ──► produce moved into supplier inventory (ownership transfer)
      ├─ REJECTED           ──► produce stays with farmer, reliability/rating drops
      └─ FAILED delivery    ──► undelivered qty returns to procurement, bidding re-opens for it
```

### B. B2C e-commerce
```
Supplier publishes listings from verified inventory ──► Customer browses Marketplace
      │
      ▼
Customer adds to cart → checkout (address) → order created (PAYMENT_PENDING)
      │
      ├─ Razorpay: backend creates Razorpay order → customer pays → webhook CAPTURED (idempotent)
      │             → order CONFIRMED, inventory decremented
      └─ Supplier: PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
```

### C. Smart allocation (recommendation only)
Each bid gets a **0–1 score** using weighted factors; the supplier decides (recommendation is never
auto-awarded):

| Weight | Criterion | Default | What favours a higher score |
|--------|-----------|---------|-----------------------------|
| 0.30 | Price | 30% | close to (or better than) the supplier's target price |
| 0.25 | Quality | 25% | higher declared grade |
| 0.15 | Quantity | 15% | better coverage of the required quantity |
| 0.10 | Delivery time | 10% | earlier/feasible delivery date |
| 0.10 | Distance | 10% | farmer closer to the market |
| 0.10 | Reliability | 10% | farmer's reliability history from past deliveries |

Weights are configurable; defaults live in `frontend`/`backend` `constants.ts`
(`DEFAULT_ALLOCATION_WEIGHTS`).

---

## 6. Installation & What's Already Installed on Your Machine

### Node.js runtime — ✅ ALREADY INSTALLED
| Tool | Version found |
|------|---------------|
| Node.js | v22.20.0 |
| npm | 10.9.3 |
| git | 2.50.1 |

### npm packages — ✅ ALREADY INSTALLED (node_modules present in both folders)
- `backend/package.json` deps: `@prisma/client`, `express`, `cors`, `helmet`, `morgan`, `zod`,
  `jsonwebtoken`, `bcrypt`, `mongoose`, `ioredis`, `socket.io`, `express-rate-limit`,
  `express-validator`, `multer`, `razorpay`, `cloudinary`, `firebase-admin`, `dotenv`
  (+ dev): `typescript`, `prisma`, `ts-node`, `ts-node-dev`, `@types/*`
- `frontend/package.json` deps: `react`, `react-dom`, `react-router-dom`, `axios`, `react-hook-form`,
  `zod`, `sonner`, `lucide-react`, `recharts`, `socket.io-client`
  (+ dev): `vite`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@vitejs/plugin-react`, `@types/*`

Both projects already pass **typecheck** and **production build**:
```
cd backend  && npm run build      # compiles to backend/dist
cd frontend && npm run build      # bundles to frontend/dist
```

### Databases & services — ❌ NOT RUNNING YET (needed before `npm run dev`)
| Service | Status on this machine |
|---------|------------------------|
| PostgreSQL | ❌ Not installed (no service found) |
| MongoDB | ❌ Not installed |
| Redis | ❌ Not installed |
| Docker | ❌ **Docker is NOT installed** — `docker compose` won't run |

> This is the one remaining blocker. `prisma db push`/`migrate` and the seed script need a live
> PostgreSQL; the server also connects to Mongo and Redis at startup.

### What YOU need to install next
**Option A — Docker (recommended):**
1. Install **Docker Desktop** → https://www.docker.com/products/docker-desktop/ (requires a Docker Hub account).
2. `docker compose up -d postgres mongodb redis` (starts just the databases from `docker-compose.yml`).
3. Then `docker compose up -d backend frontend` once you're ready for full stack.

**Option B — Native installs:**
1. **PostgreSQL** → https://www.postgresql.org/download/ (keep `port 5432`, user `agriconnect`, password `agriconnect`, DB `agriconnect`).
2. **MongoDB Community Server** → https://www.mongodb.com/try/download/community.
3. **Redis** → https://redis.io/download (Windows builds available; or use Memurai/`redis-server`).

### After a database is reachable
```bash
cd backend
npx prisma db push          # create tables from schema.prisma
npx prisma generate         # regenerate Prisma client (already done once, safe to re-run)
npm run prisma:seed         # demo users + market price history + catalogue
npm run dev                 # starts API on :5000
```
```bash
cd frontend
npm run dev                 # starts Vite on :5173 (proxies /api → :5000)
```

**Demo logins (created by the seed):** email `farmer@agriconnect.in` / `supplier@agriconnect.in` /
`customer@agriconnect.in` — password `password123`.

---

## 7. More Technical Details

### 7.1 State machines (who moves what)
| Entity | Flow |
|--------|------|
| Procurement | `OPEN → BIDDING_CLOSED → UNDER_SELECTION → PARTIALLY_FULFILLED → FULLY_ALLOCATED → IN_DELIVERY → COMPLETED` |
| Bid | `SUBMITTED → ACTIVE → ACCEPTED \| REJECTED \| WITHDRAWN \| EXPIRED` |
| Farmer contract | `CREATED → ACCEPTED → IN_DELIVERY → RECEIVED → QUALITY_VERIFIED → COMPLETED` (+ `LATE → FAILED`) |
| Customer order | `CREATED → PAYMENT_PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED` |
| Payment | `CREATED → CAPTURED` (webhook-only, idempotent) |

### 7.2 Security choices already built in
- Passwords hashed with **bcrypt** (10 rounds).
- JWT signed with `JWT_SECRET`; `authenticate` + `authorize("FARMER|SUPPLIER|CUSTOMER")` on routes.
- **Rate limiting**: stricter on `/auth/*`, general limiter on all `/api/*`.
- Helmet security headers + CORS allow-list (`CORS_ORIGINS`).
- Payment confirmation happens **only server-side**: Razorpay order created by backend, status
  confirmed by a **signed webhook** (HMAC-SHA256) that is **idempotent** (re-running a webhook does
  not create duplicate orders/payments).
- Multer restricts uploads to images ≤ 5 MB; files go to Cloudinary (never stored on the server).

### 7.3 Concurrency & correctness
- Accepting bids runs inside a **Prisma transaction** and guards against overselling
  (`requiredQuantityKg` vs `awardedQuantityKg`).
- Checkout **atomically reserves inventory** (`reservedKg` increments) before creating the order,
  and decrements stock only after payment is captured.
- Open bidding is intentional — farmers can see peer bids and adjust until the deadline.

### 7.4 Frontend data layer notes
- Axios interceptor attaches the JWT to every request and auto-logs-out on 401.
- The cart works for **guests** too (localStorage) and merges into the server cart after login.
- All pages are role-protected in `App.tsx` via `ProtectedRoute` (redirects by role).

### 7.5 Known current limits (by design for MVP)
- Checkout supports **one supplier per order** (multi-supplier cart is rejected with a clear error).
- Market prices ship with **seeded history**; wiring the live eNAM/AGMARKNET feed is a later step.
- AI quality-assessment, Google-Maps distance and FCM push are scaffolded but not yet wired to
  live providers (their models/placeholders exist).
- Docker is referenced by `docker-compose.yml` but isn't installed on this machine yet — section 6 explains the options.

### 7.6 Useful commands
```bash
# backend
cd backend
npm run dev            # hot-reload dev server on :5000
npm run build          # compile to dist/
npm run typecheck      # type errors only
npx prisma studio      # browse PostgreSQL data in the browser

# frontend
cd frontend
npm run dev            # dev server on :5173
npm run typecheck
npm run build          # production bundle in dist/
```