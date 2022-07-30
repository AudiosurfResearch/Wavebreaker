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

interface SendRideRequest {
  email: string;
  pass: string;
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
}

interface FetchScoresRequest {
  uid: number;
  songid: number;
  league: number;
  locationid: number;
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

  fastify.post<{
    Body: SendRideRequest;
  }>("/as/game_sendride25.php", async (request, reply) => {
    try {
      var user: User = await prisma.user.findFirstOrThrow({
        where: {
          username: request.body.email,
          gamePassword: request.body.pass,
        },
      });
    } catch (e) {
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
  });

  fastify.post<{
    Body: FetchScoresRequest;
  }>("/as/game_fetchscores6_unicode.php", async (request, reply) => {
    const casualScores = await prisma.score.findMany({
      where: {
        songId: +request.body.songid,
        leagueId: 0,
      },
      orderBy: {
        score: "desc",
      },
      take: 11,
    });
    const proScores = await prisma.score.findMany({
      where: {
        songId: +request.body.songid,
        leagueId: 1,
      },
      orderBy: {
        score: "desc",
      },
      take: 11,
    });
    const eliteScores = await prisma.score.findMany({
      where: {
        songId: +request.body.songid,
        leagueId: 2,
      },
      orderBy: {
        score: "desc",
      },
      take: 11,
    });

    let fullScoreArray: Object[] = [];
    for (const score of casualScores) {
      try {
        var user = await prisma.user.findUniqueOrThrow({
          where: {
            id: score.userId,
          },
        });
      } catch (e) {
        return "failed";
      }

      fullScoreArray.push({
        $: {
          scoretype: 0,
        },
        league: {
          $: {
            leagueid: 0,
          },
          ride: {
            username: user.username,
            vehicleid: score.vehicleId,
            score: score.score,
            ridetime: score.rideTime,
            feats: score.feats,
            songlength: score.songLength,
            trafficcount: score.id,
          },
        },
      });
    }

    for (const score of proScores) {
      try {
        var user = await prisma.user.findUniqueOrThrow({
          where: {
            id: score.userId,
          },
        });
      } catch (e) {
        return "failed";
      }

      fullScoreArray.push({
        $: {
          scoretype: 0,
        },
        league: {
          $: {
            leagueid: 1,
          },
          ride: {
            username: user.username,
            vehicleid: score.vehicleId,
            score: score.score,
            ridetime: score.rideTime,
            feats: score.feats,
            songlength: score.songLength,
            trafficcount: score.id,
          },
        },
      });
    }

    for (const score of eliteScores) {
      try {
        var user = await prisma.user.findUniqueOrThrow({
          where: {
            id: score.userId,
          },
        });
      } catch (e) {
        return "failed";
      }

      fullScoreArray.push({
        $: {
          scoretype: 0,
        },
        league: {
          $: {
            leagueid: 2,
          },
          ride: {
            username: user.username,
            vehicleid: score.vehicleId,
            score: score.score,
            ridetime: score.rideTime,
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
  });
}
