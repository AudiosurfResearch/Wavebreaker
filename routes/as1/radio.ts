import { FastifyInstance } from "fastify";

export default async function routes(fastify: FastifyInstance) {
  fastify.get("/as/asradio/game_asradiolist5.php", async (request, response) => {
    //TODO: proper implementation
    response.header("Content-Type", "text/html");
    return "Wavebreaker-:*x-Test Entry-:*x-http://www.audio-surf.com/as/asradio/ASR_IDropGems.cgr-:*x-https://github.com/AudiosurfResearch/Wavebreaker-:*x-";
  });
}
