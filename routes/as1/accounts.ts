import { FastifyInstance } from "fastify";
import { Prisma, User } from "@prisma/client";
import { prisma, redis } from "../../util/db";
import * as SteamUtils from "../../util/steam";
import xml2js from "xml2js";
import SteamID from "steamid";
import { Static, Type } from "@sinclair/typebox";

const xmlBuilder = new xml2js.Builder();

const steamLoginRequestSchema = Type.Object(
  {
    steamusername: Type.String(),
    snum: Type.Integer(),
    s64: Type.String(),
    ticket: Type.String(),
    wvbrclientversion: Type.String(),
  },
  { additionalProperties: false }
);
type SteamLoginRequest = Static<typeof steamLoginRequestSchema>;

const updateLocationRequestSchema = Type.Object(
  {
    s64: Type.String(),
    ticket: Type.String(),
    locationid: Type.Integer(),
  },
  { additionalProperties: false }
);
type UpdateLocationRequest = Static<typeof updateLocationRequestSchema>;

const steamSyncRequestSchema = Type.Object(
  {
    steamusername: Type.String(),
    snum: Type.Integer(),
    s64: Type.String(),
    ticket: Type.String(),
    snums: Type.String(),
    achstates: Type.String(),
  },
  { additionalProperties: false }
);
type SteamSyncRequest = Static<typeof steamSyncRequestSchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{
    Body: SteamLoginRequest;
  }>(
    "/as_steamlogin/game_AttemptLoginSteamVerified.php",
    { schema: { body: steamLoginRequestSchema } },
    async (request) => {
      const steamTicketResponse = await SteamUtils.verifySteamTicket(
        request.body.ticket
      );
      const steamId = new SteamID(steamTicketResponse.response.params.steamid);
      //const steamUser = await SteamUtils.steamApi.getUserSummary(
      //  steamId.getSteamID64()
      //);

      const profileResponse = await fetch("https://steamcommunity.com/profiles/" + steamId.getSteamID64() + "?xml=1");
      await xmlText = await profileResponse.text();
      var parser = new xml2js.Parser();
      let parsed = await parser.parseStringPromise(xmlText);
      
      const user: User = await prisma.user.upsert({
        where: { steamid64: steamId.getSteamID64() },
        update: {
          username: parsed.profile.steamID[0],
          avatarUrl: parsed.profile.avatarFull[0],
          avatarUrlMedium: parsed.profile.avatarMedium[0],
          avatarUrlSmall: parsed.profile.avatarIcon[0],
        },
        create: {
          username: parsed.profile.steamID[0],
          steamid64: steamId.getSteamID64(),
          steamid32: steamId.accountid,
          locationid: 1,
          avatarUrl: parsed.profile.avatarFull[0],
          avatarUrlMedium: parsed.profile.avatarMedium[0],
          avatarUrlSmall: parsed.profile.avatarIcon[0],
        },
      });

      //If user isn't stored in Redis yet, we add them to the leaderboard with 0 skill points.
      const redisPoints = await redis.zscore("leaderboard", user.id);
      if (!redisPoints) await redis.zadd("leaderboard", 0, user.id);

      fastify.log.info("Game auth request for user %d", user.id);
      return xmlBuilder.buildObject({
        RESULT: {
          $: {
            status: "allgood",
          },
          userid: user.id,
          username: user.username,
          locationid: user.locationid, // locationid is the n-th element in the location list you see when registering
          steamid: user.steamid32, //SteamID32, not ID64
        },
      });
    }
  );

  fastify.post<{
    Body: UpdateLocationRequest;
  }>(
    "/as_steamlogin/game_UpdateLocationid.php",
    { schema: { body: updateLocationRequestSchema } },
    async (request) => {
      const steamTicketResponse = await SteamUtils.verifySteamTicket(
        request.body.ticket
      );

      await prisma.user.update({
        where: {
          steamid64: steamTicketResponse.response.params.steamid,
        },
        data: {
          locationid: +request.body.locationid,
        },
      });

      return xmlBuilder.buildObject({
        RESULT: {
          $: {
            status: "success",
          },
        },
      });
    }
  );

  fastify.post<{
    Body: SteamSyncRequest;
  }>(
    "/as_steamlogin/game_SteamSyncSteamVerified.php",
    { schema: { body: steamSyncRequestSchema } },
    async (request) => {
      const steamTicketResponse = await SteamUtils.verifySteamTicket(
        request.body.ticket
      );

      const steamFriendList: number[] = request.body.snums
        .split("x")
        .map(Number);

      try {
        await prisma.user.update({
          where: {
            steamid64: steamTicketResponse.response.params.steamid,
          },
          data: {
            rivals: {
              connect: steamFriendList.map((steamid32) => ({ steamid32 })),
            },
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          fastify.log.info("Adding friends: " + e.meta?.cause);
        //this is gonna work trust me bro
        else throw e;
      }

      //Nowhere near close to the response the real server gives
      //We do not need to care for this endpoint though, because neither will the client
      return xmlBuilder.buildObject({
        RESULT: {
          $: {
            status: "success",
          },
        },
      });
    }
  );
}
