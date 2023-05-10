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
async function getShoutsAsString(songId) {
    let shoutResponse = "";
    const shouts = await prisma.shout.findMany({
        where: {
            songId: songId,
        },
        include: {
            author: true,
        },
        orderBy: {
            timeCreated: "desc",
        },
    });
    if (shouts.length == 0) {
        return "No shouts found. Shout it out loud!";
    }
    shouts.forEach((shout) => {
        shoutResponse +=
            shout.author.username +
                " (at " +
                shout.timeCreated.toUTCString() +
                "):\n";
        shoutResponse += shout.content + "\n\n";
    });
    return shoutResponse;
}
async function routes(fastify, options) {
    fastify.post("/as/game_fetchtrackshape2.php", async (request, reply) => {
        try {
            var score = await prisma.score.findUniqueOrThrow({
                where: {
                    id: request.body.ridd,
                },
            });
        }
        catch (e) {
            return "failed";
        }
        return score.trackShape;
    });
    fastify.post("/as_steamlogin/game_fetchshouts_unicode.php", async (request, reply) => {
        return await getShoutsAsString(+request.body.songid[0]);
    });
    fastify.post("/as_steamlogin/game_sendShoutSteamVerified.php", async (request, reply) => {
        try {
            var user = await steam_1.SteamUtils.findUserByTicket(request.body.ticket);
            const updateSong = await prisma.song.update({
                where: {
                    id: +request.body.songid,
                },
                data: {
                    shouts: {
                        create: {
                            authorId: user.id,
                            content: request.body.shout,
                        },
                    },
                },
            });
        }
        catch (e) {
            console.error(e);
            return e;
        }
        return await getShoutsAsString(+request.body.songid);
    });
    fastify.post("//as_steamlogin/game_CustomNews.php", async (request, reply) => {
        //TODO: proper implementation
        return xmlBuilder.buildObject({
            RESULTS: {
                TEXT: "Is it me or am I\nsimply dreaming this time?",
            },
        });
    });
}
exports.default = routes;
