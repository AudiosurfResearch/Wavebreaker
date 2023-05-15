import Fastify from "fastify";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import httpsRedirect from "fastify-https-redirect";
import WavebreakerConfig from "./wavebreaker_config.json";
import accountsRouter from "./routes/as1/accounts";
import gameplayRouter from "./routes/as1/gameplay";
import informationRouter from "./routes/as1/information";
import radioRouter from "./routes/as1/radio";
import fs from "fs";
import path from "path";

globalThis.__basedir = __dirname; //Set global variable for the base directory

//weird hack to select logger based on environment
const logger = {
  ...(WavebreakerConfig.environment == "development" && {
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    },
  }),
  ...(WavebreakerConfig.environment != "development" && {
    logger: true,
  }),
};

const fastify = Fastify({
  ...logger,
  //For HTTPS in production, please use nginx or whatever
  ...(WavebreakerConfig.environment == "development" && {
    https: {
      key: fs.readFileSync(WavebreakerConfig.https.key),
      cert: fs.readFileSync(WavebreakerConfig.https.cert),
      passphrase: WavebreakerConfig.https.passphrase,
    },
  }),
});

fastify.listen(
  { port: WavebreakerConfig.port, host: WavebreakerConfig.host },
  (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  }
);

if (WavebreakerConfig.environment == "development")
  fastify.register(httpsRedirect); //HTTPS redirect for development, please use nginx or whatever for this in prod

fastify.register(formbody); //So we can parse requests that use application/x-www-form-urlencoded
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "RadioSongs"),
  prefix: "/as/asradio/",
});

fastify.register(accountsRouter);
fastify.register(gameplayRouter);
fastify.register(informationRouter);
fastify.register(radioRouter);
