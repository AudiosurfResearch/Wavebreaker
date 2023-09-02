import { PrismaClient, Song, User } from "@prisma/client";
import Redis from "ioredis";

export const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});

export const redis = new Redis(process.env.REDIS_URL);

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
