import { Song } from "@prisma/client";
import { prisma } from "./db";

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