import { FastifyInstance } from "fastify";
import { PrismaClient, User } from "@prisma/client";
import SteamAuth from "node-steam-openid";
import WavebreakerConfig from "../../wavebreaker_config.json";

const prisma = new PrismaClient();
const steam = new SteamAuth({
  realm: WavebreakerConfig.steam.realm,
  returnUrl: WavebreakerConfig.steam.returnUrl,
  apiKey: WavebreakerConfig.steam.apiKey,
});

export default async function routes(fastify: FastifyInstance) {
  fastify.get("/api/auth/steam", async (request, reply) => {
    const redirectUrl = await steam.getRedirectUrl();
    return reply.redirect(redirectUrl);
  });

  fastify.get("/api/auth/steam/return", async (request) => {
    try {
      const user = await steam.authenticate(request);
      const token = fastify.jwt.sign({ user })
      return token;
    } catch (error) {
      console.error(error);
      return error;
    }
  });
}
