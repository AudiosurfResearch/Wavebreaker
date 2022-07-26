import Fastify from "fastify";
import formbody from "@fastify/formbody";
import WavebreakerConfig from "./wavebreaker_config.json";
import accountsRouter from "./routes/as1/accounts";
import path from "path";
import fs from "fs";

const fastify = Fastify({
  logger: true,
  https: {
    key: fs.readFileSync(WavebreakerConfig.https.key),
    cert: fs.readFileSync(WavebreakerConfig.https.cert),
    passphrase: WavebreakerConfig.https.passphrase,
  },
});

fastify.listen({ port: WavebreakerConfig.port }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

fastify.register(formbody); //So we can parse requests that use application/x-www-form-urlencoded

fastify.register(accountsRouter);
