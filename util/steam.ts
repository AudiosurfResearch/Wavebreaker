import { Prisma, PrismaClient, User, Score, Song } from "@prisma/client";
import WavebreakerConfig from "../wavebreaker_config.json";
import SteamAPI from "steamapi";

const prisma = new PrismaClient();

export module SteamUtils {
  interface SteamTokenValidationResponse {
    response: {
      params: {
        result: string;
        steamid: string;
        ownersteamid: string;
        vacbanned: boolean;
        publisherbanned: boolean;
      };
    };
  }

  export const steamApi = new SteamAPI(WavebreakerConfig.steamApiKey);

  export async function findUserByTicket(ticket: string): Promise<User> {
    const ticketResponse = await verifySteamTicket(ticket);

    var user: User = await prisma.user.findFirstOrThrow({
      where: {
        steamid64: BigInt(await ticketResponse.response.params.steamid),
      },
    });
    return user;
  }

  export async function verifySteamTicket(
    ticket: string
  ): Promise<SteamTokenValidationResponse> {
    let apiCheckUrl =
      "https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?key=" +
      WavebreakerConfig.steamApiKey +
      "&appid=12900&ticket=" +
      ticket;
    const response = await fetch(apiCheckUrl);
    const jsonData: SteamTokenValidationResponse = await response.json();
    if (jsonData.response.params.result == "OK") return jsonData;
    else throw new Error("Ticket validation failed");
  }
}
