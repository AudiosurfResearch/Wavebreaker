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

export {};
