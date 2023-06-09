import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { sendMetadataReport } from "../../util/discord";

const getSongQuerySchema = Type.Object(
  {
    id: Type.Number(),
    includeShouts: Type.Optional(Type.Boolean({ default: false })),
  },
  { additionalProperties: false }
);

const reportMetadataSchema = Type.Object(
  {
    id: Type.Number(),
    additionalInfo: Type.Optional(Type.String({ maxLength: 150 })),
  },
  { additionalProperties: false }
);

type GetSongQuery = Static<typeof getSongQuerySchema>;
type ReportMetadataBody = Static<typeof reportMetadataSchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetSongQuery }>(
    "/api/songs/getSong",
    { schema: { querystring: getSongQuerySchema } },
    async (request) => {
      const song = await prisma.song.findUniqueOrThrow({
        where: {
          id: request.query.id,
        },
        ...(request.query.includeShouts && { include: { shouts: true } }),
      });

      return song;
    }
  );

  fastify.post<{ Body: ReportMetadataBody }>(
    "/api/songs/reportMetadata",
    { schema: { body: reportMetadataSchema }, onRequest: fastify.authenticate },
    async (request) => {
      fastify.log.info(
        `Received metadata report for song ID ${request.body.id} from ${request.user.username}`
      );

      const song = await prisma.song.findUniqueOrThrow({
        where: {
          id: request.body.id,
        },
      });
      sendMetadataReport(request.user, song, request.body.additionalInfo);
    }
  );
}
