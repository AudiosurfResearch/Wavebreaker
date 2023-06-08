import { Song } from "@prisma/client";
import {
  IArtistCredit,
  IIsrcSearchResult,
  IRecording,
  MusicBrainzApi,
} from "musicbrainz-api";
import { prisma } from "./db";

export const mbApi = new MusicBrainzApi({
  appName: "Wavebreaker",
  appVersion: "0.0.1",
  appContactInfo: "https://github.com/AudiosurfResearch", // Or URL to application home page
});

export async function mbSongSearch(
  artist: string,
  title: string,
  length: number
): Promise<IRecording[] | null> {
  const search = await mbApi.search<IIsrcSearchResult>("recording", {
    query: `recording:${title} AND artist:${artist} AND dur:[${
      length - 6000
    } TO ${length + 6000}]`,
  });

  if (search.recordings.length > 0) {
    return search.recordings;
  } else {
    return null;
  }
}

export function mbJoinArtists(artistCredit: IArtistCredit[]): string {
  // Join every artist with name + joinphrase, if joinphrase is not empty
  // (joinphrase is empty if it's the last artist in the array)
  let artistString = "";
  artistCredit.forEach((artist) => {
    artistString += artist.name;
    if (artist.joinphrase) {
      artistString += artist.joinphrase;
    }
  });
  return artistString;
}

export async function addMusicBrainzInfo(song: Song, length: number) {
  if (song.mistagLock)
    throw new Error(
      `${song.artist} - ${song.title} is locked because it's prone to mistagging`
    );

  const mbResults = await mbSongSearch(song.artist, song.title, length);
  if (mbResults) {
    let coverUrl: string = null;
    for (const release of mbResults[0].releases) {
      const fullRelease = await mbApi.lookupRelease(release.id);

      if (fullRelease["cover-art-archive"].front) {
        await fetch(
          `https://coverartarchive.org/release/${release.id}/front-500.jpg`
        ).then((response) => {
          if (response.ok) {
            coverUrl = response.url;
          }
        });
      }
    }

    await prisma.song.update({
      where: {
        id: song.id,
      },
      data: {
        mbid: mbResults[0].id,
        musicbrainzArtist: mbJoinArtists(mbResults[0]["artist-credit"]),
        musicbrainzTitle: mbResults[0].title,
        musicbrainzLength: mbResults[0].length,
        ...(coverUrl && { coverUrl: coverUrl }),
        //weird-ish solution but this means i don't have to do two requests to Cover Art Archive
        ...(coverUrl && {
          smallCoverUrl: coverUrl.replace("_thumb500.jpg", "_thumb.jpg"),
        }),
      },
    });

    console.log(
      `Found matching MusicBrainz info for ${song.artist} - ${song.title}`
    );
  } else {
    throw new Error(
      `MusicBrainz search for ${song.artist} - ${song.title} failed.`
    );
  }
}

export async function tagByMBID(songId: number, recordingMBID: string) {
  const mbRecording = await mbApi.lookupRecording(recordingMBID);
  if (mbRecording) {
    let coverUrl: string = null;
    for (const release of mbRecording[0].releases) {
      const fullRelease = await mbApi.lookupRelease(release.id);

      if (fullRelease["cover-art-archive"].front) {
        await fetch(
          `https://coverartarchive.org/release/${release.id}/front-500.jpg`
        ).then((response) => {
          if (response.ok) {
            coverUrl = response.url;
          }
        });
      }
    }

    await prisma.song.update({
      where: {
        id: songId,
      },
      data: {
        mbid: mbRecording[0].id,
        musicbrainzArtist: mbJoinArtists(mbRecording[0]["artist-credit"]),
        musicbrainzTitle: mbRecording[0].title,
        musicbrainzLength: mbRecording[0].length,
        ...(coverUrl && { coverUrl: coverUrl }),
        //weird-ish solution but this means i don't have to do two requests to Cover Art Archive
        ...(coverUrl && {
          smallCoverUrl: coverUrl.replace("_thumb500.jpg", "_thumb.jpg"),
        }),
      },
    });
  } else {
    throw new Error(`Couldn't find recording with MBID ${recordingMBID}.`);
  }
}
