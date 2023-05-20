import { FastifyInstance } from "fastify";
import { Prisma, User } from "@prisma/client";
import { prisma } from "../../util/db";

interface GetUserParams {
  id: number;
  getExtendedInfo?: boolean;
}

interface ExtendedUser extends User {
  totalScore: number;
}

export default async function routes(fastify: FastifyInstance) {
  fastify.post<{ Body: GetUserParams }>(
    "/api/users/getUser",
    async (request, reply) => {
      const id = request.body.id;
      try {
        const userBase: User = await prisma.user.findUniqueOrThrow({
          where: {
            id: id,
          },
        });

        if (request.body.getExtendedInfo) {
          const totalScore = await prisma.score.aggregate({
            where: {
              userId: id,
            },
            _sum: {
              score: true,
            },
          });

          const user: ExtendedUser = userBase as ExtendedUser;
          if (totalScore._sum.score) user.totalScore = totalScore._sum.score;
          else user.totalScore = 0;

          return user;
        }

        return userBase;
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
