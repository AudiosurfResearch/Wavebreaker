import { FastifyInstance } from "fastify";
import xml2js from "xml2js";
import crypto from "crypto";

const xmlBuilder = new xml2js.Builder();

interface AS1LoginRequest {
  email: string;
  pass: string;
  loginorig: string;
  snum: number;
  s64: number;
}

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: AS1LoginRequest;
  }>("/as/game_AttemptLogin_unicodepub64.php", async (request, reply) => {
    const statusString = crypto
      .createHash("md5")
      .update("ntlr78ouqkutfc" + request.body.loginorig + "47ourol9oux")
      .digest("hex");
    return xmlBuilder.buildObject({
      RESULT: {
        $: {
          status: statusString,
        },
        userid: 1337,
        username: "John Audiosurf",
        locationid: 69, // locationid is the n-th element in the location list you see when registering
        steamid: 420, //SteamID32, not ID64
      },
    });
  });
}
