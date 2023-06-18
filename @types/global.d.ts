import { User } from "@prisma/client";

/* eslint-disable no-var */
//var is needed to declare a global variable
declare global {
  var __basedir: string;
}

//Give request.user the proper type
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: User;
    user: User;
  }
}

type RadioEntry = {
  wavebreakerId: number;
  title: string;
  artist: string;
  externalUrl: string;
  cgrFileUrl: string;
};

export {RadioEntry};
