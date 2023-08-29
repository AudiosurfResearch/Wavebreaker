import { PrismaClient, Song, User } from "@prisma/client";

export const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});

export interface ExtendedUser extends User {
  totalScore: number;
  totalPlays: number;
  favoriteCharacter?: number;
  favoriteSong?: Song;
}

/*
prisma.$on("query", (e) => {
  console.log("DB query took " + e.duration + "ms");
});
*/