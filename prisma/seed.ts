import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

const IVA_RATE = 0.19;

function code(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

function ean13(seedNum: number) {
  // Deterministic pseudo-EAN13 for realistic-looking scannable demo barcodes.
  const base = `780${String(seedNum).padStart(9, "0")}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

function money(subtotal: number) {
  const taxAmount = Math.round(subtotal * IVA_RATE);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

async function main() {
  console.log("Seeding Aspen Vision…");

  const passwordHash = await bcrypt.hash("admin123", 10);
  const vendedorHash = await bcrypt.hash("vendedor123", 10);
  const preparadorHash = await bcrypt.hash("preparador123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@aspenvision.cl" },
    update: {},
    create: {
      name: "Renato Oliva",
      email: "admin@aspenvision.cl",
      passwordHash,
      role: "ADMIN",
    },
  });

  const vendedor = await db.user.upsert({
    where: { email: "camila@aspenvision.cl" },
    update: {},
    create: {
      name: "Camila Rojas",
      email: "camila@aspenvision.cl",
      passwordHash: vendedorHash,
      role: "VENDEDOR",
    },
  });

  const vendedor2 = await db.user.upsert({
    where: { email: "martina@aspenvision.cl" },
    update: {},
    create: {
      name: "Martina Soto",
      email: "martina@aspenvision.cl",
      passwordHash: vendedorHash,
      role: "VENDEDOR",
    },
  });

  const preparador = await db.user.upsert({
    where: { email: "diego@aspenvision.cl" },
    update: {},
    create: {
      name: "Diego Fuentes",
      email: "diego@aspenvision.cl",
      passwordHash: preparadorHash,
      role: "PREPARADOR",
    },
  });

  const categoriesData = [
    { name: "Adidas", slug: "adidas" },
    { name: "Sol", slug: "sol" },
    { name: "Óptico", slug: "optico" },
  ];
  const categories = new Map<string, string>();
  for (const c of categoriesData) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categories.set(c.slug, cat.id);
  }

  const productSeeds = [
    // Adidas
    { name: "Deportivo Aero", brand: "Adidas", model: "SP5008", cat: "adidas", shape: "Rectangular", color: "Negro", material: "TR90", price: 89990, stock: 14, img: "adidas-sp5008" },
    { name: "Deportivo Impact", brand: "Adidas", model: "OR5031", cat: "adidas", shape: "Cuadrado", color: "Gris", material: "Acetato", price: 94990, stock: 3, img: "adidas-or5031" },
    { name: "Deportivo Trail", brand: "Adidas", model: "AOR002", cat: "adidas", shape: "Envolvente", color: "Negro", material: "TR90", price: 79990, stock: 0, img: "adidas-aor002" },
    { name: "Deportivo Flex", brand: "Adidas", model: "SP5015", cat: "adidas", shape: "Rectangular", color: "Azul", material: "TR90", price: 84990, stock: 22, img: "adidas-sp5015" },
    // Sol
    { name: "Bahía Sol", brand: "Mormaii", model: "Floater", cat: "sol", shape: "Redondo", color: "Habana", material: "Acetato", price: 69990, stock: 18, img: "mormaii-floater" },
    { name: "Costa Brisa", brand: "Mormaii", model: "Bahia", cat: "sol", shape: "Ovalado", color: "Negro", material: "Acetato", price: 64990, stock: 6, img: "mormaii-bahia" },
    { name: "Clásico Wayfarer", brand: "Ray-Ban", model: "RB2140 Wayfarer", cat: "sol", shape: "Cuadrado", color: "Negro", material: "Acetato", price: 129990, stock: 9, img: "rayban-wayfarer" },
    { name: "Aviador Original", brand: "Ray-Ban", model: "RB3025 Aviator", cat: "sol", shape: "Aviador", color: "Dorado", material: "Metal", price: 139990, stock: 2, img: "rayban-aviator" },
    { name: "Holbrook Sport", brand: "Oakley", model: "Holbrook", cat: "sol", shape: "Cuadrado", color: "Negro", material: "O-Matter", price: 119990, stock: 11, img: "oakley-holbrook" },
    { name: "Coquimbo Beach", brand: "Vulk", model: "Coquimbo", cat: "sol", shape: "Redondo", color: "Transparente", material: "Acetato", price: 49990, stock: 30, img: "vulk-coquimbo" },
    { name: "Classic Gold", brand: "Aspen", model: "Classic Gold", cat: "sol", shape: "Aviador", color: "Dorado", material: "Metal", price: 59990, stock: 0, img: "aspen-classic-gold" },
    // Óptico
    { name: "Clubmaster Retro", brand: "Ray-Ban", model: "RX5154 Clubmaster", cat: "optico", shape: "Clubmaster", color: "Carey", material: "Acetato", price: 109990, stock: 8, img: "rayban-clubmaster" },
    { name: "Vogue Elegance", brand: "Vogue", model: "VO5052", cat: "optico", shape: "Ovalado", color: "Rosado", material: "Acetato", price: 74990, stock: 13, img: "vogue-vo5052" },
    { name: "Urban Black", brand: "Aspen", model: "Urban Black", cat: "optico", shape: "Rectangular", color: "Negro", material: "Acetato", price: 54990, stock: 4, img: "aspen-urban-black" },
    { name: "Urban Havana", brand: "Aspen", model: "Urban Havana", cat: "optico", shape: "Rectangular", color: "Habana", material: "Acetato", price: 54990, stock: 16, img: "aspen-urban-havana" },
    { name: "Deportivo Precision", brand: "Adidas", model: "OR5040", cat: "optico", shape: "Cuadrado", color: "Gris", material: "Metal", price: 92990, stock: 1, img: "adidas-or5040" },
    { name: "Vogue Line", brand: "Vogue", model: "VO5289", cat: "optico", shape: "Cat Eye", color: "Negro", material: "Acetato", price: 79990, stock: 9, img: "vogue-vo5289" },
    { name: "Wood Bamboo", brand: "Aspen", model: "Wood Bamboo", cat: "optico", shape: "Redondo", color: "Madera", material: "Bambú", price: 64990, stock: 20, img: "aspen-wood-bamboo" },
  ];

  const products = [];
  let seedNum = 1000;
  for (const p of productSeeds) {
    seedNum += 7;
    const barcode = ean13(seedNum);
    const product = await db.product.upsert({
      where: { barcode },
      update: {},
      create: {
        name: p.name,
        barcode,
        brand: p.brand,
        model: p.model,
        categoryId: categories.get(p.cat)!,
        shape: p.shape,
        color: p.color,
        material: p.material,
        stock: p.stock,
        images: [`https://picsum.photos/seed/${p.img}/600/600`],
      },
    });
    products.push({ ...product, price: p.price });

    if (p.stock > 0) {
      const existing = await db.inventoryMovement.findFirst({
        where: { productId: product.id, type: "ENTRADA" },
      });
      if (!existing) {
        await db.inventoryMovement.create({
          data: {
            productId: product.id,
            type: "ENTRADA",
            quantity: p.stock,
            reason: "Recepción inicial de stock",
            reference: "Carga inicial",
            userId: admin.id,
          },
        });
      }
    }
  }

  console.log(`Created ${products.length} products.`);

  const customerSeeds = [
    { name: "Francisco Díaz", rut: "12345678-9", businessName: null },
    { name: "María José Torres", rut: "9876543-2", businessName: "Óptica Torres SpA" },
    { name: "Constructora Andes Ltda.", rut: "76123456-0", businessName: "Constructora Andes Ltda." },
  ];
  const customers = [];
  for (const c of customerSeeds) {
    const customer = await db.customer.upsert({
      where: { rut: c.rut },
      update: {},
      create: c,
    });
    customers.push(customer);
  }

  const existingSales = await db.sale.count();
  if (existingSales === 0) {
    const sellers = [vendedor, vendedor2];
    let saleNum = 100;
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      saleNum += 1;
      const seller = sellers[i % sellers.length];
      const daysAgo = Math.floor(Math.random() * 21);
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);

      const lineCount = 1 + Math.floor(Math.random() * 2);
      const chosen = [...products]
        .sort(() => Math.random() - 0.5)
        .slice(0, lineCount);

      const requiresConfirmation = i % 5 !== 0;
      const items = chosen.map((p, idx) => {
        const m = money(p.price);
        return {
          position: idx,
          productId: p.id,
          quantity: 1,
          unitPrice: p.price,
          subtotal: m.subtotal,
          taxAmount: m.taxAmount,
          total: m.total,
        };
      });

      const customer = i % 3 === 0 ? customers[i % customers.length] : null;

      const sale = await db.sale.create({
        data: {
          code: code("V", saleNum),
          date,
          sellerId: seller.id,
          requiresConfirmation,
          status: requiresConfirmation ? "PENDIENTE_CONFIRMACION" : "CONFIRMADA",
          inventoryApplied: !requiresConfirmation,
          confirmedById: requiresConfirmation ? null : seller.id,
          confirmedAt: requiresConfirmation ? null : date,
          customerId: customer?.id,
          paymentMethod: ["Efectivo", "Débito", "Crédito", "Transferencia"][i % 4],
          items: { create: items },
        },
      });

      if (!requiresConfirmation) {
        for (const item of items) {
          await db.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: "VENTA",
              quantity: -item.quantity,
              reference: `Venta ${sale.code}`,
              saleId: sale.id,
              userId: seller.id,
            },
          });
        }
      } else {
        await db.notification.create({
          data: {
            type: "VENTA_PENDIENTE",
            title: "Nueva venta pendiente de confirmación",
            message: `${sale.code} registrada por ${seller.name}, esperando preparación.`,
            link: `/ventas/${sale.id}`,
            targetRole: "PREPARADOR",
            saleId: sale.id,
          },
        });
      }
    }
    console.log("Created demo sales.");
  }

  const ambassador = await db.ambassador.upsert({
    where: { id: "seed-amb-1" },
    update: {},
    create: {
      id: "seed-amb-1",
      name: "Valentina Muñoz",
      instagram: "@valemunoz",
      email: "vale@example.com",
      notes: "Influencer de lifestyle, 120k seguidores.",
    },
  });

  const existingDeliveries = await db.ambassadorDelivery.count();
  if (existingDeliveries === 0) {
    const gift = products[4];
    const delivery = await db.ambassadorDelivery.create({
      data: {
        code: code("E", 1),
        ambassadorId: ambassador.id,
        deliveredById: admin.id,
        notes: "Colaboración Instagram — reel unboxing.",
        items: { create: [{ productId: gift.id, quantity: 2 }] },
      },
    });
    await db.inventoryMovement.create({
      data: {
        productId: gift.id,
        type: "EMBAJADOR",
        quantity: -2,
        reference: `Entrega ${delivery.code}`,
        ambassadorDeliveryId: delivery.id,
        userId: admin.id,
      },
    });
  }

  const existingWarranties = await db.warranty.count();
  if (existingWarranties === 0) {
    const defective = products[7];
    const warranty = await db.warranty.create({
      data: {
        code: code("G", 1),
        customerName: "Francisco Díaz",
        customerContact: "+56 9 8765 4321",
        productId: defective.id,
        quantity: 1,
        reason: "Bisagra defectuosa reportada por el cliente",
        status: "RESUELTA",
        responsibleId: preparador.id,
      },
    });
    await db.inventoryMovement.create({
      data: {
        productId: defective.id,
        type: "GARANTIA",
        quantity: -1,
        reference: `Garantía ${warranty.code}`,
        warrantyId: warranty.id,
        userId: preparador.id,
      },
    });
    await db.warranty.update({
      where: { id: warranty.id },
      data: { inventoryApplied: true },
    });
  }

  console.log("Seed complete.");
  console.log("Login: admin@aspenvision.cl / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
