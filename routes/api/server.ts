import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import fs from "fs";

type RadioEntry = {
  wavebreakerId: number;
  title: string;
  artist: string;
  externalUrl: string;
  cgrFileUrl: string;
};

export default async function routes(fastify: FastifyInstance) {
  fastify.get("/api/server/getStats", async () => {
    const userCount = await prisma.user.count();
    const songCount = await prisma.song.count();
    const scoreCount = await prisma.score.count();
    return {
      userCount,
      songCount,
      scoreCount,
    };
  });

  fastify.get("/api/server/getRadioSongs", async () => {
    const WavebreakerRadioConfig = JSON.parse(
      fs.readFileSync(
        globalThis.__basedir + "/config/wavebreaker_radio_entries.json",
        "utf-8"
      )
    );
    if (WavebreakerRadioConfig.availableSongs.length == 0) return { songs: [] };

    const radioEntries: RadioEntry[] = WavebreakerRadioConfig.availableSongs;
    const ids = radioEntries.map((entry) => entry.wavebreakerId);

    const songs = await prisma.song.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return {
      songs,
      externalUrls: radioEntries.map((entry) => entry.externalUrl),
    };
  });
}
