FROM node:alpine

WORKDIR /usr/src/wavebreaker

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY prisma ./prisma/

RUN yarn install
# If you are building your code for production
# RUN npm ci --omit=dev
RUN npm build

# Generate Prisma client for DB stuff
RUN npx prisma generate

# Bundle app source
COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]