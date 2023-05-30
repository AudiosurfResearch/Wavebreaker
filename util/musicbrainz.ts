import { IArtistCredit, IIsrcSearchResult, IRecording, MusicBrainzApi } from "musicbrainz-api";

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
      length - 3000
    } TO ${length + 3000}]`,
  });

  if (search.recordings.length > 0) {
    return search.recordings;
  } else {
    return null;
  }
}

export function mbJoinArtists(
  artistCredit: IArtistCredit[],
): string {
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
