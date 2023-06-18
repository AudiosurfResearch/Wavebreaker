import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Song } from "@prisma/client";
import fs from "fs";
import { RadioEntry } from "../../@types/global";

type SongWithExternalUrl = Song & {
  externalUrl: string;
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

  fastify.get(
    "/api/server/getRadioSongs",
    { onRequest: fastify.authenticate },
    async () => {
      const WavebreakerRadioConfig = JSON.parse(
        fs.readFileSync(
          globalThis.__basedir + "/config/wavebreaker_radio_entries.json",
          "utf-8"
        )
      );
      if (WavebreakerRadioConfig.availableSongs.length == 0)
        return { songs: [] };

      const radioEntries: RadioEntry[] = WavebreakerRadioConfig.availableSongs;
      const ids = radioEntries.map((entry) => entry.wavebreakerId);

      const songs = await prisma.song.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      const songsWithUrls = songs as SongWithExternalUrl[];

      //Add externalUrl to song
      songsWithUrls.forEach((song) => {
        const entry = radioEntries.find(
          (entry) => entry.wavebreakerId == song.id
        );
        if (entry) song.externalUrl = entry.externalUrl;
      });

      return {
        songs: songsWithUrls,
      };
    }
  );
}
