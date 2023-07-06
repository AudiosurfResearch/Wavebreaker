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

type GetSongShoutsQuery = Static<typeof getSongShoutsQuerySchema>;

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
        reply.status(404).send({ error: "No shouts found" });
      } else {
        return {
          shouts: shouts,
          totalCount: count,
        };
      }
    }
  );
}
