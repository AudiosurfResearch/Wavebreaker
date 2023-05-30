import { FastifyInstance } from "fastify";
import { Prisma, User, Score, Song } from "@prisma/client";
import { prisma } from "../../util/db";
import xml2js from "xml2js";
import * as SteamUtils from "../../util/steam";
import crypto from "crypto";
import { mbJoinArtists, mbSongSearch } from "../../util/musicbrainz";

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
  //Validation
  if (artist.toLowerCase() == "unknown" || title.toLowerCase() == "unknown")
    throw new Error("Invalid song title or artist.");

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

async function addMusicBrainzInfo(song: Song, length: number) {
  const mbResults = await mbSongSearch(song.artist, song.title, length);
  if (mbResults) {
    const coverLookupResponse = await fetch(
      `https://coverartarchive.org/release/${mbResults[0].releases[0].id}/front-500.jpg`,
      {
        method: "GET",
      }
    );

    await prisma.song.update({
      where: {
        id: song.id,
      },
      data: {
        mbid: mbResults[0].id,
        musicbrainzArtist: mbJoinArtists(mbResults[0]["artist-credit"]),
        musicbrainzTitle: mbResults[0].title,
        musicbrainzLength: mbResults[0].length,
        ...(coverLookupResponse.ok && { coverUrl: coverLookupResponse.url }),
      },
    });
  } else {
    throw new Error(
      "MusicBrainz search for " + song.artist + " - " + song.title + " failed."
    );
  }
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
    const submissionCodePlaintext =
      "oenuthrrprwvqmjwqbxk" +
      request.body.score +
      request.body.songlength +
      request.body.density +
      request.body.trackshape +
      request.body.vehicle +
      "2347nstho4eu" +
      request.body.song +
      request.body.artist;
    const submissionHash = crypto
      .createHash("md5")
      .update(submissionCodePlaintext)
      .digest("hex");
    if (submissionHash != request.body.submitcode) {
      fastify.log.error(
        "Invalid submit code: " +
          submissionCodePlaintext +
          " - " +
          submissionHash +
          " - " +
          request.body.submitcode
      );
      throw new Error("Invalid submit code.");
    }

    const user: User = await SteamUtils.findUserByTicket(request.body.ticket);

    const song = await getOrCreateSong(request.body.song, request.body.artist);

    try {
      if (!song.mbid) {
        fastify.log.info(
          "Looking up MusicBrainz info for song " +
            song.id +
            " with length " +
            request.body.songlength * 10
        );
        addMusicBrainzInfo(song, +request.body.songlength * 10);
      }
    } catch (e) {
      fastify.log.error("Failed to look up MusicBrainz info: " + e);
    }

    const prevScore = await prisma.score.findUnique({
      where: {
        userId_leagueId_songId: {
          songId: song.id,
          userId: user.id,
          leagueId: +request.body.league,
        },
      },
    });

    const score = await prisma.score.upsert({
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

    if (!score) throw new Error("Score submission failed.");

    fastify.log.info(
      "Play submitted by user %d on song %d in league %d, score: %d\nSubmit code: %s\nPlay #%d",
      user.id,
      +request.body.songid,
      +request.body.league,
      +request.body.score,
      request.body.submitcode,
      score.playCount
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
