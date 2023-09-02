import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
const redis = new Redis(process.env.REDIS_URL);
const prisma = new PrismaClient();

async function main() {
  //Get all users and combine all skillPoints across all their scores
  const users = await prisma.user.findMany({
    include: {
      scores: true,
    },
  });
  const usersTotalSkillPoints = users.map((user) => {
    const totalPoints = user.scores.reduce((acc, score) => {
      return acc + score.skillPoints;
    }, 0);
    return { ...user, totalSkillPoints: totalPoints };
  });
  //Add users with total skill points to sorted list in Redis
  for (const user of usersTotalSkillPoints) {
    await redis.zadd("leaderboard", user.totalSkillPoints, user.id);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })

  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });
