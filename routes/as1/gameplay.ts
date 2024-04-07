import { FastifyInstance } from "fastify";
import { Prisma, User, Score, Song } from "@prisma/client";
import { prisma } from "../../util/db";
import xml2js from "xml2js";
import * as SteamUtils from "../../util/steam";
import crypto from "crypto";
import { addMusicBrainzInfo, tagByMBID } from "../../util/musicbrainz";
import { removeTagsFromTitle, tagsFromTitle } from "../../util/gamemodeTags";
import { Static, Type } from "@sinclair/typebox";
import { calcSkillPoints } from "../../util/rankings";

const xmlBuilder = new xml2js.Builder();

const fetchSongIdSteamRequestSchema = Type.Object(
  {
    artist: Type.String(),
    song: Type.String(),
    uid: Type.Integer(),
    league: Type.Integer({ minimum: 0, maximum: 2 }),
    ticket: Type.String(),
  },
  { additionalProperties: false }
);
type FetchSongIdSteamRequest = Static<typeof fetchSongIdSteamRequestSchema>;

const sendRideSteamRequestSchema = Type.Object(
  {
    steamusername: Type.String(),
    snum: Type.Integer(),
    artist: Type.String(),
    song: Type.String(),
    score: Type.Integer(),
    vehicle: Type.Integer({ minimum: 0, maximum: 17 }),
    league: Type.Integer({ minimum: 0, maximum: 2 }),
    locationid: Type.Integer(),
    feats: Type.String(),
    songlength: Type.Integer(),
    trackshape: Type.String(),
    density: Type.Integer(),
    submitcode: Type.String(),
    songid: Type.Integer(),
    xstats: Type.String(),
    goldthreshold: Type.Integer(),
    iss: Type.Integer(),
    isj: Type.Integer(),
    s64: Type.String(),
    ticket: Type.String(),
    mbid: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
type SendRideSteamRequest = Static<typeof sendRideSteamRequestSchema>;

const getRidesSteamRequestSchema = Type.Object(
  {
    uid: Type.Integer(),
    songid: Type.Integer(),
    league: Type.Integer({ minimum: 0, maximum: 2 }),
    locationid: Type.Integer(),
    steamusername: Type.String(),
    snum: Type.Integer(),
    s64: Type.String(),
    ticket: Type.String(),
  },
  { additionalProperties: false }
);
type GetRidesSteamRequest = Static<typeof getRidesSteamRequestSchema>;

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
            locationid: location,
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
  if (
    artist.toLowerCase() == "unknown artist" ||
    title.toLowerCase() == "unknown"
  )
    throw new Error("Invalid song title or artist.");

  const gamemodeTags: string[] = tagsFromTitle(title);
  if (gamemodeTags.length > 0) title = removeTagsFromTitle(title);

  let song: Song = await prisma.song.findFirst({
    where: {
      AND: [
        {
          OR: [
            {
              title: {
                equals: title,
              },
            },
            {
              musicbrainzTitle: {
                equals: title,
                mode: "insensitive",
              },
            },
          ],
        },
        {
          OR: [
            {
              artist: {
                equals: artist,
              },
            },
            {
              musicbrainzArtist: {
                equals: artist,
                mode: "insensitive",
              },
            },
          ],
        },
        {
          ...(gamemodeTags.length == 0 && {
            tags: {
              isEmpty: true,
            },
          }),
          ...(gamemodeTags.length > 0 && {
            tags: {
              equals: gamemodeTags,
            },
          }),
        },
      ],
    },
  });
  if (!song) {
    song = await prisma.song.create({
      data: {
        title: title,
        artist: artist,
        ...(gamemodeTags.length > 0 && { tags: gamemodeTags }),
      },
    });
  }

  return song;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{
    Body: FetchSongIdSteamRequest;
  }>(
    "/as_steamlogin/game_fetchsongid_unicode.php",
    { schema: { body: fetchSongIdSteamRequestSchema } },
    async (request) => {
      const user: User = await SteamUtils.findUserByTicket(request.body.ticket);
      
      fastify.log.info(
        "User" + user.id + "requesting song ID for " +
          request.body.artist +
          " - " +
          request.body.song
      );

      const song = await getOrCreateSong(
        request.body.song,
        request.body.artist
      );

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
    }
  );

  fastify.post<{
    Body: SendRideSteamRequest;
  }>(
    "/as_steamlogin/game_SendRideSteamVerified.php",
    { schema: { body: sendRideSteamRequestSchema } },
    async (request) => {
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
          `Invalid submit code: ${submissionCodePlaintext} - ${submissionHash} - ${request.body.submitcode}`
        );
        throw new Error("Invalid submit code.");
      }

      const user: User = await SteamUtils.findUserByTicket(request.body.ticket);

      let song: Song;
      if (request.body.mbid) {
        fastify.log.info(
          `User ${user.id} submitted a ride with MBID, using it for lookup first: ${request.body.mbid}`
        );
        song = await prisma.song.findFirst({
          where: {
            mbid: request.body.mbid,
            tags: {
              equals: tagsFromTitle(request.body.song), //Only look for songs with the same modifier tags!
            },
          },
        });
        if (!song) {
          fastify.log.info(
            "Song not found by MBID, looking up by title and artist."
          );
        }
      }

      if (!song || !request.body.mbid) {
        song = await getOrCreateSong(request.body.song, request.body.artist);
      }

      if (!song.mbid) {
        fastify.log.info(
          `Looking up MusicBrainz info for song ${song.id} with length ${
            request.body.songlength * 10
          }`
        );
        if (request.body.mbid) {
          fastify.log.info(
            `Using user-provided MBID for song: ${request.body.mbid}`
          );
          tagByMBID(song.id, request.body.mbid).catch((e) => {
            fastify.log.error(`Failed to tag song by MBID: ${e}\n${e.stack}`);
          });
        } else {
          addMusicBrainzInfo(song, request.body.songlength * 10).catch((e) => {
            fastify.log.error(
              `Failed to look up MusicBrainz info: ${e}\n${e.stack}`
            );
          });
        }
      }

      const prevScore = await prisma.score.findUnique({
        where: {
          userId_leagueId_songId: {
            songId: song.id,
            userId: user.id,
            leagueId: request.body.league,
          },
        },
      });

      const scoreComponent = {
        trackShape: request.body.trackshape,
        xstats: request.body.xstats,
        density: request.body.density,
        vehicleId: request.body.vehicle,
        score: request.body.score,
        feats: request.body.feats,
        songLength: request.body.songlength,
        goldThreshold: request.body.goldthreshold,
        skillPoints: calcSkillPoints(
          request.body.score,
          request.body.goldthreshold,
          request.body.league
        ),
        iss: request.body.iss,
        isj: request.body.isj,
      };
      const score = await prisma.score.upsert({
        where: {
          userId_leagueId_songId: {
            songId: song.id,
            userId: user.id,
            leagueId: request.body.league,
          },
        },
        create: {
          userId: user.id,
          leagueId: request.body.league,
          songId: request.body.songid,
          ...scoreComponent,
        },
        update: {
          playCount: {
            increment: 1,
          },
          ...(prevScore &&
            prevScore.score < request.body.score && {
              rideTime: new Date(),
              ...scoreComponent,
            }),
        },
      });

      if (!score) throw new Error("Score submission failed.");

      fastify.log.info(
        "Play submitted by user %d on song %d in league %d, score: %d\nSubmit code: %s\nPlay #%d",
        user.id,
        request.body.songid,
        request.body.league,
        request.body.score,
        request.body.submitcode,
        score.playCount
      );
      fastify.log.info("Song tags: " + song.tags);

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
    { schema: { body: getRidesSteamRequestSchema } },
    async (request) => {
      try {
        const user = await SteamUtils.findUserWithRivalsByTicket(
          request.body.ticket
        );

        //Global scores
        const globalScores: ScoreWithPlayer[] = [];
        for (let league = 0; league <= 2; league++) {
          globalScores.push(
            ...(await getSongScores(request.body.songid, league, 0, 11))
          );
        }

        //Nearby scores
        const nearbyScores: ScoreWithPlayer[] = [];
        for (let league = 0; league <= 2; league++) {
          nearbyScores.push(
            ...(await getSongScores(
              request.body.songid,
              league,
              request.body.locationid,
              11
            ))
          );
        }

        //Rival/Friend scores
        //Get the list of IDs of the user's rivals
        const rivalIds = user.rivals.map((rival) => rival.id);
        rivalIds.push(user.id); //So our own score is included, for easier comparison

        const friendScores: ScoreWithPlayer[] = [];
        for (let league = 0; league <= 2; league++) {
          friendScores.push(
            ...(await getSongScores(
              request.body.songid,
              league,
              request.body.locationid,
              11,
              rivalIds
            ))
          );
        }

        const scoreResponseArray: object[] = [];
        for (const score of globalScores) {
          scoreResponseArray.push(constructScoreResponseEntry(0, score));
        }
        for (const score of nearbyScores) {
          scoreResponseArray.push(constructScoreResponseEntry(1, score));
        }
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
    }
  );
}
