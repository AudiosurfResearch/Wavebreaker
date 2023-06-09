import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  const user = await prisma.user.update({
    where: {
      id: parseInt(args[0]),
    },
    data: {
      accountType: 3,
    },
  });

  console.log(user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })

  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });
