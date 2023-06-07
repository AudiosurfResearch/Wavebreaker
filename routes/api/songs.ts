import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";

const getSongQuerySchema = Type.Object(
  {
    id: Type.Number(),
    includeShouts: Type.Optional(Type.Boolean({ default: false })),
  },
  { additionalProperties: false }
);

type GetSongQuery = Static<typeof getSongQuerySchema>;

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
}
