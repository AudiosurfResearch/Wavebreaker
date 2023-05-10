"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const steam_1 = require("../../util/steam");
const xml2js_1 = __importDefault(require("xml2js"));
const steamid_1 = __importDefault(require("steamid"));
const xmlBuilder = new xml2js_1.default.Builder();
const prisma = new client_1.PrismaClient();
async function routes(fastify, options) {
    fastify.post("/as_steamlogin/game_AttemptLoginSteamVerified.php", async (request, reply) => {
        try {
            const steamTicketResponse = await steam_1.SteamUtils.verifySteamTicket(request.body.ticket);
            const steamId = new steamid_1.default(steamTicketResponse.response.params.steamid);
            const steamUser = await steam_1.SteamUtils.steamApi.getUserSummary(steamId.getSteamID64());
            var user = await prisma.user.upsert({
                where: { steamid64: steamId.getBigIntID() },
                update: { username: steamUser.nickname },
                create: {
                    username: steamUser.nickname,
                    steamid64: steamId.getBigIntID(),
                    steamid32: steamId.accountid,
                    locationid: 1,
                },
            });
        }
        catch (e) {
            console.error(e);
            return e;
        }
        return xmlBuilder.buildObject({
            RESULT: {
                $: {
                    status: "allgood",
                },
                userid: user.id,
                username: user.username,
                locationid: user.locationid,
                steamid: user.steamid32, //SteamID32, not ID64
            },
        });
    });
}
exports.default = routes;
