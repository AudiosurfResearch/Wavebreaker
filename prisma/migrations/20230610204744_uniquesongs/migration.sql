/*
  Warnings:

  - A unique constraint covering the columns `[title,artist,tags]` on the table `Song` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Song_title_artist_tags_key" ON "Song"("title", "artist", "tags");
