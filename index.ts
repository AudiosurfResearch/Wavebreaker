import Fastify from "fastify";
import formbody from "@fastify/formbody";
import httpsRedirect from "fastify-https-redirect";
import WavebreakerConfig from "./wavebreaker_config.json";
import accountsRouter from "./routes/as1/accounts";
import gameplayRouter from "./routes/as1/gameplay";
import informationRouter from "./routes/as1/information";
import radioRouter from "./routes/as1/radio";
import fs from "fs";

const fastify = Fastify({
  logger: WavebreakerConfig.logger,
  https: {
    key: fs.readFileSync(WavebreakerConfig.https.key),
    cert: fs.readFileSync(WavebreakerConfig.https.cert),
    passphrase: WavebreakerConfig.https.passphrase,
  },
});

fastify.listen({ port: WavebreakerConfig.port }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});

fastify.register(httpsRedirect);
fastify.register(formbody); //So we can parse requests that use application/x-www-form-urlencoded

fastify.register(accountsRouter);
fastify.register(gameplayRouter);
fastify.register(informationRouter);
fastify.register(radioRouter);
