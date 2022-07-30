import { FastifyInstance } from "fastify";
import { PrismaClient, Score } from "@prisma/client";
import xml2js from "xml2js";

const xmlBuilder = new xml2js.Builder();
const prisma = new PrismaClient();

interface FetchTrackShapeRequest {
  ridd: number;
  songid: number;
  league: number;
}

export default async function routes(
  fastify: FastifyInstance,
  options: Object
) {
  fastify.post<{
    Body: FetchTrackShapeRequest;
  }>("/as/game_fetchtrackshape2.php", async (request, reply) => {
    return await prisma.score.findUnique({
      where: {
        id: request.body.ridd,
      },
    });
  });
}
