"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const formbody_1 = __importDefault(require("@fastify/formbody"));
const wavebreaker_config_json_1 = __importDefault(require("./wavebreaker_config.json"));
const accounts_1 = __importDefault(require("./routes/as1/accounts"));
const fs_1 = __importDefault(require("fs"));
const fastify = (0, fastify_1.default)({
    logger: true,
    https: {
        key: fs_1.default.readFileSync(wavebreaker_config_json_1.default.https.key),
        cert: fs_1.default.readFileSync(wavebreaker_config_json_1.default.https.cert),
        passphrase: wavebreaker_config_json_1.default.https.passphrase
    },
});
fastify.listen({ port: wavebreaker_config_json_1.default.port }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});
fastify.register(formbody_1.default); //So we can parse requests that use application/x-www-form-urlencoded
fastify.register(accounts_1.default);
