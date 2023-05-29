import { FastifyInstance } from "fastify";
import { Prisma, User } from "@prisma/client";
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
    fastify.log.info("Redirecting to Steam login");
    const redirectUrl = await steam.getRedirectUrl();
    return reply.redirect(redirectUrl);
  });

  fastify.get(
    "/api/auth/verifyToken",
    { onRequest: fastify.authenticate },
    async (request, reply) => {
      try {
        const user: User = await prisma.user.findUniqueOrThrow({
          where: {
            id: request.user.id,
          },
        });
        return user;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          reply.status(404).send({ error: "User not found" });
      }
    }
  );

  fastify.get("/api/auth/steam/return", async (request) => {
    const steamUser = await steam.authenticate(request);
    const user: User = await prisma.user.findUniqueOrThrow({
      where: {
        steamid64: steamUser.steamid,
      },
    });
    
    fastify.log.info("Steam login request for user %d", user.id);
    const token = fastify.jwt.sign(user);
    return { token: token };
  });
}
