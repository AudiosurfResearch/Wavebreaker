import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient, Score, Shout, User } from "@prisma/client";
import xml2js from "xml2js";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

interface FetchTrackShapeRequest {
  ridd: number;
  songid: number;
  league: number;
}

interface FetchShoutsRequest {
  songid: number[]; //Oh, Dylan. Why do you pass the song ID twice?
}

interface SendShoutRequest {
  email: string;
  pass: string;
  songid: number;
  shout: string;
}

type ShoutWithAuthor = Prisma.ShoutGetPayload<{
  include: { author: true };
}>;

async function getShoutsAsString(songId: number) {
  let shoutResponse: string = "";
  const shouts: ShoutWithAuthor[] = await prisma.shout.findMany({
    where: {
      songId: songId,
    },
    include: {
      author: true,
    },
    orderBy: {
      timeCreated: "desc",
    },
  });

  if (shouts.length == 0) {
    return "No shouts found.";
  }

  shouts.forEach((shout) => {
    shoutResponse +=
      shout.author.username +
      " (at " +
      shout.timeCreated.toUTCString() +
      "):\n";
    shoutResponse += shout.content + "\n\n";
  });
  return shoutResponse;
}

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: FetchTrackShapeRequest;
  }>("/as/game_fetchtrackshape2.php", async (request, reply) => {
    try {
      var score: Score = await prisma.score.findUniqueOrThrow({
        where: {
          id: request.body.ridd,
        },
      });
    } catch (e) {
      return "failed";
    }
    return score.trackShape;
  });

  fastify.post<{
    Body: FetchShoutsRequest;
  }>("/as/game_fetchshouts_unicode.php", async (request, reply) => {
    return await getShoutsAsString(+request.body.songid[0]);
  });

  fastify.post<{
    Body: SendShoutRequest;
  }>("/as/game_sendshout_unicode.php", async (request, reply) => {
    try {
      var user: User = await prisma.user.findFirstOrThrow({
        where: {
          username: request.body.email,
          gamePassword: request.body.pass,
        },
      });
    } catch (e) {
      console.error(e);
      return "Auth failed";
    }

    const updateSong = await prisma.song.update({
      where: {
        id: +request.body.songid,
      },
      data: {
        shouts: {
          create: {
            authorId: user.id,
            content: request.body.shout,
          },
        },
      },
    });

    return await getShoutsAsString(+request.body.songid);
  });
}
