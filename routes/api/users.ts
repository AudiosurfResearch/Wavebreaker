import { FastifyInstance } from "fastify";
import { Prisma, User } from "@prisma/client";
import { prisma } from "../../util/db";

interface GetUserParams {
  id: number;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Params: GetUserParams }>(
    "/api/users/getUser/:id",
    async (request, reply) => {
      const id = +request.params.id; //damn it why
      try {
        const user: User = await prisma.user.findUniqueOrThrow({
          where: {
            id: id,
          },
        });
        return user;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          reply.status(404).send({ error: "User not found" });
      }
    }
  );
}
