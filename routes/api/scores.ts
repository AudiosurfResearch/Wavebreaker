import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "../../util/schemaTypes";

const getScoresQuerySchema = Type.Object(
  {
    songId: Type.Optional(Type.Number()),
    userId: Type.Optional(Type.Number()),
    leagueId: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
    vehicleId: Type.Optional(Type.Number()),
    scoreSort: Type.Optional(StringEnum(["asc", "desc"])),
    timeSort: Type.Optional(
      Type.Union([StringEnum(["asc", "desc"])], {
        default: "desc",
      })
    ),
    includePlayer: Type.Optional(Type.Boolean({ default: false })),
    includeSong: Type.Optional(Type.Boolean({ default: true })),
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
    async (request, reply) => {
      fastify.log.info(request.query);

      const where = {
        ...(request.query.songId && {
          songId: request.query.songId,
        }),
        ...(request.query.userId && {
          userId: request.query.userId,
        }),
        ...(request.query.leagueId > -1 && {
          leagueId: request.query.leagueId,
        }),
        ...(request.query.vehicleId && {
          vehicleId: request.query.vehicleId,
        }),
      };

      const [count, scores] = await prisma.$transaction([
        prisma.score.count({
          where,
        }),
        prisma.score.findMany({
          skip: (request.query.page - 1) * request.query.pageSize,
          take: request.query.pageSize,
          where,
          orderBy: {
            //TODO: Figure out how to make these two mutually exclusive in the schema.
            ...(!request.query.scoreSort &&
              request.query.timeSort && {
                rideTime: request.query.timeSort,
              }),
            ...(request.query.scoreSort && {
              score: request.query.scoreSort,
            }),
          },
          include: {
            ...(request.query.includeSong && {
              song: true,
            }),
            ...(request.query.includePlayer && {
              player: true,
            }),
          },
        }),
      ]);

      if (count === 0) {
        reply.status(404).send({ error: "No scores found" });
      } else {
        return {
          scores: scores,
          totalCount: count,
        };
      }
    }
  );
}
