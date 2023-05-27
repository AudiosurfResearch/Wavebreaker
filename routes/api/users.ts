import { FastifyInstance } from "fastify";
import { Prisma, Song, User } from "@prisma/client";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";

const getUserQuerySchema = Type.Object({
  id: Type.Number(),
  getExtendedInfo: Type.Optional(Type.Boolean({ default: false })),
});

type GetUserQuery = Static<typeof getUserQuerySchema>;

interface ExtendedUser extends User {
  totalScore: number;
  totalPlays: number;
  favoriteCharacter?: number;
  favoriteSong?: Song;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetUserQuery }>(
    "/api/users/getUser",
    { schema: { querystring: getUserQuerySchema } },
    async (request, reply) => {
      const id = request.query.id;
      try {
        const userBase: User = await prisma.user.findUniqueOrThrow({
          where: {
            id: id,
          },
        });

        if (request.query.getExtendedInfo) {
          //Get user's total score and total plays
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

          //Get user's favorite song (or, rather, song of the score with the most plays)
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

          //Get user's most used character
          const charGroup = await prisma.score.groupBy({
            by: ["vehicleId"],
            where: {
              userId: id,
            },
            _sum: {
              playCount: true,
            },
            orderBy: {
              _sum: {
                playCount: "desc",
              },
            },
          });

          if (charGroup[0]) user.favoriteCharacter = charGroup[0].vehicleId;

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
