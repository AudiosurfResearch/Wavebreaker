<div align="center">
  <picture>
  <img alt="Wavebreaker logo" src="./.github/assets/wavebreaker_icon.png" width="25%" height="25%">
</picture>

<b>Wavebreaker</b>, an open-source reimplementation of Audiosurf's online services.

</div>

#

> [!IMPORTANT]
> If you're only interested in playing on Wavebreaker, there is a main public instance of Wavebreaker and its frontend running at https://wavebreaker.arcadian.garden/. Also see the [install guide](https://wavebreaker.arcadian.garden/installguide) for the client mod.

### Info

Backend for Audiosurf server replacement written in TypeScript using Node.js, Fastify and Prisma. Somewhat WIP.
The aim is to replace all of the official server's features.

> [!NOTE]
> This repo is only for the backend code. Wavebreaker is made of **four parts**.\
> There's the backend (which you're looking at right now), the [frontend](https://github.com/AudiosurfResearch/Wavebreaker-Frontend) (website to view scores, add rivals, etc), the [client](https://github.com/AudiosurfResearch/Wavebreaker-Hook) (which makes the game connect to Wavebreaker) and the [installer](https://github.com/AudiosurfResearch/Wavebreaker-Installer) as a user-friendly way to set up the client.

### Features

At the moment, Wavebreaker already implements nearly all of the original server's features. This includes:

- Leaderboards
- Comments/Shouts on songs
- Account system through Steam auth
- Steam friend auto-sync
- Rival/Challenger approach for competing with others instead of just mutual "friends"
- Automatic lookup of **fancy metadata** with proper capitalization and cover art, thanks to integration with the [MusicBrainz](https://musicbrainz.org) API
- **Custom Audiosurf Radio songs[^1]**

[^1]: Requires RadioBrowser.cgr from AS1 version with manifest ID 2426309927836492358, included with the Wavebreaker client package. Actually making custom Audiosurf Radio songs is really finicky and is done using [Quest3DTamperer](https://github.com/AudiosurfResearch/Quest3DTamperer).

Currently missing:

- Dethrone notifications
- Achievements

### Config

The server uses two config files at the root of the project: `wavebreaker_config.json` and `wavebreaker_radio_entries.json`.
Look at the example files in there, they should be self-explanatory.

You also need to set the DATABASE_URL environment variable to point to a PostgreSQL server.
