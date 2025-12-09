import { PrismaClient, ProductStatus, InventoryStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 产品分类：重载无人机
  const heavyLoadCategory = await prisma.productCategory.upsert({
    where: { slug: 'heavy-load-drone' },
    update: {},
    create: {
      name: '重载无人机',
      slug: 'heavy-load-drone',
      description: '面向高载重场景的工业级无人机品类',
      is_active: true,
      is_visible: true,
    },
  });

  // 将重载无人机系列产品加入商城
  const heavyLoadProducts = [
    {
      name: '开元空御 LE-45 重载无人机',
      slug: 'kaiyuan-le-45',
      model: 'LE-45',
      sku: 'KY-LE45-001',
      price: new Prisma.Decimal(50000),
      short_desc: '八旋翼 · 16 桨 · 最大载重 350kg · 开元空御重载旗舰',
      description:
        '开元空御 LE-45 面向超高载重与应急救援场景，八旋翼16桨直驱设计，最大载重350kg，支持快速部署、模块化维护与多接口扩展。',
      is_featured: true,
      images: ['/products/heavy-load/LE-45.jpg'],
      inventory: 8,
    },
    {
      name: '开元空御 LE-28 重载无人机',
      slug: 'kaiyuan-le-28',
      model: 'LE-28',
      sku: 'KY-LE28-001',
      price: new Prisma.Decimal(40000),
      short_desc: '六旋翼 · 最大载重 300kg · 载重与续航平衡之选',
      description:
        '开元空御 LE-28 兼顾载重与续航，六旋翼重载平台，适用于物流运输与工程作业，支持碳纤折叠桨与模块化维护。',
      is_featured: false,
      images: ['/products/heavy-load/LE-28.jpg'],
      inventory: 10,
    },
    {
      name: '开元空御 LE-18 重载无人机',
      slug: 'kaiyuan-le-18',
      model: 'LE-18',
      sku: 'KY-LE18-001',
      price: new Prisma.Decimal(30000),
      short_desc: '四旋翼 · 8 桨 · 最大载重 200kg · 灵活高效中载平台',
      description:
        '开元空御 LE-18 面向灵活中载需求，四旋翼八桨设计，折叠便携，适合中距离运输、巡检与特种作业场景。',
      is_featured: false,
      images: ['/products/heavy-load/LE-18.jpg'],
      inventory: 12,
    },
  ];

  for (const product of heavyLoadProducts) {
    const createdProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        model: product.model,
        sku: product.sku,
        brand: '开元空御',
        price: product.price,
        short_desc: product.short_desc,
        description: product.description,
        category_id: heavyLoadCategory.id,
        images: product.images,
        videos: [],
        documents: [],
        status: ProductStatus.PUBLISHED,
        is_active: true,
        is_featured: product.is_featured,
      },
      select: { id: true },
    });

    await prisma.productInventory.upsert({
      where: { product_id: createdProduct.id },
      update: {
        quantity: product.inventory,
        available: product.inventory,
        status: InventoryStatus.IN_STOCK,
      },
      create: {
        product_id: createdProduct.id,
        quantity: product.inventory,
        available: product.inventory,
        status: InventoryStatus.IN_STOCK,
      },
    });
  }

  console.log('种子数据创建完成! (仅包含重载无人机产品与分类)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
