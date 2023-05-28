-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "mbid" TEXT,
ADD COLUMN     "musicbrainzArtist" TEXT,
ADD COLUMN     "musicbrainzTitle" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "avatarUrl" DROP NOT NULL,
ALTER COLUMN "avatarUrlMedium" DROP NOT NULL,
ALTER COLUMN "avatarUrlMedium" DROP DEFAULT,
ALTER COLUMN "avatarUrlSmall" DROP NOT NULL,
ALTER COLUMN "avatarUrlSmall" DROP DEFAULT;
