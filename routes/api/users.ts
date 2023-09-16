import { FastifyInstance } from "fastify";
import { Prisma, User } from "@prisma/client";
import { ExtendedUser, getUserExtended, prisma, redis } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { getUserRank } from "../../util/rankings";

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

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetUserQuery }>(
    "/api/users/getUser",
    { schema: { querystring: getUserQuerySchema } },
    async (request, reply) => {
      const id = request.query.id;
      try {
        const user = await prisma.user.findUniqueOrThrow({
          where: {
            id: id,
          },
        });

        if (request.query.getExtendedInfo) {
          return await getUserExtended(user);
        }

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

  fastify.get<{ Querystring: SearchUserQuery }>(
    "/api/users/searchUsers",
    { schema: { querystring: searchUserQuerySchema } },
    async (request) => {
      return {
        results: await prisma.$queryRaw<
          User[]
        >`SELECT * FROM "User" ORDER BY similarity(username, ${request.query.query}) DESC LIMIT 10;`,
      };
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
      if (request.user.id == request.body.id) {
        reply.status(400).send({ error: "You can't add yourself as a rival!" });
      } else {
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
    }
  );

  fastify.post<{ Body: RivalParams }>(
    "/api/users/removeRival",
    {
      schema: { body: rivalParamsSchema },
      onRequest: fastify.authenticate,
    },
    async (request, reply) => {
      if (request.user.id == request.body.id) {
        reply.status(400).send({ error: "You can't add yourself as a rival!" });
      } else {
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
    }
  );

  fastify.get<{ Querystring: RivalParams }>(
    "/api/users/isRival",
    {
      schema: { querystring: rivalParamsSchema },
      onRequest: fastify.authenticate,
    },
    async (request) => {
      const user = await prisma.user.findFirst({
        where: {
          id: request.user.id,
          rivals: {
            some: {
              id: request.query.id,
            },
          },
        },
      });
      if (user) return { isRival: true };
      else return { isRival: false };
    }
  );
}
