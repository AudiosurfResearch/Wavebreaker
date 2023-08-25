import { FastifyInstance } from "fastify";
import { Prisma, Score, User } from "@prisma/client";
import xml2js from "xml2js";
import * as SteamUtils from "../../util/steam";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { getPopularSongs } from "../../util/rankings";

const xmlBuilder = new xml2js.Builder();

const fetchTrackShapeRequestSchema = Type.Object(
  {
    ridd: Type.Integer(),
    songid: Type.Integer(),
    league: Type.Integer({ minimum: 0, maximum: 3 }),
  },
  { additionalProperties: false }
);
type FetchTrackShapeRequest = Static<typeof fetchTrackShapeRequestSchema>;

const fetchShoutsRequestSchema = Type.Object(
  {
    songid: Type.Array(Type.Integer()), //Oh, Dylan. Why do you pass the song ID twice?
  },
  { additionalProperties: false }
);
type FetchShoutsRequest = Static<typeof fetchShoutsRequestSchema>;

const sendShoutSteamRequestSchema = Type.Object(
  {
    s64: Type.String(),
    ticket: Type.String(),
    songid: Type.Integer(),
    shout: Type.String(),
    snum: Type.Integer(),
    steamusername: Type.String(),
  },
  { additionalProperties: false }
);
type SendShoutSteamRequest = Static<typeof sendShoutSteamRequestSchema>;

const customNewsSteamRequestSchema = Type.Object({
  steamusername: Type.String(),
  snum: Type.Integer(),
  artist: Type.String(),
  song: Type.String(),
  vehicle: Type.Integer({ minimum: 0, maximum: 17 }),
  userid: Type.Integer(),
  league: Type.Integer({ minimum: 0, maximum: 3 }),
  songid: Type.Integer(),
  songlength: Type.Integer(),
  s64: Type.String(),
  ticket: Type.String(),
});
type CustomNewsSteamRequest = Static<typeof customNewsSteamRequestSchema>;

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
  }>(
    "/as/game_fetchtrackshape2.php",
    { schema: { body: fetchTrackShapeRequestSchema } },
    async (request) => {
      /**
       * It doesn't work in a debug environment, because the game requests it over HTTP
       * ...and then the weird ass fastify redirect makes it a GET request and strips all parameters.
       * TODO: I should probably somehow get the hook to go and replace HTTP with HTTPS.
       */
      try {
        const score: Score = await prisma.score.findUniqueOrThrow({
          where: {
            id: +request.body.ridd,
          },
        });

        return score.trackShape;
      } catch (e) {
        console.log(e);
        return "failed";
      }
    }
  );

  fastify.post<{
    Body: FetchShoutsRequest;
  }>(
    "/as_steamlogin/game_fetchshouts_unicode.php",
    { schema: { body: fetchShoutsRequestSchema } },
    async (request) => {
      return await getShoutsAsString(+request.body.songid[0]);
    }
  );

  fastify.post<{
    Body: SendShoutSteamRequest;
  }>(
    "/as_steamlogin/game_sendShoutSteamVerified.php",
    { schema: { body: sendShoutSteamRequestSchema } },
    async (request) => {
      try {
        const user: User = await SteamUtils.findUserByTicket(
          request.body.ticket
        );

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
    }
  );

  fastify.post<{
    Body: CustomNewsSteamRequest;
  }>(
    "//as_steamlogin/game_CustomNews.php",
    { schema: { body: customNewsSteamRequestSchema } },
    async () => {
      //Placeholder, need to add more news elements to randomly pick
      const newsElementDecision = Math.floor(Math.random() * 0);
      let newsElement = "Enjoy the ride!";
      switch (newsElementDecision) {
        case 0: {
          newsElement = "Looking for new songs?\nThese are popular:\n";
          const songs = await getPopularSongs(1, 5);
          songs.forEach((song, index) => {
            newsElement += song.title + " by " + song.artist;
            if (index != songs.length - 1) {
              newsElement += "\n";
            }
          });
          break;
        }
      }

      return xmlBuilder.buildObject({
        RESULTS: {
          TEXT: "Welcome to Wavebreaker!\n" + newsElement,
        },
      });
    }
  );
}
