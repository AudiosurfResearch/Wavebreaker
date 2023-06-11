import { PrismaClient } from "@prisma/client";
import { removeTagsFromTitle, tagsFromTitle } from "../util/gamemodeTags";
const prisma = new PrismaClient();

async function main() {
  const songs = await prisma.song.findMany({
    where: {
      title: {
        contains: "[as-",
      },
    },
  });

  console.log(`Found ${songs.length} songs to fix`);

  songs.forEach((song) => {
    prisma.song
      .update({
        where: { id: song.id },
        data: {
          title: removeTagsFromTitle(song.title),
          tags: tagsFromTitle(song.title),
        },
      })
      .then((song) => {
        console.log("Fixed tags on song " + song.id);
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
