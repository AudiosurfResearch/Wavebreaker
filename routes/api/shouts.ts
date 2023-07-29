import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "../../util/schemaTypes";

const getSongShoutsQuerySchema = Type.Object(
  {
    songId: Type.Number(),
    authorId: Type.Optional(Type.Number()),
    timeSort: Type.Optional(
      Type.Union([StringEnum(["asc", "desc"])], {
        default: "desc",
      })
    ),
    includeAuthor: Type.Optional(Type.Boolean({ default: true })),
    page: Type.Number({ default: 1, minimum: 1 }),
    pageSize: Type.Number({ default: 10, minimum: 1, maximum: 100 }),
  },
  { additionalProperties: false }
);

const deleteShoutBodySchema = Type.Object(
  {
    id: Type.Number(),
  },
  { additionalProperties: false }
);

type GetSongShoutsQuery = Static<typeof getSongShoutsQuerySchema>;
type DeleteShoutBody = Static<typeof deleteShoutBodySchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetSongShoutsQuery }>(
    "/api/shouts/getSongShouts",
    { schema: { querystring: getSongShoutsQuerySchema } },
    async (request, reply) => {
      const where = {
        ...(request.query.songId && {
          songId: request.query.songId,
        }),
        ...(request.query.authorId && {
          userId: request.query.authorId,
        }),
      };

      const [count, shouts] = await prisma.$transaction([
        prisma.shout.count({
          where,
        }),
        prisma.shout.findMany({
          skip: (request.query.page - 1) * request.query.pageSize,
          take: request.query.pageSize,
          where,
          orderBy: {
            timeCreated: request.query.timeSort,
          },
          include: {
            author: request.query.includeAuthor,
          },
        }),
      ]);

      if (count === 0) {
        reply.status(204);
        return;
      } else {
        return {
          shouts: shouts,
          totalCount: count,
        };
      }
    }
  );

  fastify.post<{ Body: DeleteShoutBody }>(
    "/api/shouts/deleteShout",
    {
      onRequest: fastify.authenticate,
      schema: { body: deleteShoutBodySchema },
    },
    async (request, reply) => {
      const shout = await prisma.shout.findUnique({
        where: {
          id: request.body.id,
        },
      });

      if (!shout) {
        reply.status(404).send({ error: "Shout not found" });
      } else {
        if (
          shout.authorId === request.user.id ||
          request.user.accountType > 1
        ) {
          await prisma.shout.delete({
            where: {
              id: request.body.id,
            },
          });
          reply.status(204);
        } else {
          reply.status(403).send({ error: "Insufficient permissions" });
        }
      }
    }
  );
}
