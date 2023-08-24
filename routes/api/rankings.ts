import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "../../util/schemaTypes";
import { prisma } from "../../util/db";

const getSongRankingsQuerySchema = Type.Object(
  {
    sort: Type.Optional(
      Type.Union([StringEnum(["asc", "desc"])], {
        default: "desc",
      })
    ),
    page: Type.Number({ default: 1, minimum: 1 }),
    pageSize: Type.Number({ default: 10, minimum: 1, maximum: 100 }),
  },
  { additionalProperties: false }
);

type GetSongRankingsQuery = Static<typeof getSongRankingsQuerySchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetSongRankingsQuery }>(
    "/api/rankings/songs",
    { schema: { querystring: getSongRankingsQuerySchema } },
    async (request) => {
      return prisma.song.findMany({
        take: request.query.pageSize,
        skip: (request.query.page - 1) * request.query.pageSize,
        include: {
          _count: {
            select: { scores: true },
          },
        },
        orderBy: {
          scores: {
            _count: request.query.sort,
          },
        },
      });
    }
  );
}
