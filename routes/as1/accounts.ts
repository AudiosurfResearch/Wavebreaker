import { FastifyInstance } from "fastify";
import { PrismaClient, User } from "@prisma/client";
import xml2js from "xml2js";
import crypto from "crypto";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

interface LoginRequest {
  email: string;
  pass: string;
  loginorig: string;
  snum: number;
  s64: number;
}

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: LoginRequest;
  }>("/as/game_AttemptLogin_unicodepub64.php", async (request, reply) => {
    const statusString = crypto
      .createHash("md5")
      .update("ntlr78ouqkutfc" + request.body.loginorig + "47ourol9oux")
      .digest("hex");

    try {
      var user: User = await prisma.user.findFirstOrThrow({
        where: {
          username: request.body.email,
          gamePassword: request.body.pass,
        },
      });
    } catch (e) {
      console.error(e);
      return "failed";
    }

    return xmlBuilder.buildObject({
      RESULT: {
        $: {
          status: statusString,
        },
        userid: user.id,
        username: user.username,
        locationid: user.locationid, // locationid is the n-th element in the location list you see when registering
        steamid: user.steamid32, //SteamID32, not ID64
      },
    });
  });
}
