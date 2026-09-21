FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY serve.mjs ./serve.mjs

ENV NODE_ENV=production

CMD ["node", "serve.mjs"]
