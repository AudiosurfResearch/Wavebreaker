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

async function getSongScores(
  song: number,
  league: number,
  location: number = 0
): Promise<ScoreWithPlayer[]> {
  return await prisma.score.findMany({
    where: {
      songId: song,
      leagueId: league,
      ...(location > 0 && {
        player: {
          is: {
            locationid: +location,
          },
        },
      }),
    },
    orderBy: {
      score: "desc",
    },
    take: 11,
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
    var song: Song = await prisma.song.findFirstOrThrow({
      where: {
        title: title,
        artist: artist,
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
    let song = await getOrCreateSong(request.body.song, request.body.artist);

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

      //TODO: Implement checks for the song submission hash
      let song = await getOrCreateSong(request.body.song, request.body.artist);

      try {
        let prevScore = await prisma.score.findFirstOrThrow({
          where: {
            userId: user.id,
            songId: song.id,
            leagueId: +request.body.league,
          },
        });

        if (prevScore.score >=request.body.score) await prisma.score.delete({ where: { id: prevScore.id } });
      } catch (e) {
        console.log(e);
      }

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
      try {
        let fullScoreArray: ScoreWithPlayer[] = [];
        fullScoreArray.push(...(await getSongScores(+request.body.songid, 0)));
        fullScoreArray.push(...(await getSongScores(+request.body.songid, 1)));
        fullScoreArray.push(...(await getSongScores(+request.body.songid, 2)));

        var scoreResponseArray: Object[] = [];
        for (const score of fullScoreArray) {
          scoreResponseArray.push(constructScoreResponseEntry(0, score));
        }

        let nearbyScores: ScoreWithPlayer[] = [];
        nearbyScores.push(
          ...(await getSongScores(
            +request.body.songid,
            0,
            request.body.locationid
          ))
        );
        nearbyScores.push(
          ...(await getSongScores(
            +request.body.songid,
            1,
            request.body.locationid
          ))
        );
        nearbyScores.push(
          ...(await getSongScores(
            +request.body.songid,
            2,
            request.body.locationid
          ))
        );

        for (const score of nearbyScores) {
          scoreResponseArray.push(constructScoreResponseEntry(1, score));
        }
      } catch (e) {
        console.log(e);
        return e;
      }

      //TODO: Add friend score support

      return xmlBuilder.buildObject({
        RESULTS: {
          scores: scoreResponseArray,
        },
      });
    }
  );
}
