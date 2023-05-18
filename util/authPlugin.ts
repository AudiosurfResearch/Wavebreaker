import WavebreakerConfig from "../wavebreaker_config.json";
import fastifyJwt from "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import cookie from "@fastify/cookie";

export default fp(async function (fastify) {
  fastify.register(cookie);

  fastify.register(fastifyJwt, {
    secret: WavebreakerConfig.token_secret,
    cookie: {
      cookieName: "Authorization",
      signed: false,
    },
  });

  fastify.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      const cookieHeader = request.raw.headers.cookie;
      if (cookieHeader) {
        request.cookies = fastify.parseCookie(cookieHeader);
      }

      try {
        await request.jwtVerify();
      } catch (err) {
        fastify.log.error(err);
        reply.send(err);
      }
    }
  );
});
