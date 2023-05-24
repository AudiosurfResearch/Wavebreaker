/*
  Warnings:

  - A unique constraint covering the columns `[userId,leagueId,songId]` on the table `Score` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Score_userId_leagueId_songId_key" ON "Score"("userId", "leagueId", "songId");
