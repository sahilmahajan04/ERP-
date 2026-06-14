import { PrismaClient, Role, ProcurementStrategy, ProcurementType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Delete in reverse order of relationships
  await prisma.companySettings.deleteMany({});
  await prisma.documentSequence.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.stockLedger.deleteMany({});
  await prisma.procurementRequest.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.manufacturingOrder.deleteMany({});
  await prisma.boMOperation.deleteMany({});
  await prisma.boMComponent.deleteMany({});
  await prisma.boM.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.unitOfMeasure.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding default Company Settings...');
  await prisma.companySettings.create({
    data: {
      companyName: 'Shiv Furniture Works',
      address: 'Plot No. 42, Industrial Area, Sector 5, Panchkula, Haryana, India',
      phone: '+91-9876543210',
      email: 'info@shivfurniture.com',
      currency: 'INR',
    },
  });

  console.log('Seeding Document Sequences...');
  await prisma.documentSequence.createMany({
    data: [
      { prefix: 'SO', nextValue: 1, digits: 5 },
      { prefix: 'PO', nextValue: 1, digits: 5 },
      { prefix: 'MO', nextValue: 1, digits: 5 },
      { prefix: 'WO', nextValue: 1, digits: 5 },
      { prefix: 'PR', nextValue: 1, digits: 5 },
    ],
  });

  console.log('Seeding Users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@shivfurniture.com',
      passwordHash,
      firstName: 'Amit',
      lastName: 'Sharma',
      role: Role.ADMIN,
      active: true,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      email: 'sales@shivfurniture.com',
      passwordHash,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      role: Role.SALES_USER,
      active: true,
    },
  });

  const purchaseUser = await prisma.user.create({
    data: {
      email: 'purchase@shivfurniture.com',
      passwordHash,
      firstName: 'Sunita',
      lastName: 'Devi',
      role: Role.PURCHASE_USER,
      active: true,
    },
  });

  const manufacturingUser = await prisma.user.create({
    data: {
      email: 'manufacturing@shivfurniture.com',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Singh',
      role: Role.MANUFACTURING_USER,
      active: true,
    },
  });

  const inventoryManager = await prisma.user.create({
    data: {
      email: 'inventory@shivfurniture.com',
      passwordHash,
      firstName: 'Sanjay',
      lastName: 'Gupta',
      role: Role.INVENTORY_MANAGER,
      active: true,
    },
  });

  const businessOwner = await prisma.user.create({
    data: {
      email: 'owner@shivfurniture.com',
      passwordHash,
      firstName: 'Shiv',
      lastName: 'Ram',
      role: Role.BUSINESS_OWNER,
      active: true,
    },
  });

  console.log('Seeding Warehouse...');
  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: 'Main Industrial Layout, Sect-5, Panchkula',
      active: true,
    },
  });

  console.log('Seeding Product Categories...');
  const catRaw = await prisma.productCategory.create({
    data: { name: 'Raw Material', code: 'CAT-RAW', description: 'Wood logs, screws, metals' },
  });
  const catFG = await prisma.productCategory.create({
    data: { name: 'Finished Goods', code: 'CAT-FG', description: 'Assembled and painted furniture products' },
  });
  const catSFG = await prisma.productCategory.create({
    data: { name: 'Semi Finished Goods', code: 'CAT-SFG', description: 'Unpolished frames, partially assembled units' },
  });
  const catCons = await prisma.productCategory.create({
    data: { name: 'Consumables', code: 'CAT-CONS', description: 'Screws, glue, paint, sandpaper' },
  });

  console.log('Seeding Units of Measure...');
  const uomPcs = await prisma.unitOfMeasure.create({
    data: { name: 'Pieces', code: 'PCS' },
  });
  const uomKg = await prisma.unitOfMeasure.create({
    data: { name: 'Kilograms', code: 'KG' },
  });
  const uomMeter = await prisma.unitOfMeasure.create({
    data: { name: 'Meters', code: 'Meter' },
  });
  const uomLiter = await prisma.unitOfMeasure.create({
    data: { name: 'Liters', code: 'Liter' },
  });

  console.log('Seeding Vendors...');
  const vendorWood = await prisma.vendor.create({
    data: {
      name: 'Wood Supplier Ltd',
      contactName: 'John Doe',
      email: 'sales@woodsupplier.com',
      phone: '+91-9999999901',
      address: 'Industrial Area Phase 1, Chandigarh',
    },
  });
  const vendorHardware = await prisma.vendor.create({
    data: {
      name: 'Hardware Supplier Ltd',
      contactName: 'Jane Smith',
      email: 'info@hardwaresupplier.com',
      phone: '+91-9999999902',
      address: 'Industrial Area Phase 2, Chandigarh',
    },
  });

  console.log('Seeding Customers...');
  const customerABC = await prisma.customer.create({
    data: {
      name: 'ABC Furniture Store',
      email: 'buy@abcfurniture.com',
      phone: '+91-8888888801',
      address: 'Sector 17, Chandigarh',
    },
  });
  const customerXYZ = await prisma.customer.create({
    data: {
      name: 'XYZ Office Solutions',
      email: 'office@xyzsolutions.com',
      phone: '+91-8888888802',
      address: 'Sector 22, Chandigarh',
    },
  });

  console.log('Seeding Products...');
  // Raw materials and consumables (Purchased, Make-to-Stock)
  const productLegs = await prisma.product.create({
    data: {
      sku: 'RAW-LEG-01',
      name: 'Wooden Legs',
      description: 'Sturdy oak wooden table legs',
      salesPrice: 25.00,
      costPrice: 15.00,
      categoryId: catRaw.id,
      uomId: uomPcs.id,
      procurementStrategy: ProcurementStrategy.MTS,
      procurementType: ProcurementType.PURCHASE,
      vendorId: vendorWood.id,
    },
  });

  const productTop = await prisma.product.create({
    data: {
      sku: 'RAW-TOP-01',
      name: 'Wooden Top',
      description: 'Solid oak table top panel',
      salesPrice: 60.00,
      costPrice: 40.00,
      categoryId: catRaw.id,
      uomId: uomPcs.id,
      procurementStrategy: ProcurementStrategy.MTS,
      procurementType: ProcurementType.PURCHASE,
      vendorId: vendorWood.id,
    },
  });

  const productScrews = await prisma.product.create({
    data: {
      sku: 'RAW-SCR-01',
      name: 'Screws',
      description: 'Heavy duty assembly screws',
      salesPrice: 0.20,
      costPrice: 0.10,
      categoryId: catCons.id,
      uomId: uomPcs.id,
      procurementStrategy: ProcurementStrategy.MTS,
      procurementType: ProcurementType.PURCHASE,
      vendorId: vendorHardware.id,
    },
  });

  // Finished goods (Manufactured, Make-to-Order)
  const productTable = await prisma.product.create({
    data: {
      sku: 'FG-TBL-01',
      name: 'Wooden Table',
      description: 'Premium oak wooden dining table',
      salesPrice: 220.00,
      costPrice: 110.00,
      categoryId: catFG.id,
      uomId: uomPcs.id,
      procurementStrategy: ProcurementStrategy.MTO,
      procurementType: ProcurementType.MANUFACTURING,
    },
  });

  const productChair = await prisma.product.create({
    data: {
      sku: 'FG-CHR-01',
      name: 'Office Chair',
      description: 'Ergonomic office chair with wooden components',
      salesPrice: 160.00,
      costPrice: 80.00,
      categoryId: catFG.id,
      uomId: uomPcs.id,
      procurementStrategy: ProcurementStrategy.MTO,
      procurementType: ProcurementType.MANUFACTURING,
    },
  });

  console.log('Seeding Inventory quantities...');
  const inventories = [
    { productId: productLegs.id, onHand: 200, reserved: 0 },
    { productId: productTop.id, onHand: 50, reserved: 0 },
    { productId: productScrews.id, onHand: 1000, reserved: 0 },
    { productId: productTable.id, onHand: 5, reserved: 0 },
    { productId: productChair.id, onHand: 10, reserved: 0 },
  ];

  for (const inv of inventories) {
    await prisma.inventory.create({
      data: {
        productId: inv.productId,
        warehouseId: warehouse.id,
        onHand: inv.onHand,
        reserved: inv.reserved,
      },
    });

    // Create a StockLedger entry for initial stock seeding
    await prisma.stockLedger.create({
      data: {
        productId: inv.productId,
        warehouseId: warehouse.id,
        quantity: inv.onHand,
        movementType: 'INVENTORY_ADJUSTMENT',
        reference: 'INITIAL_SEEDING',
        userId: admin.id,
      },
    });
  }

  console.log('Seeding Bill of Materials (BoM)...');
  // BoM for Wooden Table
  await prisma.boM.create({
    data: {
      productId: productTable.id,
      name: 'Oak Table BoM',
      version: '1.0.0',
      active: true,
      components: {
        create: [
          { productId: productLegs.id, quantity: 4.0 },
          { productId: productTop.id, quantity: 1.0 },
          { productId: productScrews.id, quantity: 16.0 },
        ],
      },
      operations: {
        create: [
          { name: 'Wood Preparation & Cutting', workCenter: 'ASSEMBLY_LINE', sequence: 1, durationMinutes: 30 },
          { name: 'Assembly', workCenter: 'ASSEMBLY_LINE', sequence: 2, durationMinutes: 45 },
          { name: 'Polishing & Varnishing', workCenter: 'PAINT_FLOOR', sequence: 3, durationMinutes: 60 },
          { name: 'Packaging', workCenter: 'PACKAGING_UNIT', sequence: 4, durationMinutes: 15 },
        ],
      },
    },
  });

  // BoM for Office Chair
  await prisma.boM.create({
    data: {
      productId: productChair.id,
      name: 'Ergonomic Chair BoM',
      version: '1.0.0',
      active: true,
      components: {
        create: [
          { productId: productLegs.id, quantity: 4.0 },
          { productId: productScrews.id, quantity: 12.0 },
        ],
      },
      operations: {
        create: [
          { name: 'Frame Assembly', workCenter: 'ASSEMBLY_LINE', sequence: 1, durationMinutes: 20 },
          { name: 'Cushioning & Backing', workCenter: 'ASSEMBLY_LINE', sequence: 2, durationMinutes: 30 },
          { name: 'Packaging', workCenter: 'PACKAGING_UNIT', sequence: 3, durationMinutes: 10 },
        ],
      },
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
