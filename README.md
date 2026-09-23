# AgriConnect

**Empowering Farmers, Redefining Agricultural Procurement**

A production-oriented agricultural procurement and e-commerce platform.

AgriConnect solves the information-asymmetry problem between farmers and suppliers/middlemen by providing :

1. Market price transparency
2. Supplier-created procurement requirements (reverse procurement)
3. Competitive open farmer bidding
4. Quality information (farmer-declared grade + images)
5. Smart bid ranking and allocation recommendations
6. Separate contracts/orders for selected farmers
7. Supplier inventory management
8. A B2C e-commerce marketplace where suppliers sell acquired produce to customers


## Business Flow

```
Farmer → Supplier → Customer
```

- **B2B Procurement:** Farmers compete to fulfill supplier requirements through transparent, open bidding.
- **B2C E-commerce:** Suppliers sell the produce they acquired from farmers through a normal e-commerce experience.

## Roles

Exactly **three** user roles (no admin portal):

1. **Farmer** — discovers procurement opportunities, submits competitive bids, delivers produce
2. **Supplier / Wholesaler** — creates procurement requirements, reviews & selects farmers, manages inventory, sells to customers
3. **Customer** — browses and purchases produce in a normal e-commerce flow

## Tech Stack

| Layer         | Technology                                                  |
|---------------|-------------------------------------------------------------|
| Frontend      | React + TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Backend       | Node.js + Express + TypeScript                              |
| Primary DB    | PostgreSQL + Prisma ORM                                     |
| NoSQL DB      | MongoDB (flexible/AI/analytics data)                        |
| Cache         | Redis (market prices, rate limiting, ephemeral data)        |
| Auth          | JWT + bcrypt                                                |
| Images        | Cloudinary                                                  |
| Real-time     | Socket.IO                                                   |
| Notifications | Firebase Cloud Messaging                                    |
| Payments      | Razorpay (server-verified + webhooks)                       |
| Maps          | Google Maps API                                             |
| Market data   | AGMARKNET / eNAM                                            |
| AI/ML         | Python + FastAPI (future enhancement)                       |

## Architecture

**Modular Monolith + Polyglot Persistence.**

PostgreSQL is the **source of truth** for all transactional data (users, profiles, procurements, bids, contracts, orders, inventory, products, payments, deliveries). MongoDB stores flexible/document data (AI results, event/activity docs, notification payloads, analytics). Redis caches market prices and frequently-accessed data. Payment verification is always server-side and idempotent.

The backend is one deployable application internally divided into clear modules:
`auth, farmers, suppliers, customers, procurement, bidding, allocation, quality, inventory, products, orders, payments, notifications, market-prices, tracking`.

## Project Structure

```
├── backend/               # Node.js + Express + TypeScript
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── utils/
│       ├── modules/
│       │   ├── auth/
│       │   ├── farmers/
│       │   ├── suppliers/
│       │   ├── customers/
│       │   ├── procurement/
│       │   ├── bidding/
│       │   ├── allocation/
│       │   ├── quality/
│       │   ├── inventory/
│       │   ├── products/
│       │   ├── orders/
│       │   ├── payments/
│       │   ├── notifications/
│       │   ├── market-prices/
│       │   └── tracking/
│       ├── app.ts
│       └── server.ts
└── frontend/              # React + TypeScript + Vite
    └── src/
        ├── components/
        ├── pages/
        │   ├── auth/
        │   ├── farmer/
        │   ├── supplier/
        │   └── customer/
        ├── services/
        ├── hooks/
        ├── context/
        ├── types/
        ├── utils/
        ├── routes/
        └── App.tsx
```

## Development Phases

1. **Auth & Users** — registration, login, JWT, roles, profiles
2. **Procurement** — supplier requirements, farmer discovery, notifications, open bidding, bid deadlines
3. **Smart procurement** — bid ranking, smart allocation, supplier recommendation screen, manual selection, multi-farmer acceptance
4. **Quality & Inventory** — image upload, grade, quality verification, farmer contracts, supplier inventory
5. **E-commerce** — product listings, search, cart, checkout, customer orders
6. **Payments** — Razorpay server-side verification + webhooks, refunds/cancellation
7. **Notifications & real-time** — FCM, Socket.IO
8. **Market prices** — government data source, normalization, history, Redis caching
9. **Advanced** — AI quality assessment, optimization, maps, logistics
10. **Production** — Docker, CI/CD, monitoring, logging, backups, scaling

## Core State Machines

- **Procurement:** `DRAFT → OPEN → BIDDING_CLOSED → UNDER_SELECTION → PARTIALLY_FULFILLED → FULLY_ALLOCATED → IN_DELIVERY → COMPLETED`
- **Bid:** `SUBMITTED → ACTIVE → ACCEPTED | REJECTED | WITHDRAWN | EXPIRED`
- **Farmer contract:** `CREATED → ACCEPTED → IN_DELIVERY → RECEIVED → QUALITY_VERIFIED → COMPLETED`
- **Customer order:** `CREATED → PAYMENT_PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`

## Getting Started


### Backend

```bash
cd backend
cp .env.example .env   # configure your environment (PostgreSQL, MongoDB, Redis, JWT, Razorpay)
npm install
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Requires PostgreSQL, MongoDB, and Redis running locally (see `backend/docker-compose.yml`).
