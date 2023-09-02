import { PrismaClient, Song, User } from "@prisma/client";
import { createClient } from "redis";

export const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});

export const redis = createClient({
  url: process.env.REDIS_URL,
});
redis.on("error", (err) => console.error("Redis Client Error", err));
redis.connect().then(() => {
  console.log("Connected to Redis");
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
