/*
  Warnings:

  - Added the required column `skillPoints` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Score" ADD COLUMN "skillPoints" INTEGER NOT NULL DEFAULT 0;
UPDATE "Score" SET "skillPoints" = ROUND(("score"::float / "goldThreshold") * (("leagueId" + 1) * 100));