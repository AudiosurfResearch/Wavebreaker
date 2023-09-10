import { FastifyInstance } from "fastify";
import fs from "fs";
import { RadioEntry } from "../../@types/global";

export default async function routes(fastify: FastifyInstance) {
  //idk why this uses POST but it does
  fastify.post("/as/asradio/game_asradiolist5.php", async () => {
    const WavebreakerRadioConfig = JSON.parse(
      fs.readFileSync(
        globalThis.__basedir + "/config/wavebreaker_radio_entries.json",
        "utf-8"
      )
    );
    if (WavebreakerRadioConfig.availableSongs.length == 0) return "";

    const separator = "-:*x-";
    const radioEntries: RadioEntry[] = WavebreakerRadioConfig.availableSongs;

    //Join every radio entry's properties (and the entries themselves) with the separator
    const entriesString =
      radioEntries
        .map((entry) => {
          delete entry.wavebreakerId; //ignore wavebreakerId property - irrelevant for the game and causes issues
          return Object.values(entry).join(separator);
        })
        .join(separator) + separator;

    return entriesString;
  });
}
