import { PrismaClient, Song } from "@prisma/client";
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

  console.log("Fixing unapplied tags");
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

  const songsNull = await prisma.$queryRawUnsafe<Song[]>('SELECT * FROM "Song" WHERE tags IS NULL;');

  console.log("Fixing null tags");
  console.log(`Found ${songsNull.length} songs to fix`);

  songsNull.forEach((song) => {
    prisma.song
      .update({
        where: { id: song.id },
        data: {
          tags: [],
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
