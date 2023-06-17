import { FastifyInstance } from "fastify";
import { prisma } from "../../util/db";
import { Static, Type } from "@sinclair/typebox";
import { sendMetadataReport } from "../../util/discord";
import { tagByMBID } from "../../util/musicbrainz";
import { Song } from "@prisma/client";

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

const applyMBIDSchema = Type.Object(
  {
    id: Type.Number(),
    mbid: Type.String(),
  },
  { additionalProperties: false }
);

const markMistagSchema = Type.Object(
  {
    id: Type.Number(),
  },
  { additionalProperties: false }
);

const searchSongQuerySchema = Type.Object(
  {
    query: Type.String(),
  },
  { additionalProperties: false }
);

type GetSongQuery = Static<typeof getSongQuerySchema>;
type ReportMetadataBody = Static<typeof reportMetadataSchema>;
type ApplyMBIDBody = Static<typeof applyMBIDSchema>;
type MarkMistagBody = Static<typeof markMistagSchema>;
type SearchSongQuery = Static<typeof searchSongQuerySchema>;

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

  fastify.post<{ Body: ApplyMBIDBody }>(
    "/api/songs/applyMBID",
    { schema: { body: applyMBIDSchema }, onRequest: fastify.authenticate },
    async (request, reply) => {
      if (request.user.accountType != 3) {
        reply.status(403).send({ error: "Insufficient permissions" });
      }

      fastify.log.info(
        `Applying MBID ${request.body.mbid} to song ${request.body.id}, requested by user ${request.user.id}`
      );

      await tagByMBID(request.body.id, request.body.mbid);
      return { success: true };
    }
  );

  fastify.post<{ Body: MarkMistagBody }>(
    "/api/songs/markMistag",
    { schema: { body: markMistagSchema }, onRequest: fastify.authenticate },
    async (request, reply) => {
      if (request.user.accountType != 3) {
        reply.status(403).send({ error: "Insufficient permissions" });
      }

      fastify.log.info(
        `Marking song ${request.body.id} as mistagged, requested by user ${request.user.id}`
      );

      await prisma.song.update({
        where: {
          id: request.body.id,
        },
        data: {
          mistagLock: true,
          mbid: null,
          musicbrainzLength: null,
          musicbrainzArtist: null,
          musicbrainzTitle: null,
          coverUrl: null,
          smallCoverUrl: null,
        },
      });
      return { success: true };
    }
  );

  fastify.get<{ Querystring: SearchSongQuery }>(
    "/api/songs/searchSongs",
    { schema: { querystring: searchSongQuerySchema } },
    async (request) => {
      // Indescribable pain.
      const results = await prisma.$queryRaw<
        Song[]
      >` SELECT * FROM "Song" ORDER BY GREATEST(similarity(concat(artist, title), ${request.query.query}), similarity(concat("musicbrainzArtist", "musicbrainzTitle"), ${request.query.query})) DESC LIMIT 10;`;
      return { results };
    }
  );
}
