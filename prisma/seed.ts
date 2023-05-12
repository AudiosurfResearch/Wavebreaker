import { PrismaClient, Prisma, User } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const john: User = await prisma.user.upsert({
    where: { username: "John Audiosurf" },
    update: {},
    create: {
      username: "John Audiosurf",
      steamid64: 76561198315672331,
      steamid32: 355406603,
      locationid: 123,
    },
  });
  console.log(john);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });