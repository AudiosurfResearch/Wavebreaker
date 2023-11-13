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
      async delete({ args, query }) {
        const score = await prisma.score.findUnique({ where: args.where });
        if (score) {
          await redis.zincrby("leaderboard", -score.skillPoints, score.userId);
        }
        return query(args);
      },
    },
    user: {
      async delete({ args, query }) {
        await redis.zrem("leaderboard", args.where.id);
        return query(args);
      }
    }
  },
  /*
  result: {
    user: {
      rank: {
        needs: { id: true },
        compute(user) {
          return getUserRank(user.id).then((res) => {
            return res;
          });
        },
      },
      totalSkillPoints: {
        needs: { id: true },
        compute(user) {
          return redis.zscore("leaderboard", user.id).then((res) => {
            return Number(res);
          });
        },
      },
    },
  },
*/
});

export async function getUserExtended(user: User): Promise<ExtendedUser> {
  const scoreAggregation = await prisma.score.aggregate({
    where: {
      userId: user.id,
    },
    _sum: {
      score: true,
      playCount: true,
    },
  });

  //Get user's favorite song (or, rather, song of the score with the most plays)
  const favSongScore = await prisma.score.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      playCount: "desc",
    },
    include: {
      song: true,
    },
  });

  //Get user's most used character
  const charGroup = await prisma.score.groupBy({
    by: ["vehicleId"],
    where: {
      userId: user.id,
    },
    _sum: {
      playCount: true,
    },
    orderBy: {
      _sum: {
        playCount: "desc",
      },
    },
  });

  return {
    ...(await getUserWithRank(user)),
    totalScore: scoreAggregation._sum.score ?? 0,
    totalPlays: scoreAggregation._sum.playCount ?? 0,
    favoriteSong: favSongScore?.song,
    ...(charGroup[0] && { favoriteCharacter: charGroup[0].vehicleId }),
  };
}

export async function getUserWithRank(user: User): Promise<UserWithRank> {
  return {
    ...user,
    rank: await getUserRank(user.id),
    totalSkillPoints: Number(await redis.zscore("leaderboard", user.id)),
  };
}

export interface UserWithRank extends User {
  rank: number;
  totalSkillPoints: number;
}

export interface ExtendedUser extends UserWithRank {
  totalScore: number;
  totalPlays: number;
  favoriteCharacter?: number;
  favoriteSong?: Song;
}
