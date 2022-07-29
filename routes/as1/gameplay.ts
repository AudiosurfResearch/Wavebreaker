import { FastifyInstance } from "fastify";
import { PrismaClient, User, Score, Song } from "@prisma/client";
import xml2js from "xml2js";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

interface NowPlayingRequest {
  email: string;
  pass: string;
  artist: string;
  song: number;
  vehicle: number;
  songlength: number;
  trackshape: string;
  songid: number;
  uid: number;
}

interface FetchPBRequest {
  artist: string;
  song: string;
  uid: number;
  league: number;
}

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: NowPlayingRequest;
  }>("/as/game_nowplaying_unicode_testing.php", async (request, reply) => {
    /* 
      TODO: implement setting what players are currently playing this track
      and maybe find out what the rest of the info in the request is used for
    */
    return "done";
  });

  fastify.post<{
    Body: FetchPBRequest;
  }>("/as/game_fetchsongid_unicodePB.php", async (request, reply) => {
    try {
      var song: Song = await prisma.song.findFirstOrThrow({
        where: {
          title: request.body.song,
          artist: request.body.artist,
        },
      });
    } catch (e) {
      song = await prisma.song.create({
        data: {
          title: request.body.song,
          artist: request.body.artist,
        },
      });
    }

    try {
      var pb: Score = await prisma.score.findFirstOrThrow({
        where: {
          songId: song.id,
          userId: request.body.uid,
          leagueId: request.body.league,
        },
      });
    } catch (e) {
      return xmlBuilder.buildObject({
        RESULT: {
          $: {
            status: "allgood",
          },
          songid: song.id,
          pb: 0,
        },
      });
    }

    return xmlBuilder.buildObject({
      RESULT: {
        $: {
          status: "allgood",
        },
        songid: pb.songId,
        pb: pb.score,
      },
    });
  });
}
