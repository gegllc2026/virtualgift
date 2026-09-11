import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { externalUserId: "admin-gateway" },
    create: {
      externalUserId: "admin-gateway",
      username: "admin",
      displayName: "Gateway Admin",
      role: "SUPER_ADMIN",
    },
    update: { role: "SUPER_ADMIN" },
  });

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id, balance: 0 },
    update: {},
  });

  const creator = await prisma.user.upsert({
    where: { externalUserId: "creator-demo" },
    create: {
      externalUserId: "creator-demo",
      username: "creator",
      displayName: "Demo Creator",
      role: "CREATOR",
      avatar: null,
    },
    update: {},
  });
  await prisma.wallet.upsert({
    where: { userId: creator.id },
    create: { userId: creator.id, balance: 0 },
    update: {},
  });

  const viewer = await prisma.user.upsert({
    where: { externalUserId: "viewer-demo" },
    create: {
      externalUserId: "viewer-demo",
      username: "viewer",
      displayName: "Demo Viewer",
      role: "VIEWER",
    },
    update: {},
  });
  await prisma.wallet.upsert({
    where: { userId: viewer.id },
    create: { userId: viewer.id, balance: 50_000 },
    update: { balance: 50_000 },
  });

  const opponent = await prisma.user.upsert({
    where: { externalUserId: "creator-opponent" },
    create: {
      externalUserId: "creator-opponent",
      username: "opponent",
      displayName: "Demo Opponent",
      role: "CREATOR",
    },
    update: {},
  });
  await prisma.wallet.upsert({
    where: { userId: opponent.id },
    create: { userId: opponent.id, balance: 0 },
    update: {},
  });

  const popular = await prisma.giftCategory.upsert({
    where: { slug: "popular" },
    create: { name: "Popular", slug: "popular", sortOrder: 0 },
    update: {},
  });
  const exclusive = await prisma.giftCategory.upsert({
    where: { slug: "exclusive" },
    create: { name: "Exclusive", slug: "exclusive", sortOrder: 1 },
    update: {},
  });

  const gifts = [
    {
      name: "Rose",
      slug: "rose",
      coinCost: 1,
      categoryId: popular.id,
      iconUrl: "/uploads/gifts/rose.svg",
      animationType: "IMAGE" as const,
      sortOrder: 1,
    },
    {
      name: "Heart",
      slug: "heart",
      coinCost: 10,
      categoryId: popular.id,
      iconUrl: "/uploads/gifts/heart.svg",
      animationType: "IMAGE" as const,
      sortOrder: 2,
    },
    {
      name: "Rocket",
      slug: "rocket",
      coinCost: 666,
      categoryId: popular.id,
      iconUrl: "/uploads/gifts/rocket.svg",
      animationType: "IMAGE" as const,
      sortOrder: 3,
    },
    {
      name: "Sports Car",
      slug: "sports-car",
      coinCost: 9999,
      categoryId: exclusive.id,
      iconUrl: "/uploads/gifts/car.svg",
      animationType: "IMAGE" as const,
      sortOrder: 4,
    },
  ];

  for (const g of gifts) {
    await prisma.gift.upsert({
      where: { slug: g.slug },
      create: g,
      update: {
        name: g.name,
        coinCost: g.coinCost,
        categoryId: g.categoryId,
        iconUrl: g.iconUrl,
        sortOrder: g.sortOrder,
        isActive: true,
      },
    });
  }

  const packages = [
    { name: "100 Coins", coinAmount: 100, price: 99, currency: "USD", sortOrder: 1 },
    { name: "500 Coins", coinAmount: 500, price: 499, currency: "USD", sortOrder: 2 },
    { name: "1,000 Coins", coinAmount: 1000, price: 899, currency: "USD", sortOrder: 3 },
    { name: "5,000 Coins", coinAmount: 5000, price: 3999, currency: "USD", sortOrder: 4 },
    { name: "10,000 Coins", coinAmount: 10000, price: 6999, currency: "USD", sortOrder: 5 },
  ];

  for (const p of packages) {
    const existing = await prisma.coinPackage.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.coinPackage.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.coinPackage.create({ data: p });
    }
  }

  await prisma.livestream.upsert({
    where: {
      provider_externalLivestreamId: {
        provider: "agora",
        externalLivestreamId: "demo-channel-1",
      },
    },
    create: {
      externalLivestreamId: "demo-channel-1",
      provider: "agora",
      hostUserId: creator.id,
      title: "Demo Livestream",
      status: "LIVE",
    },
    update: { status: "LIVE", hostUserId: creator.id },
  });

  await prisma.systemSetting.upsert({
    where: { key: "default_locale" },
    create: { key: "default_locale", value: "en" },
    update: { value: "en" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "battle_defaults" },
    create: {
      key: "battle_defaults",
      value: { durationSeconds: 300, scoreMultiplier: 1, minParticipants: 2, maxParticipants: 2 },
    },
    update: {
      value: { durationSeconds: 300, scoreMultiplier: 1, minParticipants: 2, maxParticipants: 2 },
    },
  });

  console.log("Seed complete:", {
    admin: admin.externalUserId,
    creator: creator.externalUserId,
    viewer: viewer.externalUserId,
    opponent: opponent.externalUserId,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
