import { FastifyInstance } from "fastify";
import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "../../util/schemaTypes";
import { getLeaderboard, getPopularSongs } from "../../util/rankings";

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

const getUserRankingsQuerySchema = Type.Object(
  {
    page: Type.Number({ default: 1, minimum: 1 }),
    pageSize: Type.Number({ default: 10, minimum: 1, maximum: 100 }),
  },
  { additionalProperties: false }
);

type GetSongRankingsQuery = Static<typeof getSongRankingsQuerySchema>;
type GetUserRankingsQuery = Static<typeof getUserRankingsQuerySchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetSongRankingsQuery }>(
    "/api/rankings/songs",
    { schema: { querystring: getSongRankingsQuerySchema } },
    async (request) => {
      return getPopularSongs(
        request.query.page,
        request.query.pageSize,
        request.query.sort
      );
    }
  );

  fastify.get<{ Querystring: GetUserRankingsQuery }>(
    "/api/rankings/users",
    { schema: { querystring: getUserRankingsQuerySchema } },
    async (request) => {
      return getLeaderboard(request.query.page, request.query.pageSize);
    }
  );
}
