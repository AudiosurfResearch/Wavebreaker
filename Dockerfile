FROM node:21-alpine

WORKDIR /usr/src/wavebreaker

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY prisma ./prisma/

RUN yarn install


# Generate Prisma client for DB stuff
RUN npx prisma generate

# Bundle app source
COPY . .

# RUN npm run build

EXPOSE 5000
CMD [ "npm", "start" ]
