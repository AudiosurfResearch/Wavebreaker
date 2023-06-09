import { WebhookClient, EmbedBuilder } from "discord.js";
import WavebreakerConfig from "../config/wavebreaker_config.json";
import { Song, User } from "@prisma/client";

export const webhook = new WebhookClient({
  url: WavebreakerConfig.webhookLink,
});

export function sendMetadataReport(
  user: User,
  song: Song,
  additionalInfo: string = null
) {
  const embed = new EmbedBuilder()
    .setTitle(`Metadata report for song ${song.id} received`)
    .setColor(0xffc777)
    .addFields([
      {
        name: "Song",
        value: `${song.artist} - ${song.title}`,
      },
    ]);

  if (additionalInfo) {
    embed.addFields([{ name: "Additional info", value: additionalInfo }]);
  }
  if (song.coverUrl) {
    embed.setThumbnail(song.coverUrl);
  }

  webhook.send({
    username: user.username,
    avatarURL: user.avatarUrl,
    embeds: [embed],
  });
}
