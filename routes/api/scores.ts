import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "../../util/schemaTypes";

const getScoresQuerySchema = Type.Object(
  {
    songId: Type.Optional(Type.Number()),
    userId: Type.Optional(Type.Number()),
    leagueId: Type.Optional(Type.Number()),
    vehicleId: Type.Optional(Type.Number()),
    scoreSort: Type.Optional(StringEnum(["asc", "desc"])),
    timeSort: Type.Optional(
      Type.Union([StringEnum(["asc", "desc"])], {
        default: "desc",
      })
    ),
    includePlayer: Type.Optional(Type.Boolean({ default: false })),
    page: Type.Number({ default: 1, minimum: 1 }),
    pageSize: Type.Number({ default: 10, minimum: 1, maximum: 100 }),
  },
  { additionalProperties: false }
);

type GetScoresQuery = Static<typeof getScoresQuerySchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetScoresQuery }>(
    "/api/scores/getScores",
    { schema: { querystring: getScoresQuerySchema } },
    async (request) => {
      fastify.log.info(request.query);

      const scoreCount = await prisma.score.count({
        where: {
          ...(request.query.songId && {
            songId: request.query.songId,
          }),
          ...(request.query.userId && {
            userId: request.query.userId,
          }),
          ...(request.query.leagueId && {
            leagueId: request.query.leagueId,
          }),
          ...(request.query.vehicleId && {
            vehicleId: request.query.vehicleId,
          }),
        },
      });

      //God.
      const scores = await prisma.score.findMany({
        skip: (request.query.page - 1) * request.query.pageSize,
        take: request.query.pageSize,
        where: {
          ...(request.query.songId && {
            songId: request.query.songId,
          }),
          ...(request.query.userId && {
            userId: request.query.userId,
          }),
          ...(request.query.leagueId && {
            leagueId: request.query.leagueId,
          }),
          ...(request.query.vehicleId && {
            vehicleId: request.query.vehicleId,
          }),
        },
        orderBy: {
          ...(request.query.timeSort && {
            rideTime: request.query.timeSort,
          }),
          ...(request.query.scoreSort && {
            score: request.query.scoreSort,
          }),
        },
        include: {
          song: true,
          ...(request.query.includePlayer && {
            player: true,
          }),
        },
      });

      return {
        scores: scores,
        resultCount: scoreCount,
      };
    }
  );
}
