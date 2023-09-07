import { PrismaClient, Song, User } from "@prisma/client";
import Redis from "ioredis";
import { getUserRank } from "./rankings";

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
            const diff = args.create.skillPoints - score.skillPoints;
            await redis.zincrby("leaderboard", diff, score.userId);
          }
        } else {
          await redis.zincrby(
            "leaderboard",
            args.create.skillPoints,
            args.create.userId
          );
        }
        return query(args);
      },
    },
    user: {
      async create({ args, query }) {
        await redis.zadd("leaderboard", 0, args.data.id);
        return query(args);
      },
    },
  },
  result: {
    user: {
      rank: {
        needs: { id: true },
        async compute(user) {
          return await getUserRank(user.id);
        },
      },
      totalSkillPoints: {
        needs: { id: true },
        async compute(user) {
          return Number(await redis.zscore("leaderboard", user.id))
        },
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
