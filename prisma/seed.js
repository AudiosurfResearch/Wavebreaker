"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const john = await prisma.user.upsert({
        where: { username: "John Audiosurf" },
        update: {},
        create: {
            username: "John Audiosurf",
            steamid64: 696969,
            steamid32: 696969,
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
