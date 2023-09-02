import { PrismaClient, Song, User } from "@prisma/client";
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL);

const prismaOrig = new PrismaClient();
//potentially hacky solution for leaderboard
export const prisma = prismaOrig.$extends({
  name: "leaderboardExt",
  query: {
    score: {
      async upsert({ args, query }) {
        //If score already exists, add difference of skillPoints to leaderboard ranking
        const score = await prisma.score.findUnique({ where: args.where });
        if (score) {
          //create.score and update.score are the same, the latter has a weird secondary type so no comparisons allowed
          if (score.score < args.create.score) {
            const diff = args.create.score - score.score;
            await redis.zincrby("leaderboard", diff, score.userId);
          }
        } else {
          await redis.zadd(
            "leaderboard",
            args.create.score,
            args.create.userId
          );
        }
        return query(args);
      },
    },
  },
});

export interface ExtendedUser extends User {
  totalScore: number;
  totalPlays: number;
  favoriteCharacter?: number;
  favoriteSong?: Song;
}
