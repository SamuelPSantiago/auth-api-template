FROM node:18

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN npm run build

RUN test -f dist/index.js

EXPOSE 3000

CMD ["npm", "run", "start"]