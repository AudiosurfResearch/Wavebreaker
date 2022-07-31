import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient, Score, Shout } from "@prisma/client";
import xml2js from "xml2js";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

interface FetchTrackShapeRequest {
  ridd: number;
  songid: number;
  league: number;
}

interface FetchShoutsRequest {
  songid: number;
}

type ShoutWithAuthor = Prisma.ShoutGetPayload<{
  include: { author: true };
}>;

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: FetchTrackShapeRequest;
  }>("/as/game_fetchtrackshape2.php", async (request, reply) => {
    return await prisma.score.findUnique({
      where: {
        id: request.body.ridd,
      },
    });
  });

  fastify.post<{
    Body: FetchShoutsRequest;
  }>("/as/game_fetchshouts_unicode.php", async (request, reply) => {
    let shoutResponse: string = "No shouts found.";
    const shouts: ShoutWithAuthor[] = await prisma.shout.findMany({
      where: {
        songId: +request.body.songid,
      },
      include: {
        author: true,
      },
    });

    shouts.forEach((shout) => {
      shoutResponse +=
        shout.author.username +
        " (at " +
        shout.timeCreated.toUTCString() +
        "):\n";
      shoutResponse += shout.content + "\n\n";
    });

    return shoutResponse;
  });
}
