import { FastifyInstance } from "fastify";
import { Prisma, User } from "@prisma/client";
import { prisma } from "../../util/db";
import * as SteamUtils from "../../util/steam";
import xml2js from "xml2js";
import SteamID from "steamid";

const xmlBuilder = new xml2js.Builder();

interface SteamLoginRequest {
  steamusername: string;
  snum: number;
  s64: number;
  ticket: string;
}

interface UpdateLocationRequest {
  s64: number;
  ticket: string;
  locationid: number;
}

interface SteamSyncRequest {
  steamusername: string;
  snum: number;
  s64: number;
  ticket: string;
  snums: string;
  achstates: string;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{
    Body: SteamLoginRequest;
  }>("/as_steamlogin/game_AttemptLoginSteamVerified.php", async (request) => {
    try {
      const steamTicketResponse = await SteamUtils.verifySteamTicket(
        request.body.ticket
      );
      const steamId = new SteamID(steamTicketResponse.response.params.steamid);
      const steamUser = await SteamUtils.steamApi.getUserSummary(
        steamId.getSteamID64()
      );

      const user: User = await prisma.user.upsert({
        where: { steamid64: steamId.getSteamID64() },
        update: {
          username: steamUser.nickname,
          avatarUrl: steamUser.avatar.large,
          avatarUrlMedium: steamUser.avatar.medium,
          avatarUrlSmall: steamUser.avatar.small,
        },
        create: {
          username: steamUser.nickname,
          steamid64: steamId.getSteamID64(),
          steamid32: steamId.accountid,
          locationid: 1,
          avatarUrl: steamUser.avatar.large,
          avatarUrlMedium: steamUser.avatar.medium,
          avatarUrlSmall: steamUser.avatar.small,
        },
      });

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
    } catch (e) {
      fastify.log.error(e);
      return e;
    }
  });

  fastify.post<{
    Body: UpdateLocationRequest;
  }>("/as_steamlogin/game_UpdateLocationid.php", async (request) => {
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
  });

  fastify.post<{
    Body: SteamSyncRequest;
  }>("/as_steamlogin/game_SteamSyncSteamVerified.php", async (request) => {
    const steamTicketResponse = await SteamUtils.verifySteamTicket(
      request.body.ticket
    );

    const steamFriendList: number[] = request.body.snums.split("x").map(Number);

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
        fastify.log.info(
          "Adding friends: " + e.meta?.cause
        ); //this is gonna work trust me bro
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
  });
}
