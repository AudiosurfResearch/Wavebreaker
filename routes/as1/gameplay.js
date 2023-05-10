"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const xml2js_1 = __importDefault(require("xml2js"));
const steam_1 = require("../../util/steam");
const xmlBuilder = new xml2js_1.default.Builder();
const prisma = new client_1.PrismaClient();
async function routes(fastify, options) {
    fastify.post("/as_steamlogin/game_fetchsongid_unicode.php", async (request, reply) => {
        //Validation
        if (request.body.artist.toLowerCase() == "unknown" && request.body.song.toLowerCase() == "unknown")
            return "failed";
        //TODO: Case insensitivity??? This is an issue depending on DB backend, tbh.
        //SQLite doesn't have viable case insensitive matching options
        try {
            var song = await prisma.song.findFirstOrThrow({
                where: {
                    title: request.body.song,
                    artist: request.body.artist,
                },
            });
        }
        catch (e) {
            song = await prisma.song.create({
                data: {
                    title: request.body.song,
                    artist: request.body.artist,
                },
            });
        }
        try {
            var pb = await prisma.score.findFirstOrThrow({
                where: {
                    songId: song.id,
                    userId: request.body.uid,
                    leagueId: request.body.league,
                },
            });
        }
        catch (e) {
            return xmlBuilder.buildObject({
                RESULT: {
                    $: {
                        status: "allgood",
                    },
                    songid: song.id,
                    pb: 0,
                },
            });
        }
        return xmlBuilder.buildObject({
            RESULT: {
                $: {
                    status: "allgood",
                },
                songid: pb.songId,
                pb: pb.score,
            },
        });
    });
    fastify.post("/as_steamlogin/game_SendRideSteamVerified.php", async (request, reply) => {
        try {
            var user = await steam_1.SteamUtils.findUserByTicket(request.body.ticket);
        }
        catch (e) {
            console.log(e);
            return xmlBuilder.buildObject({
                RESULT: {
                    $: {
                        status: "failed",
                    },
                },
            });
        }
        /*
        TODO: Implement checks for the song submission hash
      */
        try {
            var song = await prisma.song.findFirstOrThrow({
                where: {
                    title: request.body.song,
                    artist: request.body.artist,
                },
            });
        }
        catch (e) {
            song = await prisma.song.create({
                data: {
                    title: request.body.song,
                    artist: request.body.artist,
                },
            });
        }
        try {
            let prevScore = await prisma.score.findFirstOrThrow({
                where: {
                    userId: user.id,
                    songId: song.id,
                    leagueId: request.body.league,
                },
            });
            await prisma.score.delete({ where: { id: prevScore.id } });
        }
        catch (e) { }
        await prisma.score.create({
            data: {
                userId: +user.id,
                leagueId: +request.body.league,
                trackShape: request.body.trackshape,
                xstats: request.body.xstats,
                density: +request.body.density,
                vehicleId: +request.body.vehicle,
                score: +request.body.score,
                feats: request.body.feats,
                songLength: +request.body.songlength,
                goldThreshold: +request.body.goldthreshold,
                iss: +request.body.iss,
                isj: +request.body.isj,
                songId: +request.body.songid,
            },
        });
        return xmlBuilder.buildObject({
            RESULT: {
                $: {
                    status: "allgood",
                },
                songid: song.id,
            },
        });
    });
    fastify.post("/as_steamlogin/game_GetRidesSteamVerified.php", async (request, reply) => {
        const casualScores = await prisma.score.findMany({
            where: {
                songId: +request.body.songid,
                leagueId: 0,
            },
            orderBy: {
                score: "desc",
            },
            take: 11,
            include: {
                player: true,
            },
        });
        const proScores = await prisma.score.findMany({
            where: {
                songId: +request.body.songid,
                leagueId: 1,
            },
            orderBy: {
                score: "desc",
            },
            take: 11,
            include: {
                player: true,
            },
        });
        const eliteScores = await prisma.score.findMany({
            where: {
                songId: +request.body.songid,
                leagueId: 2,
            },
            orderBy: {
                score: "desc",
            },
            take: 11,
            include: {
                player: true,
            },
        });
        let fullScoreArray = [];
        for (const score of casualScores) {
            fullScoreArray.push({
                $: {
                    scoretype: 0,
                },
                league: {
                    $: {
                        leagueid: 0,
                    },
                    ride: {
                        username: score.player.username,
                        vehicleid: score.vehicleId,
                        score: score.score,
                        ridetime: Math.floor(score.rideTime.getTime() / 1000),
                        feats: score.feats,
                        songlength: score.songLength,
                        trafficcount: score.id,
                    },
                },
            });
        }
        for (const score of proScores) {
            fullScoreArray.push({
                $: {
                    scoretype: 0,
                },
                league: {
                    $: {
                        leagueid: 1,
                    },
                    ride: {
                        username: score.player.username,
                        vehicleid: score.vehicleId,
                        score: score.score,
                        ridetime: Math.floor(score.rideTime.getTime() / 1000),
                        feats: score.feats,
                        songlength: score.songLength,
                        trafficcount: score.id,
                    },
                },
            });
        }
        for (const score of eliteScores) {
            fullScoreArray.push({
                $: {
                    scoretype: 0,
                },
                league: {
                    $: {
                        leagueid: 2,
                    },
                    ride: {
                        username: score.player.username,
                        vehicleid: score.vehicleId,
                        score: score.score,
                        ridetime: Math.floor(score.rideTime.getTime() / 1000),
                        feats: score.feats,
                        songlength: score.songLength,
                        trafficcount: score.id,
                    },
                },
            });
        }
        return xmlBuilder.buildObject({
            RESULTS: {
                scores: fullScoreArray,
            },
        });
    });
}
exports.default = routes;
