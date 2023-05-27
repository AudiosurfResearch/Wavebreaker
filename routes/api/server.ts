import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";

export default async function routes(fastify: FastifyInstance) {
  fastify.get("/api/server/getStats", async () => {
    const userCount = await prisma.user.count();
    const songCount = await prisma.song.count();
    const scoreCount = await prisma.score.count();
    return {
      userCount,
      songCount,
      scoreCount,
    };
  });
}
