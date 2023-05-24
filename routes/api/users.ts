import { FastifyInstance } from "fastify";
import { Prisma, Song, User } from "@prisma/client";
import { prisma } from "../../util/db";

interface GetUserParams {
  id: number;
  getExtendedInfo?: boolean;
}

interface ExtendedUser extends User {
  totalScore: number;
  totalPlays: number;
  favoriteSong?: Song;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{ Body: GetUserParams }>(
    "/api/users/getUser",
    async (request, reply) => {
      const id = request.body.id;
      try {
        const userBase: User = await prisma.user.findUniqueOrThrow({
          where: {
            id: id,
          },
        });

        if (request.body.getExtendedInfo) {
          const scoreAggregation = await prisma.score.aggregate({
            where: {
              userId: id,
            },
            _sum: {
              score: true,
              playCount: true,
            },
          });

          const user: ExtendedUser = userBase as ExtendedUser;
          user.totalScore = scoreAggregation._sum.score ?? 0;
          user.totalPlays = scoreAggregation._sum.playCount ?? 0;

          const favSongScore = await prisma.score.findFirst({
            where: {
              userId: id,
            },
            orderBy: {
              playCount: "desc",
            },
            include: {
              song: true,
            },
          });
          user.favoriteSong = favSongScore?.song;

          return user;
        }

        return userBase;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          reply.status(404).send({ error: "User not found" });
      }
    }
  );
}
