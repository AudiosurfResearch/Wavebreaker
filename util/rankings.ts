/*
  TODO: Implement rankings properly, using skill points.
  Formula for skill points is Math.round((score / goldThreshold) * multiplier)
  The multiplier is 300 for Elite, 200 for Pro and 100 for Casual leagues respectively
  Maybe use Redis or something for the ranking stuff as well?
*/

import { Song, User } from "@prisma/client";
import { prisma, redis } from "./db";

export interface UserWithRank extends User {
  rank: number;
}

interface DBUserRank {
  userId: number;
  rank: bigint;
  total_score: bigint;
}

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

export async function getUserRank(userId: number): Promise<number> {
  const rank = await redis.zrevrank("leaderboard", userId);
  return rank + 1;
}