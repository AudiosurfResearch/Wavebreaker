import { PrismaClient } from "@prisma/client";
import { tagByMBID } from "../util/musicbrainz";
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  const id = parseInt(args[0]);
  const mbid = args[1];

  console.log(`Retagging ${id} with MBID ${mbid}`);
  tagByMBID(id, mbid);
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
