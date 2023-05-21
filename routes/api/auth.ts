import { FastifyInstance } from "fastify";
import { User } from "@prisma/client";
import { prisma } from "../../util/db";
import SteamAuth from "node-steam-openid";
import WavebreakerConfig from "../../config/wavebreaker_config.json";

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

  fastify.get(
    "/api/auth/verifyToken",
    { onRequest: fastify.authenticate },
    async (request) => {
      const user: User = await prisma.user.findUniqueOrThrow({
        where: {
          id: request.user.id,
        },
      });
      return user;
    }
  );

  fastify.get("/api/auth/steam/return", async (request) => {
    const steamUser = await steam.authenticate(request);
    const user: User = await prisma.user.findUniqueOrThrow({
      where: {
        steamid64: steamUser.steamid,
      },
    });

    const token = fastify.jwt.sign(user);
    return { token: token };
  });
}
