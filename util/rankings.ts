/*
  TODO: Implement rankings properly, using skill points.
  Formula for skill points is Math.round((score / goldThreshold) * multiplier)
  The multiplier is 300 for Elite, 200 for Pro and 100 for Casual leagues respectively
  Maybe use Redis or something for the ranking stuff as well?
*/

import { Song } from "@prisma/client";
import { prisma, redis } from "./db";

export function calcSkillPoints(
  score: number,
  goldThreshold: number,
  leagueId: number
): number {
  const multiplier = (leagueId + 1) * 100;
  return Math.round((score / goldThreshold) * multiplier);
}

export async function getPopularSongs(
  page: number,
  pageSize: number,
  sort: "asc" | "desc" = "desc"
): Promise<Song[]> {
  return await prisma.song.findMany({
    take: pageSize,
    skip: (page - 1) * pageSize,
    include: {
      _count: {
        select: { scores: true },
      },
    },
    orderBy: {
      scores: {
        _count: sort,
      },
    },
  });
}

export async function getLeaderboard(page: number, pageSize: number) {
  //Get leaderboard from Redis
  const leaderboardUsers = (await redis.zrevrange(
    "leaderboard",
    (page - 1) * pageSize,
    page * pageSize - 1,
  )).map(Number);
  //Get full users from Prisma
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: leaderboardUsers,
      },
    },
  });
  //Order users in the same order as in the leaderboardUsers array
  users.sort((a, b) => {
    return (
      leaderboardUsers.indexOf(a.id) - leaderboardUsers.indexOf(b.id)
    );
  });
  return users;
}

export async function getUserRank(userId: number): Promise<number> {
  const rank = await redis.zrevrank("leaderboard", userId);
  return rank + 1;
}
