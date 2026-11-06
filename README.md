# AgriConnect
**Empowering Farmers, Redefining Agricultural Procurement**

A production-oriented agricultural procurement and e-commerce platform that connects **Farmers**, **Suppliers/Wholesalers**, and **Customers** through transparent bidding, quality verification, inventory management, and a B2C marketplace.

## Table of Contents
- [Overview](#overview)
- [Documentation](#documentation)
- [Roles](#roles)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running with Docker (Recommended)](#running-with-docker-recommended)
- [Running Natively (No Docker)](#running-natively-no-docker)
- [Demo Credentials](#demo-credentials)
- [Build & Typecheck](#build--typecheck)
- [Core Workflows](#core-workflows)
- [State Machines](#state-machines)
- [Key Notes](#key-notes)
- [Development Phases](#development-phases)

## Overview

AgriConnect solves the information asymmetry in agricultural supply chains by enabling:

1. **Market price transparency**  View and track crop market prices
2. **Reverse procurement**  Suppliers post procurement requirements with quantity, grade, and deadline
3. **Open competitive bidding**  Farmers bid transparently with price, quantity, grade, and delivery date
4. **Smart bid ranking**  Explainable scoring to help suppliers shortlist (recommendation-only)
5. **Quality verification**  Drives inventory ownership transfer after acceptance
6. **Supplier inventory**  Verified produce becomes sellable stock
7. **B2C marketplace**  Suppliers list inventory and customers buy directly



## Roles

Exactly **three** user roles (**no admin portal**):

1. **Farmer**  Discover procurements, submit/update/withdraw bids (before deadline), manage contracts & deliveries
2. **Supplier/Wholesaler**  Create procurements, review bids, accept bids, verify quality, manage inventory & product listings, handle deliveries
3. **Customer**  Browse marketplace, add to cart, checkout, track orders

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite 5, Tailwind CSS 3, React Router, React Hook Form, Zod, Axios, Sonner, Lucide React, Recharts, Socket.IO Client |
| **Backend** | Node.js + Express 4 + TypeScript, Modular Monolith |
| **Primary DB** | PostgreSQL 16 + Prisma ORM 5.22.0 (source of truth) |
| **NoSQL DB** | MongoDB 7/8 + Mongoose 8.8.1 (audit/events/snapshots) |
| **Cache** | Redis 7 + ioredis 5.4.1 (market prices, rate limiting) |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Images** | Cloudinary 2.5.1 |
| **Real-time** | Socket.IO 4.8.1 (bid updates & notifications) |
| **Notifications** | Firebase Cloud Messaging (firebase-admin 12.7.0  optional in dev) |


## Architecture

**Modular Monolith + Polyglot Persistence**

- **PostgreSQL** is the **source of truth** for transactional data (users, profiles, procurements, bids, contracts, quality, inventory, listings, cart, orders, payments, deliveries, notifications)
- **MongoDB** stores flexible/document data (AI analysis, activity events, allocation snapshots, chat sessions, notification payloads)
- **Redis** caches market prices (cache-aside) and supports rate limiting
- **Socket.IO** pushes real-time updates to users/procurement rooms
- **Payments** are always **server-side verified** via Razorpay webhooks with **idempotency** checks

All API responses follow the envelope: { success: true, data: <value> }. The frontend services unwrap 
es.data.data.



## Running with Docker (Recommended)

If Docker Desktop is installed and running:


# From project root
docker compose up -d postgres mongodb redis
# wait a few seconds for DBs to be ready

# Apply schema + seed (from host, with DBs exposed)
cd backend
npx prisma db push
npm run prisma:seed

# Start full stack
docker compose up -d backend frontend
`

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)
- Health: [http://localhost:5000/health](http://localhost:5000/health)

**Note:** docker-compose.yml contains **no real secrets** � it uses local dev defaults and reads from .env files via env_file. It's safe to commit to GitHub.

## Running Natively (No Docker)

1. Install & start **PostgreSQL**, **MongoDB**, **Redis** on localhost:5432, 27017, 6379
2. Update backend/.env if your credentials differ
3. Run:

`bash
# Terminal 1 - Backend
cd backend
npm install  # already done if node_modules present
npx prisma db push
npm run prisma:seed
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install  # already done if node_modules present
npm run dev
`



## Build & Typecheck

Both projects build clean in this repo:

`bash
# Backend
cd backend
npm run typecheck  # tsc --noEmit
npm run build      # builds to dist/

# Frontend
cd frontend
npm run typecheck  # tsc --noEmit
npm run build      # builds to dist/ (vite)
`

## Core Workflows

### B2B: Procurement ? Bidding ? Contracts
1. **Supplier** creates procurement (OPEN) with quantity, min grade, bid deadline
2. **Farmers** submit bids (open bidding � visible to others until deadline)
3. **Supplier** closes bidding ? views **Smart Allocation** recommendations (ranked by score)
4. **Supplier** accepts 1+ bids ? **FarmerContract(s)** created in a transaction
5. **Farmer delivers** ? Supplier marks received ? **Quality Verification** (ACCEPTED/ADJUSTED/REJECTED/DISPUTED)
6. **ACCEPTED/ADJUSTED** ? produce moved to **Supplier Inventory** (ownership transfer). **REJECTED** ? stays with farmer (reliability adjusted). **FAILED delivery** ? undelivered qty returns to procurement, bidding reopens for remaining qty

### B2C: Inventory ? Listings ? Orders
1. **Supplier** creates **ProductListing** from verified inventory
2. **Customer** browses marketplace, adds to cart, proceeds to checkout
3. **Checkout** creates order (PAYMENT_PENDING) and **atomically reserves inventory**
4. **Razorpay** � Backend creates Razorpay order ? customer pays ? **signed webhook** confirms (CAPTURED, idempotent) ? order becomes CONFIRMED and stock decremented
5. **Supplier** advances order status (PROCESSING ? PACKED ? SHIPPED ? OUT_FOR_DELIVERY ? DELIVERED); **Tracking** page shows events

### Smart Allocation (Recommendation-only)
Default weights: **Price 30%**, **Quality 25%**, **Quantity 15%**, **Delivery 10%**, **Distance 10%**, **Reliability 10%**. Supplier always has the final decision.

### Farmer reliability
Reliability is a 0–100 score calculated from resolved platform contracts, never from registration. Its initial policy weights are: successful verified fulfilment **35%**, on-time supplier receipt **25%**, accepted-versus-delivered quality quantity **20%**, cancellation/rejection/dispute history **15%**, and verified transaction history (up to ten transactions) **5%**. Each contract is counted once using its latest non-pending verification. A score is withheld as **Insufficient history** until there are three resolved/verified transactions; confidence is low at 3–4, medium at 5–9, and high at 10+. Components without supporting evidence are omitted and the remaining weights are rebalanced—missing data is never treated as perfect performance. These are configurable product-policy starting thresholds, not scientifically validated claims.

### AI crop-photo assessment
The optional FastAPI service in `services/crop-quality-service` receives bid-photo bytes only from the authenticated Node backend. PostgreSQL remains authoritative for bids and image references; MongoDB stores non-authoritative assessment metadata keyed by bid ID. The browser never calls the model service. In the current repository no trained, crop-specific quality model or validated detector is bundled, so the service performs real image validation and returns an explicit unavailable/unsupported result rather than a fabricated quality class, defect box, confidence, or A/B/C grade. See `services/crop-quality-service/README.md` for setup and the validated-model onboarding policy.

## State Machines

- **Procurement:** DRAFT ? OPEN ? BIDDING_CLOSED ? UNDER_SELECTION ? PARTIALLY_FULFILLED ? FULLY_ALLOCATED ? IN_DELIVERY ? COMPLETED
- **Bid:** SUBMITTED ? ACTIVE ? ACCEPTED | REJECTED | WITHDRAWN | EXPIRED
- **Farmer Contract:** CREATED ? ACCEPTED ? IN_DELIVERY ? RECEIVED ? QUALITY_VERIFIED ? COMPLETED (+ LATE ? FAILED)
- **Customer Order:** CREATED ? PAYMENT_PENDING ? CONFIRMED ? PROCESSING ? PACKED ? SHIPPED ? OUT_FOR_DELIVERY ? DELIVERED
- **Payment:** CREATED ? CAPTURED (webhook-driven, idempotent)


## Development Phases

1. **Auth & Users** - Registration, login, JWT, roles, profiles
2. **Procurement** - Create requirements, discover, open bidding, deadlines
3. **Smart Procurement** - Bid ranking, smart allocation UI, manual selection, multi-farmer acceptance
4. **Quality & Inventory** - Image upload, grade, quality verification, contracts, inventory
5. **E-commerce** - Listings, search, cart, checkout, customer orders
6. **Payments** � Razorpay server-side + webhooks + idempotency
7. **Notifications & Real-time** � FCM (optional), Socket.IO
8. **Market Prices** � Seed + Redis cache-aside
9. **Advanced** � AI quality, maps, logistics (scaffolded)
10. **Production** � Docker, CI/CD, monitoring, logging, backups, scaling
