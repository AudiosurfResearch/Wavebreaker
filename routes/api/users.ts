import { FastifyInstance } from "fastify";
import { Prisma, Song, User } from "@prisma/client";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";

const getUserQuerySchema = Type.Object(
  {
    id: Type.Number(),
    getExtendedInfo: Type.Optional(Type.Boolean({ default: false })),
  },
  { additionalProperties: false }
);

const searchUserQuerySchema = Type.Object(
  {
    query: Type.String(),
  },
  { additionalProperties: false }
);

const rivalParamsSchema = Type.Object(
  {
    id: Type.Number(),
  },
  { additionalProperties: false }
);

type GetUserQuery = Static<typeof getUserQuerySchema>;
type SearchUserQuery = Static<typeof searchUserQuerySchema>;
type RivalParams = Static<typeof rivalParamsSchema>;

interface ExtendedUser extends User {
  totalScore: number;
  totalPlays: number;
  favoriteCharacter?: number;
  favoriteSong?: Song;
}

async function getExtendedInfo(userBase: User): Promise<User> {
  //Get user's total score and total plays
  const scoreAggregation = await prisma.score.aggregate({
    where: {
      userId: userBase.id,
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
      userId: userBase.id,
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
      userId: userBase.id,
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
          return await getExtendedInfo(userBase);
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

  fastify.get<{ Querystring: SearchUserQuery }>(
    "/api/users/searchUsers",
    { schema: { querystring: searchUserQuerySchema } },
    async (request) => {
      const results = await prisma.$queryRaw<
        User[]
      >`SELECT * FROM "User" ORDER BY similarity(username, ${request.query.query}) DESC LIMIT 10;`;
      return { results };
    }
  );

  fastify.get(
    "/api/users/getOwnRivals",
    { onRequest: fastify.authenticate },
    async (request) => {
      const user = await prisma.user.findUnique({
        where: {
          id: request.user.id,
        },
        include: {
          rivals: true,
          challengers: true,
        },
      });
      return { rivals: user.rivals, challengers: user.challengers };
    }
  );

  fastify.post<{ Body: RivalParams }>(
    "/api/users/addRival",
    {
      schema: { body: rivalParamsSchema },
      onRequest: fastify.authenticate,
    },
    async (request, reply) => {
      await prisma.user.update({
        where: {
          id: request.user.id,
        },
        data: {
          rivals: {
            connect: {
              id: request.body.id,
            },
          },
        },
      });
      reply.status(204).send();
    }
  );

  fastify.post<{ Body: RivalParams }>(
    "/api/users/removeRival",
    {
      schema: { body: rivalParamsSchema },
      onRequest: fastify.authenticate,
    },
    async (request, reply) => {
      await prisma.user.update({
        where: {
          id: request.user.id,
        },
        data: {
          rivals: {
            disconnect: {
              id: request.body.id,
            },
          },
        },
      });
      reply.status(204).send();
    }
  );

  fastify.get<{ Querystring: RivalParams }>(
    "/api/users/isRival",
    {
      schema: { querystring: rivalParamsSchema },
      onRequest: fastify.authenticate,
    },
    async (request, reply) => {
      const user = await prisma.user.findFirst({
        where: {
          id: request.query.id,
          rivals: {
            some: {
              id: request.user.id,
            },
          },
        },
      });
      if (user) return { isRival: true };
      else return { isRival: false };
    }
  );
}
