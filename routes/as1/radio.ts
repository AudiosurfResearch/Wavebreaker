import { FastifyInstance } from "fastify";
import WavebreakerRadioConfig from "../../wavebreaker_radio_entries.json";

type RadioEntry = {
  title: string;
  artist: string;
  externalUrl: string;
  cgrFileUrl: string;
};

export default async function routes(fastify: FastifyInstance) {
  fastify.get(
    "/as/asradio/game_asradiolist5.php",
    async () => {
      if (WavebreakerRadioConfig.availableSongs.length == 0) return "";
      
      const separator = "-:*x-";
      const radioEntries: RadioEntry[] = WavebreakerRadioConfig.availableSongs;

      //Join every radio entry's properties (and the entries themselves) with the separator
      const entriesString =
        radioEntries
          .map((entry) => Object.values(entry).join(separator))
          .join(separator) + separator;

      return entriesString;
    }
  );
}
