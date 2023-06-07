import { PrismaClient } from "@prisma/client";
import { addMusicBrainzInfo } from "../util/musicbrainz";
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  const song = await prisma.song.findUniqueOrThrow({
    where: {
      id: parseInt(args[0]),
    },
  });

  console.log("Redoing MusicBrainz lookup for song " + song.id);
  await addMusicBrainzInfo(song, song.musicbrainzLength)
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
