import { PrismaClient, User, Prisma } from "@prisma/client";
import WavebreakerConfig from "../config/wavebreaker_config.json";
import SteamAPI from "steamapi";

const prisma = new PrismaClient();

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

type UserWithRivals = Prisma.UserGetPayload<{
  include: { rivals: true, challengers: true };
}>;

export const steamApi = new SteamAPI(WavebreakerConfig.steam.apiKey);

export async function findUserByTicket(ticket: string): Promise<User> {
  const ticketResponse = await verifySteamTicket(ticket);

  const user: User = await prisma.user.findFirstOrThrow({
    where: {
      steamid64: ticketResponse.response.params.steamid,
    }
  });
  return user;
}

export async function findUserWithRivalsByTicket(ticket: string): Promise<UserWithRivals> {
  const ticketResponse = await verifySteamTicket(ticket);

  const user: UserWithRivals = await prisma.user.findFirstOrThrow({
    where: {
      steamid64: ticketResponse.response.params.steamid,
    },
    include: {
      rivals: true,
      challengers: true,
    }
  });
  return user;
}

export async function verifySteamTicket(
  ticket: string
): Promise<SteamTokenValidationResponse> {
  const apiCheckUrl =
    "https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?key=" +
    WavebreakerConfig.steam.apiKey +
    "&appid=12900&ticket=" +
    ticket;
  const response = await fetch(apiCheckUrl);
  const jsonData: SteamTokenValidationResponse = await response.json();
  if (jsonData.response.params.result == "OK") return jsonData;
  else throw new Error("Ticket validation failed");
}
