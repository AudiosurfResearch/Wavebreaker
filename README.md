# Wavebreaker
Backend for Audiosurf server replacement written in TypeScript using Node.js, Fastify and Prisma. Somewhat WIP.

# Features
Replicates pretty much all of the original server's features, unless I've missed something. Wavebreaker currently supports:
- Account system through Steam auth
- Steam friend auto-sync
- Rival/Challenger approach for competing with others instead of just mutual "friends"
- Leaderboards
- Comments/Shouts on songs
- **Full support for adding custom Audiosurf Radio songs***

**requires RadioBrowser.cgr from AS1 version with manifest ID 2426309927836492358*

# Config
The server uses two config files at the root of the project: ``wavebreaker_config.json`` and ``wavebreaker_radio_entries.json``.

Radio config example:
```json
{
    "availableSongs": [
        {
            "artist": "Wavebreaker",
            "title": "Example entry 1",
            "cgrFileUrl": "http://localhost/as/asradio/Test1.cgr",
            "externalUrl": "https://github.com/AudiosurfResearch/Wavebreaker"
        },
        {
            "artist": "Wavebreaker",
            "title": "Example entry 2",
            "cgrFileUrl": "http://localhost/as/asradio/Test2.cgr",
            "externalUrl": "https://github.com/AudiosurfResearch/Wavebreaker"
        }
    ]
}
```
