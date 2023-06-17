import { PrismaClient, Song } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const songs = await prisma.song.findMany({
    where: {
      smallCoverUrl: null,
      NOT: {
        coverUrl: null,
      },
    },
  });

  console.log(`Found ${songs.length} songs to fix`);

  songs.forEach((song) => {
    prisma.song
      .update({
        where: { id: song.id },
        data: {
          coverUrl: song.coverUrl.replace("_thumb500.jpg", "_thumb.jpg"),
        },
      })
      .then((song) => {
        console.log("Fixed cover URLs on song " + song.id);
      });
  });
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
