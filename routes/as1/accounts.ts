import { FastifyInstance } from "fastify";
import { PrismaClient, User } from "@prisma/client";
import { SteamUtils } from "../../util/steam";
import xml2js from "xml2js";
import SteamID from "steamid";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

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

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: SteamLoginRequest;
  }>(
    "/as_steamlogin/game_AttemptLoginSteamVerified.php",
    async (request, reply) => {
      try {
        const steamTicketResponse = await SteamUtils.verifySteamTicket(
          request.body.ticket
        );
        const steamId = new SteamID(
          steamTicketResponse.response.params.steamid
        );
        const steamUser = await SteamUtils.steamApi.getUserSummary(
          steamId.getSteamID64()
        );

        var user: User = await prisma.user.upsert({
          where: { steamid64: steamId.getBigIntID() },
          update: { username: steamUser.nickname },
          create: {
            username: steamUser.nickname,
            steamid64: steamId.getBigIntID(),
            steamid32: steamId.accountid,
            locationid: 1,
          },
        });
      } catch (e) {
        console.error(e);
        return e;
      }

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
  }>("/as_steamlogin/game_UpdateLocationid.php", async (request, reply) => {
    try {
      const steamTicketResponse = await SteamUtils.verifySteamTicket(
        request.body.ticket
      );

      var user: User = await prisma.user.update({
        where: {
          steamid64: BigInt(steamTicketResponse.response.params.steamid),
        },
        data: {
          locationid: +request.body.locationid,
        },
      });
    } catch (e) {
      console.error(e);
      return e;
    }

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
  }>(
    "/as_steamlogin/game_SteamSyncSteamVerified.php",
    async (request, reply) => {
      try {
        const steamTicketResponse = await SteamUtils.verifySteamTicket(
          request.body.ticket
        );

        var steamFriendList: number[] = request.body.snums
          .split("x")
          .map(Number);

        try {
          await prisma.user.update({
            where: {
              steamid64: BigInt(steamTicketResponse.response.params.steamid),
            },
            data: {
              rivals: {
                connect: steamFriendList.map((steamid32) => ({ steamid32 })),
              },
            },
          });
        } catch (e) {
          console.error(e);
        }
      } catch (e) {
        console.error(e);
        return e;
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
