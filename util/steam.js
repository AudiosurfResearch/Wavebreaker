"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SteamUtils = void 0;
const client_1 = require("@prisma/client");
const wavebreaker_config_json_1 = __importDefault(require("../wavebreaker_config.json"));
const steamapi_1 = __importDefault(require("steamapi"));
const prisma = new client_1.PrismaClient();
var SteamUtils;
(function (SteamUtils) {
    SteamUtils.steamApi = new steamapi_1.default(wavebreaker_config_json_1.default.steamApiKey);
    async function findUserByTicket(ticket) {
        const ticketResponse = await verifySteamTicket(ticket);
        var user = await prisma.user.findFirstOrThrow({
            where: {
                steamid64: BigInt(await ticketResponse.response.params.steamid),
            },
        });
        return user;
    }
    SteamUtils.findUserByTicket = findUserByTicket;
    async function verifySteamTicket(ticket) {
        let apiCheckUrl = "https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?key=" +
            wavebreaker_config_json_1.default.steamApiKey +
            "&appid=12900&ticket=" +
            ticket;
        const response = await fetch(apiCheckUrl);
        const jsonData = await response.json();
        if (jsonData.response.params.result == "OK")
            return jsonData;
        else
            throw new Error("Ticket validation failed");
    }
    SteamUtils.verifySteamTicket = verifySteamTicket;
})(SteamUtils = exports.SteamUtils || (exports.SteamUtils = {}));
