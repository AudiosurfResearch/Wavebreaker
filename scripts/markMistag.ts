import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  const song = await prisma.song.update({
    where: {
      id: parseInt(args[0]),
    },
    data: {
      mistagLock: true,
      mbid: null,
      musicbrainzLength: null,
      musicbrainzArtist: null,
      musicbrainzTitle: null,
      coverUrl: null,
      smallCoverUrl: null,
    },
  });

  console.log(`Marked ${song.id} as mistagged`);
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
