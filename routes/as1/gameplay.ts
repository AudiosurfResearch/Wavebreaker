import { FastifyInstance } from "fastify";
import { Prisma, User, Score, Song } from "@prisma/client";
import { prisma } from "../../util/db";
import xml2js from "xml2js";
import * as SteamUtils from "../../util/steam";

const xmlBuilder = new xml2js.Builder();

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

async function getSongScores(
  song: number,
  league = -1,
  location = 0,
  limit = 0,
  byPlayers: number[] = []
): Promise<ScoreWithPlayer[]> {
  return await prisma.score.findMany({
    where: {
      songId: song,
      ...(league > -1 && { leagueId: league }),
      ...(location > 0 && {
        player: {
          is: {
            locationid: +location,
          },
        },
      }),
      ...(byPlayers.length != 0 && {
        player: {
          id: {
            in: byPlayers,
          },
        },
      }),
    },
    orderBy: {
      score: "desc",
    },
    ...(limit > 0 && { take: 11 }),
    include: {
      player: true,
    },
  });
}

function constructScoreResponseEntry(
  type: number,
  score: ScoreWithPlayer
): object {
  return {
    $: {
      scoretype: type,
    },
    league: {
      $: {
        leagueid: score.leagueId,
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
  };
}

async function getOrCreateSong(title: string, artist: string): Promise<Song> {
  try {
    // eslint-disable-next-line no-var
    var song: Song = await prisma.song.findFirstOrThrow({
      where: {
        title: {
          equals: title,
          mode: "insensitive",
        },
        artist: {
          equals: artist,
          mode: "insensitive",
        },
      },
    });
  } catch (e) {
    song = await prisma.song.create({
      data: {
        title: title,
        artist: artist,
      },
    });
  }
  return song;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{
    Body: FetchSongIdSteamRequest;
  }>("/as_steamlogin/game_fetchsongid_unicode.php", async (request) => {
    fastify.log.info(
      "Requesting song ID for " +
        request.body.artist +
        " - " +
        request.body.song
    );

    //Validation
    if (
      request.body.artist.toLowerCase() == "unknown" ||
      request.body.song.toLowerCase() == "unknown"
    )
      return "failed";

    //TODO: Case insensitivity??? This is an issue depending on DB backend, tbh.
    //SQLite doesn't have viable case insensitive matching options
    const song = await getOrCreateSong(request.body.song, request.body.artist);

    try {
      const pb: Score = await prisma.score.findFirstOrThrow({
        where: {
          songId: song.id,
          userId: request.body.uid,
          leagueId: request.body.league,
        },
      });

      return xmlBuilder.buildObject({
        RESULT: {
          $: {
            status: "allgood",
          },
          songid: pb.songId,
          pb: pb.score,
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
  });

  fastify.post<{
    Body: SendRideSteamRequest;
  }>("/as_steamlogin/game_SendRideSteamVerified.php", async (request) => {
    const user: User = await SteamUtils.findUserByTicket(request.body.ticket);

    //TODO: Implement checks for the song submission hash
    const song = await getOrCreateSong(request.body.song, request.body.artist);

    const prevScore = await prisma.score.findUnique({
      where: {
        userId_leagueId_songId: {
          songId: song.id,
          userId: user.id,
          leagueId: +request.body.league,
        },
      },
    });

    prisma.score.upsert({
      where: {
        userId_leagueId_songId: {
          songId: song.id,
          userId: user.id,
          leagueId: +request.body.league,
        },
      },
      create: {
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
      update: {
        playCount: {
          increment: 1,
        },
        ...(prevScore &&
          prevScore.score < +request.body.score && {
            score: +request.body.score,
            rideTime: new Date(),
          }),
      },
    });

    fastify.log.info(
      "Play submitted by user %d on song %d in league %d, score: %d\nSubmit code: %s",
      user.id,
      +request.body.songid,
      +request.body.league,
      +request.body.score,
      request.body.submitcode
    );

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
    Body: GetRidesSteamRequest;
  }>("/as_steamlogin/game_GetRidesSteamVerified.php", async (request) => {
    try {
      const user = await SteamUtils.findUserWithRivalsByTicket(
        request.body.ticket
      );

      //Global scores
      const fullScoreArray: ScoreWithPlayer[] = [];
      fullScoreArray.push(
        ...(await getSongScores(+request.body.songid, 0, 0, 11))
      );
      fullScoreArray.push(
        ...(await getSongScores(+request.body.songid, 1, 0, 11))
      );
      fullScoreArray.push(
        ...(await getSongScores(+request.body.songid, 2, 0, 11))
      );

      const scoreResponseArray: object[] = [];
      for (const score of fullScoreArray) {
        scoreResponseArray.push(constructScoreResponseEntry(0, score));
      }

      //Nearby scores
      const nearbyScores: ScoreWithPlayer[] = [];
      nearbyScores.push(
        ...(await getSongScores(
          +request.body.songid,
          0,
          request.body.locationid,
          11
        ))
      );
      nearbyScores.push(
        ...(await getSongScores(
          +request.body.songid,
          1,
          request.body.locationid,
          11
        ))
      );
      nearbyScores.push(
        ...(await getSongScores(
          +request.body.songid,
          2,
          request.body.locationid,
          11
        ))
      );

      for (const score of nearbyScores) {
        scoreResponseArray.push(constructScoreResponseEntry(1, score));
      }

      //Rival scores
      //Get the list of IDs of the user's rivals
      const rivalIds = user.rivals.map((rival) => rival.id);
      rivalIds.push(user.id); //So our own score is included, for easier comparison

      const friendScores: ScoreWithPlayer[] = [];
      friendScores.push(
        ...(await getSongScores(
          +request.body.songid,
          1,
          request.body.locationid,
          11,
          rivalIds
        ))
      );
      friendScores.push(
        ...(await getSongScores(
          +request.body.songid,
          2,
          request.body.locationid,
          11,
          rivalIds
        ))
      );
      friendScores.push(
        ...(await getSongScores(
          +request.body.songid,
          3,
          request.body.locationid,
          11,
          rivalIds
        ))
      );

      for (const score of friendScores) {
        scoreResponseArray.push(constructScoreResponseEntry(2, score));
      }

      return xmlBuilder.buildObject({
        RESULTS: {
          scores: scoreResponseArray,
        },
      });
    } catch (e) {
      fastify.log.error(e);
      return e;
    }
  });
}
