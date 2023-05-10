import { FastifyInstance } from "fastify";
import { Prisma, PrismaClient, User, Score, Song } from "@prisma/client";
import xml2js from "xml2js";
import { SteamUtils } from "../../util/steam";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

interface FetchSongIdSteamRequest {
  artist: string;
  song: string;
  uid: number;
  league: number;
}

interface SendRideSteamRequest {
  steamusername: string;
  snum: number;
  artist: string;
  song: string;
  score: number;
  vehicle: number;
  league: number;
  locationid: number;
  feats: string;
  songlength: number;
  trackshape: string;
  density: number;
  submitcode: string;
  songid: number;
  xstats: string;
  goldthreshold: number;
  iss: number;
  isj: number;
  s64: number;
  ticket: string;
}

interface GetRidesSteamRequest {
  uid: number;
  songid: number;
  league: number;
  locationid: number;
  steamusername: string;
  snum: number;
  s64: number;
  ticket: string;
}

type ScoreWithPlayer = Prisma.ScoreGetPayload<{
  include: { player: true };
}>;

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: FetchSongIdSteamRequest;
  }>("/as_steamlogin/game_fetchsongid_unicode.php", async (request, reply) => {
    //Validation
    if (
      request.body.artist.toLowerCase() == "unknown" &&
      request.body.song.toLowerCase() == "unknown"
    )
      return "failed";

    //TODO: Case insensitivity??? This is an issue depending on DB backend, tbh.
    //SQLite doesn't have viable case insensitive matching options
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

  fastify.post<{
    Body: SendRideSteamRequest;
  }>(
    "/as_steamlogin/game_SendRideSteamVerified.php",
    async (request, reply) => {
      try {
        var user: User = await SteamUtils.findUserByTicket(request.body.ticket);
      } catch (e) {
        console.log(e);
        return xmlBuilder.buildObject({
          RESULT: {
            $: {
              status: "failed",
            },
          },
        });
      }

      /*
      TODO: Implement checks for the song submission hash
    */

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
        let prevScore = await prisma.score.findFirstOrThrow({
          where: {
            userId: user.id,
            songId: song.id,
            leagueId: request.body.league,
          },
        });

        await prisma.score.delete({ where: { id: prevScore.id } });
      } catch (e) {}

      await prisma.score.create({
        data: {
          userId: +user.id,
          leagueId: +request.body.league,
          trackShape: request.body.trackshape,
          xstats: request.body.xstats,
          density: +request.body.density,
          vehicleId: +request.body.vehicle,
          score: +request.body.score,
          feats: request.body.feats,
          songLength: +request.body.songlength,
          goldThreshold: +request.body.goldthreshold,
          iss: +request.body.iss,
          isj: +request.body.isj,
          songId: +request.body.songid,
        },
      });

      return xmlBuilder.buildObject({
        RESULT: {
          $: {
            status: "allgood",
          },
          songid: song.id,
        },
      });
    }
  );

  fastify.post<{
    Body: GetRidesSteamRequest;
  }>(
    "/as_steamlogin/game_GetRidesSteamVerified.php",
    async (request, reply) => {
      const casualScores: ScoreWithPlayer[] = await prisma.score.findMany({
        where: {
          songId: +request.body.songid,
          leagueId: 0,
        },
        orderBy: {
          score: "desc",
        },
        take: 11,
        include: {
          player: true,
        },
      });
      const proScores: ScoreWithPlayer[] = await prisma.score.findMany({
        where: {
          songId: +request.body.songid,
          leagueId: 1,
        },
        orderBy: {
          score: "desc",
        },
        take: 11,
        include: {
          player: true,
        },
      });
      const eliteScores: ScoreWithPlayer[] = await prisma.score.findMany({
        where: {
          songId: +request.body.songid,
          leagueId: 2,
        },
        orderBy: {
          score: "desc",
        },
        take: 11,
        include: {
          player: true,
        },
      });

      let fullScoreArray: Object[] = [];
      for (const score of casualScores) {
        fullScoreArray.push({
          $: {
            scoretype: 0,
          },
          league: {
            $: {
              leagueid: 0,
            },
            ride: {
              username: score.player.username,
              vehicleid: score.vehicleId,
              score: score.score,
              ridetime: Math.floor(score.rideTime.getTime() / 1000),
              feats: score.feats,
              songlength: score.songLength,
              trafficcount: score.id,
            },
          },
        });
      }

      for (const score of proScores) {
        fullScoreArray.push({
          $: {
            scoretype: 0,
          },
          league: {
            $: {
              leagueid: 1,
            },
            ride: {
              username: score.player.username,
              vehicleid: score.vehicleId,
              score: score.score,
              ridetime: Math.floor(score.rideTime.getTime() / 1000),
              feats: score.feats,
              songlength: score.songLength,
              trafficcount: score.id,
            },
          },
        });
      }

      for (const score of eliteScores) {
        fullScoreArray.push({
          $: {
            scoretype: 0,
          },
          league: {
            $: {
              leagueid: 2,
            },
            ride: {
              username: score.player.username,
              vehicleid: score.vehicleId,
              score: score.score,
              ridetime: Math.floor(score.rideTime.getTime() / 1000),
              feats: score.feats,
              songlength: score.songLength,
              trafficcount: score.id,
            },
          },
        });
      }

      return xmlBuilder.buildObject({
        RESULTS: {
          scores: fullScoreArray,
        },
      });
    }
  );
}
