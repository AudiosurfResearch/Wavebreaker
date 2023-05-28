import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { Prisma } from "@prisma/client";

const getSongQuerySchema = Type.Object(
  {
    id: Type.Optional(Type.Number()),
    includeShouts: Type.Optional(Type.Boolean({ default: false })),
  },
  { additionalProperties: false }
);

type GetSongQuery = Static<typeof getSongQuerySchema>;

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: GetSongQuery }>(
    "/api/songs/getSong",
    { schema: { querystring: getSongQuerySchema } },
    async (request, reply) => {
      try {
        const song = await prisma.song.findFirstOrThrow({
          where: {
            id: request.query.id,
          },
          include: {
            ...(request.query.includeShouts && { shouts: true }),
          },
        });

        return song;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          reply.status(404).send({ error: "User not found" });
      }
    }
  );
}
