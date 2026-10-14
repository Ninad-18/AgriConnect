import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const CROPS = [
  { name: "Onion", basePrice: 35 },
  { name: "Tomato", basePrice: 28 },
  { name: "Potato", basePrice: 22 },
  { name: "Wheat", basePrice: 26 },
  { name: "Rice", basePrice: 42 },
  { name: "Green Chilli", basePrice: 55 },
  { name: "Cauliflower", basePrice: 30 },
  { name: "Sugarcane", basePrice: 3.5 },
];

async function main() {
  console.log("Seeding AgriConnect...");

  const pw = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "farmer@agriconnect.in" },
    update: {},
    create: {
      email: "farmer@agriconnect.in",
      passwordHash: pw,
      name: "Ramesh Patil",
      role: "FARMER",
      phone: "9876500001",
      location: "Nashik, Maharashtra",
      farmerProfile: {
        create: {
          farmName: "Patil Agro Farms",
          location: "Nashik, Maharashtra",
          crops: ["Onion", "Tomato"],
          farmSizeAcres: 12,
          distanceKm: 35,
          bio: "Growing premium onions and tomatoes for 15 years",
          reliability: 95,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "supplier@agriconnect.in" },
    update: {},
    create: {
      email: "supplier@agriconnect.in",
      passwordHash: pw,
      name: "GreenMart Wholesale",
      role: "SUPPLIER",
      phone: "9876500002",
      location: "Pune, Maharashtra",
      supplierProfile: {
        create: {
          companyName: "GreenMart Wholesale Pvt. Ltd.",
          location: "Pune, Maharashtra",
          businessType: "Wholesale procurement & retail",
          bio: "We source quality produce directly from farmers and supply to retail markets.",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@agriconnect.in" },
    update: {},
    create: {
      email: "customer@agriconnect.in",
      passwordHash: pw,
      name: "Priya Sharma",
      role: "CUSTOMER",
      phone: "9876500003",
      location: "Mumbai, Maharashtra",
      customerProfile: { create: {} },
    },
  });

  console.log("Users ready: farmer@, supplier@, customer@agriconnect.in");

  for (const crop of CROPS) {
    const history: { date: string; price: number }[] = [];
    let p = crop.basePrice;
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      p = Math.max(
        Math.round((p + (Math.random() - 0.5) * crop.basePrice * 0.1) * 100) / 100,
        crop.basePrice * 0.6
      );
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      history.push({ date: d, price: p });
    }
    const prices = history.map((h) => h.price);

    const existing = await prisma.marketPrice.findFirst({ where: { crop: crop.name } });
    if (!existing) {
      await prisma.marketPrice.create({
        data: {
          crop: crop.name,
          unit: "kg",
          currency: "INR",
          current: prices[prices.length - 1],
          avg30d: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
          min30d: Math.min(...prices),
          max30d: Math.max(...prices),
          source: "seed",
          history: history as unknown as object,
        },
      });
    }
  }

  console.log("Market prices seeded");

  for (const crop of CROPS) {
    const existing = await prisma.product.findFirst({ where: { name: crop.name } });
    if (!existing) {
      await prisma.product.create({ data: { name: crop.name, cropName: crop.name, unit: "kg" } });
    }
  }
  console.log("Catalogue seeded");

  console.log("Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });