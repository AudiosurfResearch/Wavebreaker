import { FastifyInstance } from "fastify";
import { Prisma, Score, User } from "@prisma/client";
import xml2js from "xml2js";
import * as SteamUtils from "../../util/steam";
import { prisma } from "../../util/db";

const xmlBuilder = new xml2js.Builder();

interface FetchTrackShapeRequest {
  ridd: number;
  songid: number;
  league: number;
}

interface FetchShoutsRequest {
  songid: number[]; //Oh, Dylan. Why do you pass the song ID twice?
}

interface SendShoutSteamRequest {
  s64: number;
  ticket: string;
  songid: number;
  shout: string;
  snum: number;
  steamusername: string;
}

interface CustomNewsSteamRequest {
  steamusername: string;
  snum: number;
  artist: string;
  song: string;
  vehicle: number;
  userid: number;
  league: number;
  songid: number;
  songlength: number;
  s64: number;
  ticket: string;
}

type ShoutWithAuthor = Prisma.ShoutGetPayload<{
  include: { author: true };
}>;

async function getShoutsAsString(songId: number) {
  let shoutResponse = "";
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
    return "No shouts found. Shout it out loud!";
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

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{
    Body: FetchTrackShapeRequest;
  }>("/as/game_fetchtrackshape2.php", async (request) => {
    /**
     * TODO: Test if this works in a prod environment
     * It doesn't work in a debug environment, because the game requests it over HTTP
     * ...and then the weird ass fastify redirect makes it a GET request and strips all parameters.
     * I should probably somehow get the hook to go and replace HTTP with HTTPS.
     */
    try {
      const score: Score = await prisma.score.findUniqueOrThrow({
        where: {
          id: request.body.ridd,
        },
      });

      return score.trackShape;
    } catch (e) {
      console.log(e);
      return "failed";
    }
  });

  fastify.post<{
    Body: FetchShoutsRequest;
  }>("/as_steamlogin/game_fetchshouts_unicode.php", async (request) => {
    return await getShoutsAsString(+request.body.songid[0]);
  });

  fastify.post<{
    Body: SendShoutSteamRequest;
  }>("/as_steamlogin/game_sendShoutSteamVerified.php", async (request) => {
    try {
      const user: User = await SteamUtils.findUserByTicket(request.body.ticket);

      await prisma.song.update({
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
    } catch (e) {
      console.error(e);
      return e;
    }
  });

  fastify.post<{
    Body: CustomNewsSteamRequest;
  }>("//as_steamlogin/game_CustomNews.php", async () => {
    //TODO: proper implementation
    return xmlBuilder.buildObject({
      RESULTS: {
        TEXT: "Is it me or am I\nsimply dreaming this time?",
      },
    });
  });
}
