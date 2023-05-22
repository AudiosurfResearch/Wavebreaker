//Fastify and plugins
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import httpsRedirect from "fastify-https-redirect";
import authPlugin from "./util/authPlugin";

//Game routes
import accountsRouter from "./routes/as1/accounts";
import gameplayRouter from "./routes/as1/gameplay";
import informationRouter from "./routes/as1/information";
import radioRouter from "./routes/as1/radio";

//API routes
import apiAuthRouter from "./routes/api/auth";
import apiUsersRouter from "./routes/api/users";

//Miscellaneous
import fs from "fs";
import path from "path";
import WavebreakerConfig from "./config/wavebreaker_config.json";
import { Prisma } from "@prisma/client";

globalThis.__basedir = __dirname; //Set global variable for the base directory

//weird hack to select logger based on environment
const logger = {
  ...(process.env.NODE_ENV == "development" && {
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
  ...(process.env.NODE_ENV != "development" && {
    logger: true,
  }),
};

const fastify = Fastify({
  ...logger,
  //For HTTPS in production, please use nginx or whatever
  ...(process.env.NODE_ENV == "development" &&
    WavebreakerConfig.useHttps && {
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

if (
  process.env.NODE_ENV == "development" &&
  WavebreakerConfig.useHttps
)
  fastify.register(httpsRedirect); //HTTPS redirect for development, PLEASE use nginx or whatever for this in prod, I *beg* you.

fastify.register(authPlugin); //Register authentication plugin
fastify.register(formbody); //So we can parse requests that use application/x-www-form-urlencoded
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "RadioSongs"),
  prefix: "/as/asradio/",
});

fastify.setErrorHandler(function (error, request, reply) {
  // Log error
  this.log.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    // Prisma: not found
    reply.status(404).send({ error: error.message });
  }
  reply.status(500).send({ error: error.message });
});

//Register game endpoints
fastify.register(accountsRouter);
fastify.register(gameplayRouter);
fastify.register(informationRouter);
fastify.register(radioRouter);

//Wavebreaker API
fastify.register(apiAuthRouter);
fastify.register(apiUsersRouter);
